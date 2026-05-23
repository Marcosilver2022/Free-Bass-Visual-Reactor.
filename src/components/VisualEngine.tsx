import React, { useRef, useEffect, useState } from 'react';
import { Camera, Film, PlayCircle, Minimize, Sparkles } from 'lucide-react';
import { VisualPreset, AspectRatio, TrackFeatureLevels, SubtitleItem, TextOverlayItem, AutomationLanes } from '../types';

interface VisualEngineProps {
  preset: VisualPreset;
  aspectRatio: AspectRatio;
  features: TrackFeatureLevels;
  currentTime: number;
  subtitles: SubtitleItem[];
  overlays: TextOverlayItem[];
  automation: AutomationLanes;
  customImageUri: string | null;
  customVideoUri: string | null;
  watermarkText: string;
  showWatermark: boolean;
  onRecordStatusChange?: (status: 'idle' | 'recording' | 'finished', fileUrl?: string) => void;
}

export default function VisualEngine({
  preset,
  aspectRatio,
  features,
  currentTime,
  subtitles,
  overlays,
  automation,
  customImageUri,
  customVideoUri,
  watermarkText,
  showWatermark,
  onRecordStatusChange
}: VisualEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Real animation states and references
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number; angle?: number; speed?: number }>>([]);
  const rotationRef = useRef<number>(0);
  const orbitalCameraRef = useRef<{ angle: number; radius: number }>({ angle: 0, radius: 200 });
  const glitchResetTimer = useRef<number>(0);
  const customBgImageObj = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Expose export state indicators
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'finished'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Load Background Image whenever Custom Element changes
  useEffect(() => {
    if (customImageUri) {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.src = customImageUri;
      img.onload = () => {
        customBgImageObj.current = img;
      };
    } else {
      customBgImageObj.current = null;
    }
  }, [customImageUri]);

  // Load Background Video whenever Custom Element changes
  useEffect(() => {
    if (customVideoUri) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.src = customVideoUri;
      video.setAttribute('crossOrigin', 'anonymous');
      
      const handleTimeUpdate = () => {
        if (video.currentTime >= 10) {
          video.currentTime = 0;
        }
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      
      video.play().catch(err => {
        console.log("Auto-play deferred", err);
      });
      
      videoRef.current = video;
      
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.pause();
        videoRef.current = null;
      };
    } else {
      videoRef.current = null;
    }
  }, [customVideoUri]);

  // Handle Canvas Rendering Cycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    // Trigger Particle Array Seeding on first load or changes
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: 80 }, () => createParticle(canvas.width, canvas.height));
    }

    const render = () => {
      // Calculate active dimensions based on selected Aspect Ratio
      const rect = containerRef.current?.getBoundingClientRect();
      const parentWidth = rect?.width || 640;
      const parentHeight = rect?.height || 360;

      let targetWidth = parentWidth;
      let targetHeight = parentHeight;

      if (aspectRatio === '9:16') {
        targetHeight = parentHeight;
        targetWidth = parentHeight * (9 / 16);
        if (targetWidth > parentWidth) {
          targetWidth = parentWidth;
          targetHeight = parentWidth * (16 / 9);
        }
      } else if (aspectRatio === '1:1') {
        targetWidth = Math.min(parentWidth, parentHeight);
        targetHeight = targetWidth;
      } else {
        // 16:9
        targetWidth = parentWidth;
        targetHeight = parentWidth * (9 / 16);
        if (targetHeight > parentHeight) {
          targetHeight = parentHeight;
          targetWidth = parentHeight * (16 / 9);
        }
      }

      // Sync Canvas pixels
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        particlesRef.current = Array.from({ length: 80 }, () => createParticle(canvas.width, canvas.height));
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Extract real timing reaction modifiers
      const bassBoost = features.bass * (automation.bassSensitivity ?? 1);
      const zoomPulse = 1 + (features.kickPeak ? 0.04 * (automation.glowIntensity || 1) : 0);
      const shakeX = features.kickPeak ? (Math.random() - 0.5) * 8 * (automation.chromaticAberration || 1) : 0;
      const shakeY = features.kickPeak ? (Math.random() - 0.5) * 8 * (automation.chromaticAberration || 1) : 0;

      ctx.save();
      // Translate for vibration camera shake
      ctx.translate(cx + shakeX, cy + shakeY);
      ctx.scale(zoomPulse, zoomPulse);
      ctx.translate(-cx, -cy);

      // Base Canvas Fill
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Optional Render Background Video or Image
      if (videoRef.current && videoRef.current.readyState >= 2) {
        ctx.save();
        ctx.globalAlpha = 0.35 + features.rms * 0.15;
        if (preset === 'ai_dreamscape') {
          const waveAmp = 12 * features.mid;
          const waveFreq = 0.025;
          for (let y = 0; y < canvas.height; y += 4) {
            const xShift = Math.sin(y * waveFreq + currentTime * 4) * waveAmp;
            ctx.drawImage(
              videoRef.current,
              0, (y / canvas.height) * videoRef.current.videoHeight,
              videoRef.current.videoWidth, (4 / canvas.height) * videoRef.current.videoHeight,
              xShift, y,
              canvas.width, 4
            );
          }
        } else {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
      } else if (customBgImageObj.current) {
        ctx.save();
        ctx.globalAlpha = 0.35 + features.rms * 0.15;
        // Liquid waviness distortion on dreamscape image preset
        if (preset === 'ai_dreamscape') {
          const waveAmp = 10 * features.mid;
          const waveFreq = 0.02;
          for (let y = 0; y < canvas.height; y += 4) {
            const xShift = Math.sin(y * waveFreq + currentTime * 4) * waveAmp;
            ctx.drawImage(
              customBgImageObj.current,
              0, (y / canvas.height) * customBgImageObj.current.height,
              customBgImageObj.current.width, (4 / canvas.height) * customBgImageObj.current.height,
              xShift, y,
              canvas.width, 4
            );
          }
        } else {
          ctx.drawImage(customBgImageObj.current, 0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
      }

      // Mode-specific render behaviors
      rotationRef.current += 0.005 + (features.rms * 0.015);
      orbitalCameraRef.current.angle += 0.003;

      switch (preset) {
        case 'cyberpunk':
          renderCyberpunk(ctx, canvas, cx, cy, bassBoost);
          break;
        case 'liquid_dnb':
          renderLiquidDnb(ctx, canvas, cx, cy, bassBoost);
          break;
        case 'psychedelic':
          renderPsychedelic(ctx, canvas, cx, cy, bassBoost);
          break;
        case 'dark_garage':
          renderDarkGarage(ctx, canvas, cx, cy, bassBoost);
          break;
        case 'scifi':
          renderScifi(ctx, canvas, cx, cy, bassBoost);
          break;
        case 'vhs':
          renderVHSGlitch(ctx, canvas, cx, cy, bassBoost);
          break;
        case 'sacred_geometry':
          renderSacredGeometry(ctx, canvas, cx, cy, bassBoost);
          break;
        case 'cosmic_frequencies':
          renderCosmicFrequencies(ctx, canvas, cx, cy, bassBoost);
          break;
        case 'ai_dreamscape':
        default:
          renderAIDreamscape(ctx, canvas, cx, cy, bassBoost);
          break;
      }

      // Global particle stream handler
      updateAndDrawParticles(ctx, canvas, bassBoost);

      // Restore camera state before drawing overlays
      ctx.restore();

      // Overlays and watermark which stay straight and static
      drawTimelineOverlays(ctx, canvas);
      drawWatermark(ctx, canvas);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [preset, aspectRatio, features, currentTime, subtitles, overlays, automation, customImageUri, customVideoUri, watermarkText, showWatermark]);

  // Particle generators helper
  const createParticle = (width: number, height: number, customProps = {}) => {
    const isSpecialColor = Math.random() > 0.6;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.6) * 1.5,
      color: isSpecialColor ? '#FF4E00' : '#888888',
      size: Math.random() * 3.5 + 1.2,
      alpha: Math.random() * 0.5 + 0.3,
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 2 + 0.5,
      ...customProps
    };
  };

  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, bassBoost: number) => {
    const pSpeedScale = automation.particleSpeed || 1.0;
    particlesRef.current.forEach(p => {
      // Accelerate velocity with bass energy
      const flowSpeed = p.speed! * (1 + bassBoost * 1.5) * pSpeedScale;
      p.x += p.vx * flowSpeed;
      p.y += p.vy * flowSpeed;

      // Wrap boundaries
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Draw particle glowing orb
      ctx.save();
      ctx.beginPath();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.size * (1 + features.high * 0.5), 0, Math.PI * 2);
      ctx.fill();

      // High frequency reactive halos
      if (features.hatPeak && Math.random() > 0.85) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 0.5;
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  };

  // --------------------------------------------------------------------------
  // Preset Visual Themes: Elegant canvas rendering with raw shapes
  // --------------------------------------------------------------------------

  // Preset 1: Cyberpunk Neon Bars and Cyber grid lines
  const renderCyberpunk = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, bassBoost: number) => {
    // Cyber grid lines perspective bender
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, canvas.height);
      ctx.lineTo(cx + (x - cx) * 0.2, cy + 20);
      ctx.stroke();
    }

    // Centered audio neon cylinder
    const bands = 36;
    const radius = 60 + bassBoost * 30;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRef.current * 0.4);

    for (let i = 0; i < bands; i++) {
      const angle = (i / bands) * Math.PI * 2;
      const factor = (i % 2 === 0) ? features.bass : features.mid;
      const height = 15 + factor * 60;

      ctx.save();
      ctx.rotate(angle);
      // Neon pink to turquoise gradients
      const grad = ctx.createLinearGradient(0, -radius, 0, -radius - height);
      grad.addColorStop(0, '#ec4899');
      grad.addColorStop(0.5, '#8b5cf6');
      grad.addColorStop(1, '#06b6d4');

      ctx.fillStyle = grad;
      ctx.fillRect(-2, -radius, 4, -height);
      
      // Cyber dot terminals
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1.5, -radius - height - 3, 3, 3);
      ctx.restore();
    }
    ctx.restore();
  };

  // Preset 2: Smooth Liquid DnB trails
  const renderLiquidDnb = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, bassBoost: number) => {
    ctx.save();
    ctx.translate(cx, cy);

    // Render continuous overlapping slow orbit ribbons
    const ribbonCount = 3;
    for (let j = 0; j < ribbonCount; j++) {
      const offsetAngle = (j * Math.PI * 2) / ribbonCount;
      const progress = rotationRef.current * 0.6 + offsetAngle;
      
      ctx.beginPath();
      ctx.strokeStyle = j === 0 ? '#3b82f6' : j === 1 ? '#a855f7' : '#22d3ee';
      ctx.lineWidth = 2 + features.rms * 3;
      ctx.globalAlpha = 0.45;

      const baseRadius = 80 + j * 22;
      
      for (let theta = 0; theta <= Math.PI * 2; theta += 0.1) {
        const shapeMod = Math.sin(theta * 5 + currentTime * 3) * (15 * (1 + features.mid));
        const finalR = baseRadius + shapeMod + (features.bass * 20);
        const x = Math.cos(theta + progress) * finalR;
        const y = Math.sin(theta + progress) * finalR;

        if (theta === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Glowing core fluid orb
    const coreRad = 35 + bassBoost * 15;
    const coreGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, coreRad);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.3, 'rgba(6, 182, 212, 0.8)');
    coreGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreRad, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Preset 3: Rotating Kaleidoscope Psychedelic Patterns
  const renderPsychedelic = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, bassBoost: number) => {
    const segments = 12;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRef.current * 0.5);

    for (let k = 0; k < segments; k++) {
      ctx.rotate((Math.PI * 2) / segments);

      ctx.beginPath();
      // Psychedelic neon glow lines
      const hue = (parseInt(currentTime.toFixed(1)) * 30 + k * 15) % 360;
      ctx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.65)`;
      ctx.lineWidth = 1.5 + features.rms * 2.5;

      const startLen = 20 + features.high * 30;
      const endLen = 130 + bassBoost * 60;

      ctx.moveTo(0, startLen);
      ctx.bezierCurveTo(30 * features.mid, 60, -40 * features.bass, 90, 0, endLen);
      ctx.stroke();

      // Flower pattern dot terminals
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, endLen, 4 + features.high * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Preset 4: Dark Garage Minimalist Industrial lines
  const renderDarkGarage = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, bassBoost: number) => {
    // Dark steel overlay vibes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    // Crosshair sniper style background lines
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height);
    ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy);
    ctx.stroke();

    // Centered wire box scale and distortion
    const size = 110 + bassBoost * 45;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-rotationRef.current * 0.2);

    ctx.strokeStyle = '#f4f4f5';
    ctx.lineWidth = features.snarePeak ? 3 : 1;
    ctx.globalAlpha = 0.5 + features.mid * 0.4;
    ctx.strokeRect(-size / 2, -size / 2, size, size);

    // Nested echo boxes
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-size * 0.7 / 2, -size * 0.7 / 2, size * 0.7, size * 0.7);
    ctx.strokeRect(-size * 1.3 / 2, -size * 1.3 / 2, size * 1.3, size * 1.3);

    ctx.restore();
  };

  // Preset 5: Starry Solar Sci-Fi Ring Target HUD
  const renderScifi = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, bassBoost: number) => {
    ctx.save();
    ctx.translate(cx, cy);

    // Tech targeting circles HUD
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 100 + features.mid * 40, 0, Math.PI * 2);
    ctx.stroke();

    // Pulsing core sphere with concentric cyber dashes
    ctx.setLineDash([5, 12]);
    ctx.strokeStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(0, 0, 75 + bassBoost * 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Orbiting target marker satellite
    const orbitAngle = rotationRef.current * 0.8;
    const rDist = 100 + features.mid * 40;
    const satX = Math.cos(orbitAngle) * rDist;
    const satY = Math.sin(orbitAngle) * rDist;

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(satX, satY, 5 + features.high * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Preset 6: Retro VHS Glitch Tracking and degradation
  const renderVHSGlitch = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, bassBoost: number) => {
    // RGB Chromatic Aberration imitation in canvas shapes
    const shift = (features.kickPeak ? 7 : 2) * (automation.chromaticAberration || 1);
    
    ctx.save();
    // Red channel offsets
    ctx.shadowColor = '#ef4444';
    ctx.shadowOffsetX = shift;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = shift * 2;

    // Center synth-wave triangular wireframes
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRef.current * 0.1);
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const peakSize = 85 + bassBoost * 45;
    ctx.moveTo(0, -peakSize);
    ctx.lineTo(peakSize, peakSize * 0.8);
    ctx.lineTo(-peakSize, peakSize * 0.8);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // Draw scanning VHS tracing lines blockages
    ctx.fillStyle = 'rgba(236, 72, 153, 0.04)';
    const spacing = 10;
    for (let i = 0; i < canvas.height; i += spacing) {
      if (Math.sin(i * 0.05 + currentTime * 5) > 0.8) {
        ctx.fillRect(0, i, canvas.width, 2);
      }
    }

    // VHS static noise overlay
    if (Math.random() > 0.95) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, canvas.width, 3);
    }
  };

  // Preset 7: Sacred Geometry multi polygon orbiters
  const renderSacredGeometry = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, bassBoost: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRef.current * 0.3);

    const drawPolygon = (sides: number, radius: number, strokeStyle: string, lineWidth: number) => {
      ctx.beginPath();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    // Outer octagon - Bass driven
    drawPolygon(8, 120 + bassBoost * 40, '#a78bfa', 1);
    
    // Middle hexagon - Midrange driven
    ctx.rotate(-rotationRef.current * 0.5);
    drawPolygon(6, 80 + features.mid * 20, '#0284c7', 1.5);

    // Inner triangle - High drive
    ctx.rotate(rotationRef.current * 0.8);
    drawPolygon(3, 40 + features.high * 15, '#f43f5e', 2);

    ctx.restore();
  };

  // Preset 8: Deep Space Cosmic Frequencies / Nebula orbits
  const renderCosmicFrequencies = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, bassBoost: number) => {
    ctx.save();
    ctx.translate(cx, cy);

    // Star stream bursts radiating outwards
    const count = 40;
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rotationRef.current * 0.1;
      const startDist = 30 + features.mid * 20;
      const streamLen = 15 + features.bass * 60;
      const sx = Math.cos(angle) * startDist;
      const sy = Math.sin(angle) * startDist;
      const ex = Math.cos(angle) * (startDist + streamLen);
      const ey = Math.sin(angle) * (startDist + streamLen);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // Stellar central flare
    const flareR = 25 + features.rms * 25;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(238, 187, 26, 0.1)';
    ctx.arc(0, 0, flareR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(0, 0, flareR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Preset 9: AI Driven template overlay effects
  const renderAIDreamscape = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, bassBoost: number) => {
    // Generate organic cosmic bubble layers floating reactively across the stream
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRef.current * 0.2);

    for (let i = 0; i < 4; i++) {
      const radius = 50 + (i * 30) + (features.bass * 20);
      ctx.beginPath();
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(6,182,212,0.3)' : 'rgba(139,92,246,0.3)';
      ctx.lineWidth = 0.5 + features.rms * 1.5;
      ctx.ellipse(0, 0, radius, radius * 0.6, Math.PI * i / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  // --------------------------------------------------------------------------
  // Timeline Layers, Overlays and Text Subtitles
  // --------------------------------------------------------------------------
  const drawTimelineOverlays = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // 1. Text overlays
    overlays.forEach(item => {
      if (currentTime >= item.timeStart && currentTime <= item.timeEnd) {
        ctx.save();
        const px = (item.positionX / 100) * canvas.width;
        const py = (item.positionY / 100) * canvas.height;

        ctx.font = `${item.fontSize}px ${item.fontFamily || 'monospace'}`;
        ctx.fillStyle = item.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glowing backdrop effect for cinematic readable elegance
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 8;

        ctx.fillText(item.text, px, py);
        ctx.restore();
      }
    });

    // 2. Audio-reactive subtitle items
    const activeSubtitle = subtitles.find(s => currentTime >= s.time && currentTime < (s.time + s.duration));
    if (activeSubtitle) {
      ctx.save();
      const px = canvas.width / 2;
      const py = canvas.height - 45; // lower aligned anchor

      ctx.font = `600 ${activeSubtitle.fontSize || 14}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Semitransparent neat background shroud for subtitles
      const textMetrics = ctx.measureText(activeSubtitle.text);
      const bgW = textMetrics.width + 24;
      const bgH = (activeSubtitle.fontSize || 14) + 16;
      ctx.fillStyle = 'rgba(2, 2, 4, 0.75)';
      ctx.fillRect(px - bgW / 2, py - bgH / 2, bgW, bgH);

      // Reactive text color pulsation
      ctx.fillStyle = activeSubtitle.color || '#a78bfa';
      ctx.shadowColor = activeSubtitle.color;
      ctx.shadowBlur = features.kickPeak ? 12 : 3;

      ctx.fillText(activeSubtitle.text, px, py);
      ctx.restore();
    }
  };

  const drawWatermark = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!showWatermark) return;
    ctx.save();
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'right';
    ctx.fillText(`${watermarkText || "FREE BASS REACTOR"}`, canvas.width - 15, 22);
    ctx.restore();
  };

  // --------------------------------------------------------------------------
  // WebM Real-Time Recording Mechanism
  // --------------------------------------------------------------------------
  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    recordedChunksRef.current = [];
    
    // Capture canvas frame stream at 30fps
    const stream = canvas.captureStream(30);
    
    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8' };
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        setRecordingStatus('finished');
        if (onRecordStatusChange) {
          onRecordStatusChange('finished', url);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecordingStatus('recording');
      
      if (onRecordStatusChange) {
        onRecordStatusChange('recording');
      }

    } catch (e) {
      console.error("Failed to boot web recorder:", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div id="reactor-visualizer" ref={containerRef} className="w-full aspect-video bg-[#050505] rounded-lg border border-[#222] shadow-[0_4px_30px_rgba(0,0,0,0.8)] overflow-hidden relative flex items-center justify-center">
        {/* Core Canvas layer */}
        <canvas id="canvas-scene" ref={canvasRef} className="max-w-full shadow-inner block bg-black" />

        {/* Floating cinematic overlay labels */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#0A0A0A]/85 backdrop-blur border border-[#222] px-3 py-1 text-[9px] font-mono tracking-widest text-[#888]">
          <Camera className="w-3.5 h-3.5 text-[#FF4E00] animate-pulse" />
          ACTIVE VIEWER: <span className="text-white font-bold">{aspectRatio}</span>
        </div>

        {recordingStatus === 'recording' && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black border border-[#FF4E00] px-3 py-1.5 rounded-sm text-[9px] font-bold tracking-widest text-[#FF4E00] animate-pulse">
            <Film className="w-3.5 h-3.5 text-[#FF4E00]" />
            RECORDING STREAM LIVE
          </div>
        )}
      </div>

      {/* Exporter triggers panel */}
      <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#222] flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h4 className="text-[11px] font-bold tracking-widest text-white flex items-center gap-1.5 uppercase">
            <Sparkles className="w-4 h-4 text-[#FF4E00]" /> INSTANT SOCIAL MEDIA EXPORTER
          </h4>
          <p className="text-[9px] text-[#555] font-mono mt-0.5">Capture real-time visuals into optimized 30-second clips instantly</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {recordingStatus !== 'recording' ? (
            <button
              id="export-queue-start"
              onClick={startRecording}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-[#FF4E00] hover:bg-white text-black text-xs font-bold tracking-widest rounded-sm transition-colors uppercase"
            >
              <PlayCircle className="w-4 h-4" />
              START EXPORT CONVERT
            </button>
          ) : (
            <button
              id="export-queue-stop"
              onClick={stopRecording}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold tracking-widest rounded-sm transition-colors uppercase animate-pulse"
            >
              <Minimize className="w-4 h-4" />
              END EXPORT & BUILD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
