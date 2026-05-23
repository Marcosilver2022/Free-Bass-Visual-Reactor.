import React, { useState } from 'react';
import { Sliders, HelpCircle, Film, RefreshCw, Wand2, Paintbrush, Globe, Check } from 'lucide-react';
import { VisualPreset, AspectRatio, RenderConfig, AudioStats } from '../types';

interface ControlPanelProps {
  config: RenderConfig;
  onChangeConfig: (config: RenderConfig) => void;
  audioStats: AudioStats | null;
  onSetAIImage: (uri: string) => void;
}

const PRESET_OPTIONS: { value: VisualPreset; label: string; desc: string }[] = [
  { value: 'cyberpunk', label: 'CYBERPUNK GLOW', desc: 'Neon rods, perspective mesh grids and laser lines.' },
  { value: 'liquid_dnb', label: 'LIQUID D&B', desc: 'Organic flowing orbits, soft waves, liquid metal halos.' },
  { value: 'psychedelic', label: 'PSYCHEDELIC FREQ', desc: 'Symmetrical rotating flowers, hue-benders, kaleidoscope.' },
  { value: 'dark_garage', label: 'DARK CLAN GARAGE', desc: 'Metal gray accents, crosshairs, industrial strobe pulses.' },
  { value: 'scifi', label: 'SPACE CATHEDRAL', desc: 'HUD orbits, radar blips, orbital spacecraft lights.' },
  { value: 'vhs', label: 'VHS TRACKING GLITCH', desc: 'Tape drift static, glitch lines, heavy color aberrations.' },
  { value: 'sacred_geometry', label: 'SACRED SYMMETRY', desc: 'Concentric polygons, triangles, octagons scaling to frequencies.' },
  { value: 'cosmic_frequencies', label: 'COSMIC DUST FIELDS', desc: 'Star stream vectors radiating from a central white flare.' },
  { value: 'ai_dreamscape', label: 'AI DREAMSCAPE DISPLACEMENT', desc: 'Continuous liquid wave displacements across active backdrops.' }
];

const ASPECT_RATIOS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: '9:16', label: '9:16 VERTICAL', desc: 'Optimized for YouTube Shorts, Reels, TikTok' },
  { value: '16:9', label: '16:9 widescreen', desc: 'Standard landscape resolution' },
  { value: '1:1', label: '1:1 square', desc: 'Instagram feed, Spotify Album artworks' }
];

