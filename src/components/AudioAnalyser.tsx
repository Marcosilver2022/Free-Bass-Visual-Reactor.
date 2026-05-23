import React, { useRef, useState, useEffect } from 'react';
import { Volume2, Mic, Upload, Activity, RefreshCw } from 'lucide-react';
import { AudioStats, TrackFeatureLevels } from '../types';

interface AudioAnalyserProps {
  onAudioAnalyzed: (stats: AudioStats) => void;
  onFrameUpdate: (features: TrackFeatureLevels) => void;
  onProgressUpdate: (currentTime: number) => void;
  trimStart: number;
  trimEnd: number;
  tuningMode: '440hz' | '432hz' | '528hz';
  isLiveMicActive: boolean;
  onLiveMicChange: (active: boolean) => void;
  playState: 'playing' | 'paused' | 'stopped';
  setPlayState: (state: 'playing' | 'paused' | 'stopped') => void;
}

export default function AudioAnalyser({
  onAudioAnalyzed,
  onFrameUpdate,
  onProgressUpdate,
  trimStart,
  trimEnd,
  tuningMode,
  isLiveMicActive,
  onLiveMicChange,
  playState,
  setPlayState
}: AudioAnalyserProps) {
  const [loading, setLoading] = useState(false);
  const [errorLabel, setErrorLabel] = useState<string | null>(null);
  const [stats, setStats] = useState<AudioStats | null>(null);
  
  // Audio state refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const micNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  
  // Loaded audio data
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Frequency bands (adjusted based on standard DnB, Garage & Synth bands)
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Init AudioContext lazily
  const getAudioContext = (): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // --------------------------------------------------------------------------
  // File Upload and Decoding
  // --------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorLabel(null);
    onLiveMicChange(false);
    stopPlayback();

    try {
      const audioCtx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      
      // Decode audio
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      // Estimate BPM & Mood
      const bpm = estimateBPM(audioBuffer);
      const mood = determineMood(audioBuffer, bpm);

      const objectUrl = URL.createObjectURL(file);
      const outputStats: AudioStats = {
        name: file.name,
        duration: audioBuffer.duration,
        bpm: bpm,
        url: objectUrl,
        detectedMood: mood
      };

      setStats(outputStats);
      onAudioAnalyzed(outputStats);
      
      // Setup Analyser
      if (!analyserRef.current) {
        analyserRef.current = audioCtx.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }
      
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

    } catch (err: any) {
      console.error(err);
      setErrorLabel("Unsupported format or decoding failed.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // BPM Extractor Algorithm (Peak-clustering Method)
  // --------------------------------------------------------------------------
  const estimateBPM = (buffer: AudioBuffer): number => {
    // Collect primary channel energy peaks at reduced sample rates
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const interval = Math.floor(sampleRate / 100); // 10ms slices
    const energy: number[] = [];

    // Calculate RMS energy per slice
    for (let i = 0; i < data.length; i += interval) {
      let sum = 0;
      const end = Math.min(i + interval, data.length);
      for (let j = i; j < end; j++) {
        sum += data[j] * data[j];
      }
      energy.push(Math.sqrt(sum / (end - i)));
    }

    // Find local peak transients above threshold
    const threshold = 0.25;
    const peakIndices: number[] = [];
    for (let i = 1; i < energy.length - 1; i++) {
      if (energy[i] > threshold && energy[i] > energy[i - 1] && energy[i] > energy[i + 1]) {
        peakIndices.push(i);
      }
    }

    if (peakIndices.length < 2) return 174; // Classic Liquid DnB tempo standard fallback

    // Calculate peak intervals (offsets in ms)
    const intervals: number[] = [];
    for (let i = 1; i < peakIndices.length; i++) {
      intervals.push((peakIndices[i] - peakIndices[i - 1]) * 10);
    }

    // Find the most frequent intervals to calculate the BPM cluster
    const buckets: { [key: number]: number } = {};
    intervals.forEach(ms => {
      const bpmValue = Math.round(60000 / ms);
      if (bpmValue >= 80 && bpmValue <= 190) {
        const rounded = Math.round(bpmValue / 2) * 2; // bucket every 2 bpm
        buckets[rounded] = (buckets[rounded] || 0) + 1;
      }
    });

    let bestBPM = 174;
    let maxCount = 0;
    Object.entries(buckets).forEach(([bpm, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestBPM = Number(bpm);
      }
    });

    return bestBPM;
  };

  // Detect Mood Based on frequency and tempo profile
  const determineMood = (buffer: AudioBuffer, bpm: number): string => {
    const data = buffer.getChannelData(0);
    let energeticCount = 0;
    // Walk through slice chunks to measure variance
    const step = Math.floor(data.length / 50);
    for (let i = 0; i < data.length; i += step) {
      if (Math.abs(data[i]) > 0.6) energeticCount++;
    }

    if (bpm >= 165) {
      return energeticCount > 15 ? "Aggressive Cyber DnB" : "Euphoric Liquid DnB";
    } else if (bpm >= 125 && bpm < 145) {
      return energeticCount > 12 ? "Dark Garage Minimalist" : "Ambient Electronic Space";
    }
    return "Cinematic Deep Atmospheric";
  };

  // --------------------------------------------------------------------------
  // Live Microphone Input
  // --------------------------------------------------------------------------
  const toggleLiveMic = async () => {
    if (isLiveMicActive) {
      stopMic();
      onLiveMicChange(false);
    } else {
      stopPlayback();
      const audioCtx = getAudioContext();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStreamRef.current = stream;

        if (!analyserRef.current) {
          analyserRef.current = audioCtx.createAnalyser();
          analyserRef.current.fftSize = 256;
        }

        const micNode = audioCtx.createMediaStreamSource(stream);
        micNode.connect(analyserRef.current);
        micNodeRef.current = micNode;
        
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        onLiveMicChange(true);
        setPlayState('playing');
        
        // Trigger generic stats trigger
        const liveStats: AudioStats = {
          name: "Live Audio Reactor Active",
          duration: 3600,
          bpm: 130,
          url: "",
          detectedMood: "Interactive Club Mic"
        };
        setStats(liveStats);
        onAudioAnalyzed(liveStats);
      } catch (err) {
        console.error(err);
        setErrorLabel("Microphone permissions denied or unavailable.");
      }
    }
  };

  const stopMic = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (micNodeRef.current) {
      micNodeRef.current.disconnect();
      micNodeRef.current = null;
    }
  };

  // --------------------------------------------------------------------------
  // Render and Analyze Loops
  // --------------------------------------------------------------------------
  const startPlayback = () => {
    if (!audioBufferRef.current) return;
    const audioCtx = getAudioContext();

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBufferRef.current;
    
    // Wire node
    source.connect(analyserRef.current!);
    analyserRef.current!.connect(audioCtx.destination);
    
    sourceNodeRef.current = source;
    
    // Trim boundary calculations
    const startOffset = Math.max(trimStart, pauseOffsetRef.current);
    const durationLeft = audioBufferRef.current.duration - startOffset;
    
    source.start(0, startOffset);
    startTimeRef.current = audioCtx.currentTime - startOffset;
    setPlayState('playing');

    source.onended = () => {
      // Automatic stop only if reached duration without manual intervention
      const elapsed = audioCtx.currentTime - startTimeRef.current;
      if (elapsed >= (trimEnd || audioBufferRef.current!.duration) - 0.5) {
        stopPlayback();
        setPlayState('stopped');
      }
    };
  };

  const pausePlayback = () => {
    if (playState !== 'playing') return;
    const audioCtx = getAudioContext();
    pauseOffsetRef.current = audioCtx.currentTime - startTimeRef.current;
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setPlayState('paused');
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    pauseOffsetRef.current = 0;
    setPlayState('stopped');
  };

  useEffect(() => {
    if (playState === 'playing') {
      if (!isLiveMicActive && !sourceNodeRef.current && audioBufferRef.current) {
        startPlayback();
      }
      // Start loop
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(analysisLoop);
    } else if (playState === 'paused') {
      pausePlayback();
    } else if (playState === 'stopped') {
      stopPlayback();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [playState, isLiveMicActive]);

  const analysisLoop = () => {
    if (!analyserRef.current || !dataArrayRef.current) {
      animationFrameRef.current = requestAnimationFrame(analysisLoop);
      return;
    }

    const audioCtx = getAudioContext();
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Calculate custom bands (sub-bass / kick, mid / vocal, high / hi-hats)
    let bSum = 0; // index 1-8 (~30-240Hz)
    let mSum = 0; // index 9-40 (~240-1200Hz)
    let hSum = 0; // index 41-100 (~1200-3000Hz)
    let totalSum = 0;

    const len = dataArrayRef.current.length;
    for (let i = 0; i < len; i++) {
      const val = dataArrayRef.current[i] / 255;
      totalSum += val;
      if (i >= 1 && i <= 10) bSum += val;
      else if (i > 10 && i <= 50) mSum += val;
      else if (i > 50) hSum += val;
    }

    const bass = bSum / 10;
    const mid = mSum / 40;
    const high = hSum / (len - 51);
    const rms = Math.min(1.0, totalSum / len);

    // Transient triggers
    const kickPeak = bass > 0.65;
    const snarePeak = mid > 0.5;
    const hatPeak = high > 0.45;

    // Tuning modifications (frequency shift factor representation in procedural visual render state)
    let pitchScalingFactor = 1.0;
    if (tuningMode === '432hz') pitchScalingFactor = 432 / 440;
    else if (tuningMode === '528hz') pitchScalingFactor = 528 / 440;

    onFrameUpdate({
      bass: bass * pitchScalingFactor,
      mid,
      high,
      rms,
      kickPeak,
      snarePeak,
      hatPeak
    });

    if (playState === 'playing' && !isLiveMicActive) {
      const currentElapsed = audioCtx.currentTime - startTimeRef.current;
      onProgressUpdate(currentElapsed);
    }

    animationFrameRef.current = requestAnimationFrame(analysisLoop);
  };

  useEffect(() => {
    return () => {
      stopMic();
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div id="audio-container" className="bg-[#0A0A0A] p-6 rounded-lg border border-[#222] relative shadow-[0_4px_30px_rgba(0,0,0,0.8)] overflow-hidden group">
      {/* Visual cyber mesh background */}
      <div className="absolute inset-0 bg-[#FF4E00]/5 pointer-events-none opacity-20" />

      <h3 id="audio-title" className="text-xs font-bold tracking-widest text-white uppercase mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-[#FF4E00] animate-pulse" />
        SONIC DISCOVERY / AUDIO INPUT
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Upload Slot */}
        <div className="flex flex-col items-center justify-center border border-dashed border-[#222] hover:border-[#FF4E00] bg-black hover:bg-[#111] rounded p-6 transition-all relative">
          <input
            id="audio-file-selector"
            type="file"
            accept="audio/wav, audio/mp3, audio/flac, audio/ogg"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className="w-8 h-8 text-[#555] group-hover:text-[#FF4E00] mb-2 transition-transform duration-300" />
          <span className="text-xs font-bold text-[#E0E0E0]">DRAG & DROP AUDIO FILE</span>
          <span className="text-[10px] text-[#555] mt-1 font-mono">SUPPORTS WAV, MP3, FLAC, OGG</span>
        </div>

        {/* Live Microphone Setup */}
        <div className="flex flex-col gap-3">
          <button
            id="mic-reactor-toggle"
            onClick={toggleLiveMic}
            className={`flex items-center justify-center gap-3 p-4 rounded text-xs font-bold tracking-widest border transition-all duration-300 ${
              isLiveMicActive
                ? 'bg-[#FF4E00]/25 text-[#FF4E00] border-[#FF4E00]'
                : 'bg-black text-[#888] hover:text-white border-[#222] hover:bg-[#111]'
            }`}
          >
            <Mic className={`w-4 h-4 ${isLiveMicActive ? 'animate-bounce text-[#FF4E00]' : ''}`} />
            {isLiveMicActive ? 'DISCONNECT LIVE MIC' : 'CONNECT LIVE REACTIVE MIC'}
          </button>

          <div className="flex items-center justify-between text-[11px] text-[#888] p-3 bg-black rounded border border-[#222]">
            <span className="flex items-center gap-1.5 font-medium"><Volume2 className="w-3.5 h-3.5 text-[#555]" /> FREQUENCY TUNINGS</span>
            <span className="text-[10px] font-bold text-[#FF4E00] uppercase tracking-widest bg-black border border-[#222] px-2 py-0.5 rounded">
              {tuningMode} active
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-4 p-3 bg-[#111] border border-[#222] rounded flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-[#FF4E00] animate-spin" />
          <span className="text-xs text-[#E0E0E0] font-mono tracking-wider">Decoding and mapping audio frequencies...</span>
        </div>
      )}

      {errorLabel && (
        <div className="mt-4 p-3 bg-red-950/20 border border-red-800/30 rounded text-xs font-mono text-red-400">
          Error: {errorLabel}
        </div>
      )}

      {stats && (
        <div className="mt-4 p-4 bg-black rounded border border-[#222] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[9px] text-[#555] font-bold tracking-wider uppercase">FILE NAME</div>
            <div className="text-xs text-[#E0E0E0] mt-0.5 font-mono truncate max-w-[140px]">{stats.name}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#555] font-bold tracking-wider uppercase">BPM / TEMPO</div>
            <div className="text-xs text-[#FF4E00] font-mono font-bold mt-0.5">{stats.bpm} BPM</div>
          </div>
          <div>
            <div className="text-[9px] text-[#555] font-bold tracking-wider uppercase">DURATION</div>
            <div className="text-xs text-[#E0E0E0] mt-0.5 font-mono">{(stats.duration).toFixed(1)} Sec</div>
          </div>
          <div>
            <div className="text-[9px] text-[#555] font-bold tracking-wider uppercase">SPECTRUM MOOD</div>
            <div className="text-xs text-emerald-400 font-bold mt-0.5 truncate max-w-[120px] tracking-tight">{stats.detectedMood}</div>
          </div>
        </div>
      )}
    </div>
  );
}
