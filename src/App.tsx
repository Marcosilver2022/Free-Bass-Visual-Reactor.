import React, { useState, useEffect } from 'react';
import { Volume2, Music, Video, Sparkles, Sliders, Activity, Disc, Play, Pause, Square, FileVideo, Download, Share2 } from 'lucide-react';
import { VisualPreset, AspectRatio, TrackFeatureLevels, RenderConfig, AudioStats } from './types';
import AudioAnalyser from './components/AudioAnalyser';
import VisualEngine from './components/VisualEngine';
import Timeline from './components/Timeline';
import ControlPanel from './components/ControlPanel';

export default function App() {
  // Audio state
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null);
  const [playState, setPlayState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLiveMicActive, setIsLiveMicActive] = useState<boolean>(false);

  // Sound real-time features
  const [features, setFeatures] = useState<TrackFeatureLevels>({
    bass: 0,
    mid: 0,
    high: 0,
    rms: 0,
    kickPeak: false,
    snarePeak: false,
    hatPeak: false
  });

  // Editor configurations
  const [config, setConfig] = useState<RenderConfig>({
    preset: 'liquid_dnb',
    aspectRatio: '9:16',
    subtitles: [
      { id: '1', time: 1.5, duration: 4, text: 'WELCOME TO FREE BASS STUDIO...', color: '#a78bfa', fontSize: 13 },
      { id: '2', time: 7, duration: 3, text: 'FEEL THE SUB-BASS TRANSIENTS COLLIDE.', color: '#22d3ee', fontSize: 14 }
    ],
    overlays: [],
    automation: {
      bassSensitivity: 1.2,
      particleSpeed: 1.0,
      glowIntensity: 1.1,
      chromaticAberration: 1.0,
      glitchLevel: 0.1
    },
    trimStart: 0,
    trimEnd: 30,
    customImageUri: null,
    customVideoUri: null,
    backgroundImageQuery: 'Futuristic music frequencies becoming physical matter, highly detailed',
    watermarkText: 'FREE BASS VISUAL REACTOR',
    showWatermark: true,
    tuningMode: '440hz'
  });

  // Export recording triggers
  const [recordStatus, setRecordStatus] = useState<'idle' | 'recording' | 'finished'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Sync preset if changed in Control Panel
  const handleConfigChange = (newConfig: RenderConfig) => {
    setConfig(newConfig);
  };

  const handleAudioStats = (stats: AudioStats) => {
    setAudioStats(stats);
    setCurrentTime(0);
    // Reset automatic trim window based on duration loaded
    setConfig(prev => ({
      ...prev,
      trimEnd: Math.min(stats.duration, 30)
    }));
  };

  return (
    <div id="reactor-app" className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans pb-12 overflow-hidden selection:bg-[#FF4E00]/30 selection:text-white">
      
      {/* GLOWING AMBIENT HEAD GRAPHICS */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#FF4E00]/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-12 left-1/4 w-[300px] h-[300px] bg-[#FF4E00]/5 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-24 right-1/4 w-[250px] h-[250px] bg-orange-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />

      {/* CORE HUD HEADER */}
      <header className="h-14 border-b border-[#222] bg-[#0A0A0A] flex items-center px-6 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-[#FF4E00] rounded-sm flex items-center justify-center font-black text-black text-xs">FB</div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 id="app-heading" className="text-sm font-bold tracking-wider uppercase text-white">
                  FREE BASS <span className="text-[#FF4E00]">VISUAL REACTOR</span>
                </h1>
                <span className="text-[8px] font-mono text-[#888] bg-black border border-[#222] px-1.5 py-0.5 rounded">v2.1</span>
              </div>
              <p className="text-[9px] text-[#555] font-mono tracking-widest uppercase mt-0.5 hidden sm:block">Engine active &bull; GPU stream rendering</p>
            </div>
          </div>

          {/* ACTIVE REALTIME SOUND-METERS HUD */}
          <div className="flex items-center gap-5 bg-black px-4 py-1.5 rounded border border-[#222]">
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-[#888] tracking-wider uppercase">RMS LEVEL</span>
              <div className="mt-0.5 flex items-center gap-1.5">
                <div className="w-16 h-1 bg-[#1A1A1A] rounded-full overflow-hidden relative border border-transparent">
                  <div className="h-full bg-[#FF4E00]" style={{ width: `${features.rms * 100}%` }} />
                </div>
                <span className="text-[8px] font-mono text-[#FF4E00] font-semibold">-{((1 - features.rms) * 12).toFixed(1)}dB</span>
              </div>
            </div>

            <div className="h-5 w-[1px] bg-[#222]" />

            <div className="flex items-center gap-3 text-[10px] font-mono">
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-[#555] font-bold">SUB</span>
                <span className={`w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center text-[8px] font-bold ${
                  features.kickPeak ? 'bg-[#FF4E00] text-black shadow-[0_0_10px_#FF4E00]' : 'bg-[#1A1A1A] text-[#555]'
                }`}>B</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-[#555] font-bold">MID</span>
                <span className={`w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center text-[8px] font-bold ${
                  features.snarePeak ? 'bg-orange-500 text-black shadow-[0_0_10px_#f97316]' : 'bg-[#1A1A1A] text-[#555]'
                }`}>M</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-[#555] font-bold">HIGH</span>
                <span className={`w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center text-[8px] font-bold ${
                  features.hatPeak ? 'bg-yellow-500 text-black shadow-[0_0_10px_#eab308]' : 'bg-[#1A1A1A] text-[#555]'
                }`}>H</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* WORKSPACE AREA */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT AREA: Visualizer, Controller deck, Timelines (8 units) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Realtime visual preview screen */}
            <VisualEngine
              preset={config.preset}
              aspectRatio={config.aspectRatio}
              features={features}
              currentTime={currentTime}
              subtitles={config.subtitles}
              overlays={config.overlays}
              automation={config.automation}
              customImageUri={config.customImageUri}
              customVideoUri={config.customVideoUri}
              watermarkText={config.watermarkText}
              showWatermark={config.showWatermark}
              onRecordStatusChange={(status, fileUrl) => {
                setRecordStatus(status);
                if (fileUrl) setDownloadUrl(fileUrl);
              }}
            />

            {/* Micro media controller layout */}
            <div className="bg-[#0A0A0A] p-4 border border-[#222] rounded-xl flex items-center justify-between">
              
              <div className="flex items-center gap-2">
                <button
                  id="media-play"
                  disabled={!audioStats && !isLiveMicActive}
                  onClick={() => setPlayState('playing')}
                  className={`p-2 rounded border transition-all ${
                    playState === 'playing'
                      ? 'bg-[#FF4E00] border-[#FF4E00] text-black font-bold shadow-[0_0_10px_rgba(255,78,0,0.3)]'
                      : 'bg-black border-[#222] text-[#888] hover:text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
                <button
                  id="media-pause"
                  disabled={playState !== 'playing'}
                  onClick={() => setPlayState('paused')}
                  className="p-2 bg-black border border-[#222] text-[#888] hover:text-white rounded hover:bg-[#1A1A1A]"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
                <button
                  id="media-stop"
                  disabled={playState === 'stopped'}
                  onClick={() => setPlayState('stopped')}
                  className="p-2 bg-black border border-[#222] text-[#888] hover:text-red-500 rounded hover:bg-[#1A1A1A]"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Clip trim bounds setup */}
              <div className="flex items-center gap-3 text-xs font-mono text-[#888]">
                <span className="text-[9px] text-[#555] font-bold uppercase tracking-wider">CLIP LENGTH</span>
                <div className="bg-black border border-[#222] px-3 py-1 rounded flex items-center gap-1.5">
                  <span className="text-[#555] text-[10px]">START:</span>
                  <input
                    id="input-trim-start"
                    type="number"
                    value={config.trimStart}
                    min={0}
                    max={audioStats?.duration || 30}
                    onChange={e => setConfig({ ...config, trimStart: Number(e.target.value) })}
                    className="w-10 bg-transparent text-[#E0E0E0] font-bold text-center border-none focus:outline-none"
                  />
                  <span className="text-[#555] text-[10px]">S</span>
                </div>
                <div className="bg-black border border-[#222] px-3 py-1 rounded flex items-center gap-1.5">
                  <span className="text-[#555] text-[10px]">END:</span>
                  <input
                    id="input-trim-end"
                    type="number"
                    value={config.trimEnd}
                    min={config.trimStart}
                    max={audioStats?.duration || 30}
                    onChange={e => setConfig({ ...config, trimEnd: Number(e.target.value) })}
                    className="w-10 bg-transparent text-[#E0E0E0] font-bold text-center border-none focus:outline-none"
                  />
                  <span className="text-[#555] text-[10px]">S</span>
                </div>
              </div>

              {/* Status information */}
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono">
                <Disc className={`w-3.5 h-3.5 text-[#FF4E00] ${playState === 'playing' ? 'animate-spin' : ''}`} />
                <span className="text-[#888] uppercase tracking-widest">{playState.toUpperCase()} MODE</span>
              </div>
            </div>

            {/* Multitrack Editor Timeline */}
            <Timeline
              duration={audioStats?.duration || 30}
              currentTime={currentTime}
              config={config}
              onChangeConfig={handleConfigChange}
            />

            {/* Display completed files ready to be served */}
            {downloadUrl && (
              <div className="p-5 bg-gradient-to-r from-emerald-950/25 to-black border border-emerald-500/25 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-wide">CINEMATIC SHORT COMPLETED</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Your sound-reactive visual clip is exported and ready for Instagram or TikTok!</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    id="export-download"
                    href={downloadUrl}
                    download={`FreeBass-Reactor-${config.preset}.webm`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#FF4E00] hover:bg-white text-black font-bold tracking-widest text-[10px] rounded transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    DOWNLOAD COMPILATION
                  </a>
                  <button
                    id="export-share"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Free Bass Visual Reactor Concept',
                          url: downloadUrl
                        }).catch(() => {});
                      } else {
                        alert('Link copied to clipboard for direct download!');
                      }
                    }}
                    className="p-2 bg-black hover:bg-[#1A1A1A] text-zinc-300 border border-[#222] rounded hover:text-white transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT PANEL: Audio analyzer & Control configuration desk (4 units) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Load audio panel */}
            <AudioAnalyser
              onAudioAnalyzed={handleAudioStats}
              onFrameUpdate={setFeatures}
              onProgressUpdate={setCurrentTime}
              trimStart={config.trimStart}
              trimEnd={config.trimEnd}
              tuningMode={config.tuningMode}
              isLiveMicActive={isLiveMicActive}
              onLiveMicChange={setIsLiveMicActive}
              playState={playState}
              setPlayState={setPlayState}
            />

            {/* System presets, settings & Gemini prompt panel */}
            <ControlPanel
              config={config}
              onChangeConfig={handleConfigChange}
              audioStats={audioStats}
              onSetAIImage={(uri) => setConfig(prev => ({ ...prev, customImageUri: uri }))}
            />

          </div>

        </div>
      </main>
      
    </div>
  );
}