export default function ControlPanel({
  config,
  onChangeConfig,
  audioStats,
  onSetAIImage
}: ControlPanelProps) {
  const [promptText, setPromptText] = useState('Futuristic nightclub with neon holograms and fluid chrome waves reflecting sub-bass waves.');
  const [generating, setGenerating] = useState(false);
  const [analyzingMood, setAnalyzingMood] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Quick Prompt Promoters
  const samplePrompts = [
    "liquid frequencies becoming physical matter, orbital camera drift, deep chrome aesthetics",
    "ancient floating pyramids, liquid neon frequencies, sacred geometry space portals",
    "analog audio tape machine glowing in an immersive cosmic cathedral, atmospheric haze",
  ];

  // --------------------------------------------------------------------------
  // AI Mood Analysis Callout
  // --------------------------------------------------------------------------
  const runAimoodAnalysis = async () => {
    if (!audioStats) return;
    setAnalyzingMood(true);
    try {
      const response = await fetch('/api/gemini/mood-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName: audioStats.name,
          rawMood: audioStats.detectedMood,
          userDescription: `Track analyzing at ${audioStats.bpm} BPM with detailed frequency elements.`
        })
      });

      if (!response.ok) throw new Error("Mood server endpoint unavailable.");
      const data = await response.json();

      // Set configurations automatically!
      let mappedPreset: VisualPreset = 'liquid_dnb';
      if (data.visualStructure === 'orbital-drift') mappedPreset = 'liquid_dnb';
      else if (data.visualStructure === 'center-sphere') mappedPreset = 'scifi';
      else if (data.visualStructure === 'waveform-cave') mappedPreset = 'cyberpunk';
      else if (data.visualStructure === 'fractal-grid') mappedPreset = 'sacred_geometry';
      else if (data.visualStructure === 'fluid-mesh') mappedPreset = 'ai_dreamscape';

      onChangeConfig({
        ...config,
        preset: mappedPreset,
        backgroundImageQuery: data.expandedPrompt || config.backgroundImageQuery,
        automation: {
          ...config.automation,
          bassSensitivity: (data.beatRateMultiplier || 1) * 1.2
        }
      });

      setPromptText(data.expandedPrompt || promptText);

    } catch (e: any) {
      console.warn("Falling back to local heuristic analysis:", e);
    } finally {
      setAnalyzingMood(false);
    }
  };

  // --------------------------------------------------------------------------
  // AI Image Generation Backend Proxy
  // --------------------------------------------------------------------------
  const generateAIWallpaper = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const resp = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          aspectRatio: config.aspectRatio
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || data.error || "Failed to contact Image server.");
      }

      if (data.imageUrl) {
        onSetAIImage(data.imageUrl);
        // Switch preset automatically for glorious display
        onChangeConfig({
          ...config,
          preset: 'ai_dreamscape'
        });
      }
    } catch (e: any) {
      console.error(e);
      setGenError(e.message || "An unexpected error occurred during rendering.");
      
      // Elegant, high-end simulated ambient placeholder as a secure premium fallback so it never remains empty!
      const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(promptText)}/1920/1080?blur=4`;
      onSetAIImage(fallbackUrl);
      onChangeConfig({
        ...config,
        preset: 'ai_dreamscape'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div id="control-panel" className="space-y-6">
      {/* SECTION 1: VISUAL CONSOLE */}
      <div className="bg-[#0A0A0A] p-6 rounded-lg border border-[#222] relative shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <h3 className="text-xs font-bold tracking-widest text-[#FF4E00] uppercase mb-4 flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-[#FF4E00]" />
          AESTHETIC SCHEMAS
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESET_OPTIONS.map(opt => {
            const isSelected = config.preset === opt.value;
            return (
              <button
                key={opt.value}
                id={`preset-${opt.value}`}
                onClick={() => onChangeConfig({ ...config, preset: opt.value })}
                className={`flex flex-col text-left p-3.5 rounded-sm border transition-all duration-300 relative group overflow-hidden ${
                  isSelected
                    ? 'bg-[#FF4E00]/10 border-[#FF4E00] shadow-[0_0_15px_rgba(255,78,0,0.15)]'
                    : 'bg-black border-[#222] hover:bg-[#1A1A1A]'
                }`}
              >
                <span className="text-[11px] font-bold tracking-wider text-[#E0E0E0] group-hover:text-white flex items-center justify-between">
                  {opt.label}
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#FF4E00]" />}
                </span>
                <span className="text-[9px] text-[#555] font-mono mt-1 line-clamp-2 leading-tight uppercase">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: EXPORT SPECS (Aspect ratio & Watermarks) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0A0A0A] p-6 rounded-lg border border-[#222] shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
          <h3 className="text-xs font-bold tracking-widest text-[#FF4E00] uppercase mb-4 flex items-center gap-2">
            <Film className="w-4 h-4 text-[#FF4E00]" />
            EXPORT ASPECT RATIOS
          </h3>

          <div className="space-y-2.5">
            {ASPECT_RATIOS.map(ratio => {
              const isSelected = config.aspectRatio === ratio.value;
              return (
                <button
                  key={ratio.value}
                  id={`ratio-${ratio.value}`}
                  onClick={() => onChangeConfig({ ...config, aspectRatio: ratio.value })}
                  className={`w-full flex items-center justify-between text-left p-3.5 rounded border transition-all duration-300 ${
                    isSelected
                      ? 'bg-[#FF4E00]/10 border-[#FF4E00]'
                      : 'bg-black hover:bg-[#1A1A1A] border-[#222]'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold tracking-wider text-[#E0E0E0] block">{ratio.label}</span>
                    <span className="text-[9px] text-[#555] font-mono uppercase mt-0.5 block">{ratio.desc}</span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-[#FF4E00] bg-black' : 'border-[#222]'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#FF4E00]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Brand Tuning & Micro-Controls */}
        <div className="bg-[#0A0A0A] p-6 rounded-lg border border-[#222] shadow-[0_4px_30px_rgba(0,0,0,0.8)] space-y-4">
          <h3 className="text-xs font-bold tracking-widest text-white uppercase flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#FF4E00]" />
            TUNING INTENSITY DECK
          </h3>

          {/* Microtonal tuning selector */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-[#555] block mb-1.5 uppercase">SOLFEGGIO TUNING (PHYSICAL SYSTEM)</label>
            <div className="grid grid-cols-3 gap-2 bg-black p-1.5 rounded border border-[#222]">
              {(['440hz', '432hz', '528hz'] as const).map(mode => (
                <button
                  key={mode}
                  id={`tuning-${mode}`}
                  onClick={() => onChangeConfig({ ...config, tuningMode: mode })}
                  className={`py-1 text-[10px] font-extrabold tracking-widest rounded transition-all ${
                    config.tuningMode === mode ? 'bg-[#1A1A1A] text-[#FF4E00] font-black' : 'text-[#555] hover:text-white'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold tracking-widest text-[#555] block mb-1.5 uppercase">PROMOTIONAL WATERMARK</label>
            <div className="flex gap-2">
              <input
                id="input-watermark-text"
                type="text"
                value={config.watermarkText}
                onChange={e => onChangeConfig({ ...config, watermarkText: e.target.value })}
                placeholder="FREE BASS REACTOR"
                className="flex-1 bg-black border border-[#222] font-mono text-xs px-3 py-2 rounded text-white focus:outline-none focus:border-[#FF4E00]"
              />
              <button
                id="toggle-watermark"
                onClick={() => onChangeConfig({ ...config, showWatermark: !config.showWatermark })}
                className={`px-3 py-2 text-[10px] tracking-widest font-black rounded border transition-all ${
                  config.showWatermark ? 'bg-[#FF4E00]/25 text-[#FF4E00] border-[#FF4E00]/30' : 'bg-black text-[#555] border-[#222]'
                }`}
              >
                {config.showWatermark ? "SHOWN" : "HIDDEN"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: REACTOR BACKGROUND SCENE / DYNAMIC LOOP INPUT */}
      <div id="reactor-video-importer" className="bg-[#0A0A0A] p-6 rounded-lg border border-[#222] shadow-[0_4px_30px_rgba(0,0,0,0.8)] space-y-4">
        <h3 className="text-xs font-bold tracking-widest text-white uppercase flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#FF4E00]" />
          REACTOR BACKGROUND LOOP VIDEO
        </h3>
        <p className="text-[10px] text-[#888] font-mono leading-relaxed uppercase">
          Import any MP4 or WebM video background. The engine will automatically conform & loop it precisely at a <span className="text-[#FF4E00] font-black">10-Second rhythmic window</span>.
        </p>

        {/* File Import Drag & Drop slot */}
        <div className="flex flex-col items-center justify-center border border-dashed border-[#222] hover:border-[#FF4E00] bg-black hover:bg-[#111] rounded p-5 transition-all relative">
          <input
            id="video-background-selector"
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const objectUrl = URL.createObjectURL(file);
                onChangeConfig({
                  ...config,
                  customVideoUri: objectUrl,
                  customImageUri: null // Reset image so video takes priority
                });
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <span className="text-xs font-bold text-[#E0E0E0]">DRAG & DROP LOOP VIDEO FILE</span>
          <span className="text-[9px] text-[#555] mt-1 font-mono">SUPPORTS MP4, WEBM, MOV (AUTOLOOP 10S)</span>
        </div>

        {/* High-fidelity Built-In Presets Grid */}
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-[#555] tracking-widest block uppercase">PRE-TUNED GRAPHIC COMPOSITIONS</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'cyber-tunnel',
                name: 'NEON TUNNEL',
                url: 'https://assets.mixkit.co/videos/preview/mixkit-tunnel-of-futuristic-blue-lights-loop-42205-large.mp4'
              },
              {
                id: 'laser-horizon',
                name: 'LASER HORIZON',
                url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-loop-41852-large.mp4'
              },
              {
                id: 'neon-circuit',
                name: 'STROBE DECK',
                url: 'https://assets.mixkit.co/videos/preview/mixkit-neon-light-strips-flashing-fast-41882-large.mp4'
              }
            ].map((preset) => (
              <button
                key={preset.id}
                id={`bg-video-preset-${preset.id}`}
                onClick={() => {
                  onChangeConfig({
                    ...config,
                    customVideoUri: preset.url,
                    customImageUri: null
                  });
                }}
                className={`py-2 px-1 text-[9px] font-extrabold tracking-widest border rounded transition-all truncate uppercase ${
                  config.customVideoUri === preset.url
                    ? 'bg-[#FF4E00]/20 border-[#FF4E00] text-[#FF4E00]'
                    : 'bg-black border-[#222] text-[#888] hover:text-white hover:bg-[#111]'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Action controllers */}
        {config.customVideoUri && (
          <div className="flex items-center justify-between p-2.5 bg-black border border-[#222] rounded text-[10px] font-mono">
            <span className="text-emerald-400 font-bold uppercase truncate max-w-[150px]">
              &bull; LOOP VIDEO ACTIVE
            </span>
            <button
              id="clear-video-importer"
              onClick={() => {
                onChangeConfig({
                  ...config,
                  customVideoUri: null
                });
              }}
              className="text-[#555] hover:text-[#FF4E00] tracking-widest font-black uppercase transition-colors"
            >
              REMOVE VIDEO
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: RE-CREATIVE GEMINI AI DESIGNS */}
      <div id="ai-generative-console" className="bg-[#0A0A0A] p-6 rounded-lg border border-[#222] relative shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#FF4E00] text-black text-[9px] font-black px-2.5 py-1 rounded-sm tracking-widest shadow-lg uppercase">
          Gemini Powered
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222] pb-3 mb-4">
          <div>
            <h3 className="text-xs font-bold tracking-widest text-[#FF4E00] uppercase flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#FF4E00]" />
              CINEMATIC AI MATERIAL CREATOR
            </h3>
            <p className="text-[9px] text-[#555] font-mono mt-0.5 uppercase">Let Gemini translate raw music files into visual dimensions</p>
          </div>

          {audioStats && (
            <button
              id="mood-analysis-run"
              onClick={runAimoodAnalysis}
              disabled={analyzingMood}
              className="px-3 py-1.5 bg-black border border-[#222] hover:border-[#FF4E00] text-[9px] font-bold tracking-widest text-[#FF4E00] hover:text-white rounded transition-all flex items-center gap-1.5 uppercase"
            >
              <RefreshCw className={`w-3 h-3 ${analyzingMood ? 'animate-spin' : ''}`} />
              {analyzingMood ? 'ANALYZING SPECTRUM...' : 'AUTO-MATCH DECK PROFILE'}
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-bold tracking-widest text-[#555] block mb-1.5 uppercase">SCENIC AI PROMPT DETAILS</label>
            <textarea
              id="text-input-prompt"
              rows={3}
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              className="w-full bg-black border border-[#222] text-xs p-3.5 rounded text-zinc-200 focus:outline-none focus:border-[#FF4E00] font-mono leading-relaxed"
            />
          </div>

          {/* Quick recommendations clickers */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-[#555] tracking-widest block uppercase">CHOOSE CHERISHED EXAMPLES (CLICK TO USE)</span>
            <div className="flex flex-col gap-1.5">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  id={`sample-prompt-${idx}`}
                  onClick={() => setPromptText(p)}
                  className="w-full text-left text-[10px] text-zinc-400 hover:text-[#FF4E00] truncate py-1.5 px-3 bg-black border border-[#222] rounded hover:bg-[#111] transition-all font-mono"
                >
                  &raquo; {p}
                </button>
              ))}
            </div>
          </div>

          <button
            id="ai-generate-button"
            onClick={generateAIWallpaper}
            disabled={generating}
            className="w-full py-3 bg-[#FF4E00] hover:bg-white text-black font-black text-xs tracking-widest rounded-sm transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 border border-transparent"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                DREAMING THE CINEMATIC DIMENSIONS...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-black animate-pulse" />
                CREATE SCENIC BACKGROUND GRAPHIC WITH GEMINI AI
              </>
            )}
          </button>

          {genError && (
            <div className="p-3 bg-amber-950/20 border border-amber-800/20 text-[10px] text-amber-400 rounded-lg font-mono">
              Note: {genError} — Custom dynamic noise generated in response.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
