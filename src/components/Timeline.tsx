import React, { useState } from 'react';
import { Sliders, Plus, AlignLeft, RefreshCw, Type, Trash2, Clock } from 'lucide-react';
import { SubtitleItem, TextOverlayItem, AutomationLanes, RenderConfig } from '../types';

interface TimelineProps {
  duration: number;
  currentTime: number;
  config: RenderConfig;
  onChangeConfig: (config: RenderConfig) => void;
}

export default function Timeline({
  duration,
  currentTime,
  config,
  onChangeConfig
}: TimelineProps) {
  const [activeTab, setActiveTab] = useState<'automation' | 'subtitles' | 'overlays'>('automation');
  const [subText, setSubText] = useState('');
  const [subTime, setSubTime] = useState(0);
  const [subDuration, setSubDuration] = useState(3);
  const [overlayText, setOverlayText] = useState('');
  const [overlayStart, setOverlayStart] = useState(0);
  const [overlayEnd, setOverlayEnd] = useState(5);

  const durationMax = duration || 30;

  // --------------------------------------------------------------------------
  // Update Automation Parameter Lanes
  // --------------------------------------------------------------------------
  const handleAutomationChange = (key: keyof AutomationLanes, val: number) => {
    onChangeConfig({
      ...config,
      automation: {
        ...config.automation,
        [key]: val
      }
    });
  };

  // --------------------------------------------------------------------------
  // Subtitle lists creators
  // --------------------------------------------------------------------------
  const addSubtitle = () => {
    if (!subText.trim()) return;
    const newItem: SubtitleItem = {
      id: Math.random().toString(),
      time: Number(subTime),
      duration: Number(subDuration),
      text: subText,
      color: '#c084fc',
      fontSize: 14
    };
    onChangeConfig({
      ...config,
      subtitles: [...config.subtitles, newItem]
    });
    setSubText('');
  };

  const removeSubtitle = (id: string) => {
    onChangeConfig({
      ...config,
      subtitles: config.subtitles.filter(s => s.id !== id)
    });
  };

  // --------------------------------------------------------------------------
  // Overlay lists creators
  // --------------------------------------------------------------------------
  const addOverlay = () => {
    if (!overlayText.trim()) return;
    const newItem: TextOverlayItem = {
      id: Math.random().toString(),
      text: overlayText,
      timeStart: Number(overlayStart),
      timeEnd: Number(overlayEnd),
      positionX: 50,
      positionY: 40,
      fontSize: 28,
      color: '#ffffff',
      fontFamily: 'Space Grotesk'
    };
    onChangeConfig({
      ...config,
      overlays: [...config.overlays, newItem]
    });
    setOverlayText('');
  };

  const removeOverlay = (id: string) => {
    onChangeConfig({
      ...config,
      overlays: config.overlays.filter(o => o.id !== id)
    });
  };

  // Progress bar ratio
  const progressPercent = Math.min(100, (currentTime / (durationMax || 1)) * 100);

  return (
    <div id="timeline-box" className="bg-[#0A0A0A] p-6 rounded-lg border border-[#222] shadow-[0_4px_30px_rgba(0,0,0,0.8)] overflow-hidden relative">
      <div className="absolute inset-0 bg-[#FF4E00]/5 pointer-events-none opacity-20" />

      {/* Head section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222] pb-4 mb-4">
        <h3 id="timeline-title" className="text-xs font-bold tracking-widest text-white uppercase flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#FF4E00] animate-pulse" />
          MULTITRACK TIMELINE / AUDIO DECKS
        </h3>
        
        {/* Navigation Tabs */}
        <div className="flex bg-black p-1 rounded border border-[#222]">
          <button
            id="tab-automation"
            onClick={() => setActiveTab('automation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[9px] font-bold tracking-widest uppercase transition-all ${
              activeTab === 'automation' ? 'bg-[#1A1A1A] text-[#FF4E00] border border-[#222]/80' : 'text-[#555] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            AUTOMATION
          </button>
          <button
            id="tab-subtitles"
            onClick={() => setActiveTab('subtitles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[9px] font-bold tracking-widest uppercase transition-all ${
              activeTab === 'subtitles' ? 'bg-[#1A1A1A] text-[#FF4E00] border border-[#222]/80' : 'text-[#555] hover:text-white'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            SUBTITLES
          </button>
          <button
            id="tab-overlays"
            onClick={() => setActiveTab('overlays')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[9px] font-bold tracking-widest uppercase transition-all ${
              activeTab === 'overlays' ? 'bg-[#1A1A1A] text-[#FF4E00] border border-[#222]/80' : 'text-[#555] hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            OVERLAYS
          </button>
        </div>
      </div>

      {/* Dynamic playback tracker head */}
      <div className="p-4 bg-black border border-[#222] rounded mb-6">
        <div className="flex items-center justify-between text-[10px] text-[#555] font-mono mb-2">
          <span>{currentTime.toFixed(2)} S</span>
          <span>{durationMax.toFixed(2)} S (CLIP MAX)</span>
        </div>
        <div className="w-full h-2 bg-[#1A1A1A] rounded overflow-hidden relative border border-[#222]">
          <div
            className="h-full bg-[#FF4E00] rounded transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Active Tab: Sliders Lane */}
      {activeTab === 'automation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] font-bold tracking-wider text-[#888] mb-1">
                <span>SUB-BASS SENSITIVITY MULTIPLIER</span>
                <span className="text-[#FF4E00] font-mono">x{(config.automation.bassSensitivity).toFixed(1)}</span>
              </div>
              <input
                id="slider-bass"
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={config.automation.bassSensitivity}
                onChange={e => handleAutomationChange('bassSensitivity', Number(e.target.value))}
                className="w-full accent-[#FF4E00] bg-black h-1 rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold tracking-wider text-[#888] mb-1">
                <span>GLOW BLOOM INTENSITY</span>
                <span className="text-[#FF4E00] font-mono">x{(config.automation.glowIntensity).toFixed(1)}</span>
              </div>
              <input
                id="slider-glow"
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={config.automation.glowIntensity}
                onChange={e => handleAutomationChange('glowIntensity', Number(e.target.value))}
                className="w-full accent-[#FF4E00] bg-black h-1 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] font-bold tracking-wider text-[#888] mb-1">
                <span>ORBITAL PARTICLE SPEED</span>
                <span className="text-[#FF4E00] font-mono">x{(config.automation.particleSpeed).toFixed(1)}</span>
              </div>
              <input
                id="slider-speed"
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={config.automation.particleSpeed}
                onChange={e => handleAutomationChange('particleSpeed', Number(e.target.value))}
                className="w-full accent-[#FF4E00] bg-black h-1 rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold tracking-wider text-[#888] mb-1">
                <span>CHROMATIC GLITCH DISTORTION</span>
                <span className="text-[#FF4E00] font-mono">x{(config.automation.chromaticAberration).toFixed(1)}</span>
              </div>
              <input
                id="slider-glitch"
                type="range"
                min="0"
                max="4"
                step="0.2"
                value={config.automation.chromaticAberration}
                onChange={e => handleAutomationChange('chromaticAberration', Number(e.target.value))}
                className="w-full accent-[#FF4E00] bg-black h-1 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Tab: Subtitles */}
      {activeTab === 'subtitles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-black p-4 rounded border border-[#222]">
            <div className="sm:col-span-2">
              <label className="text-[9px] font-bold text-[#555] mb-1 block uppercase">TEXT SUBTITLE</label>
              <input
                id="input-sub-text"
                type="text"
                value={subText}
                onChange={e => setSubText(e.target.value)}
                placeholder="Drop punchline lyrics here..."
                className="w-full bg-black border border-[#222] focus:border-[#FF4E00] text-xs px-3 py-2 rounded text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#555] mb-1 block uppercase">START TIME (S)</label>
              <input
                id="input-sub-time"
                type="number"
                min="0"
                max={durationMax}
                value={subTime}
                onChange={e => setSubTime(Number(e.target.value))}
                className="w-full bg-black border border-[#222] focus:border-[#FF4E00] text-xs px-3 py-2 rounded text-white focus:outline-none"
              />
            </div>
            <button
              id="btn-sub-add"
              onClick={addSubtitle}
              className="w-full px-4 py-2 bg-[#FF4E00] hover:bg-white text-black text-xs font-bold tracking-widest rounded-sm transition-all flex items-center justify-center gap-1 uppercase"
            >
              <Plus className="w-3.5 h-3.5" /> ADD
            </button>
          </div>

          <div className="max-h-[140px] overflow-y-auto space-y-2 pr-2">
            {config.subtitles.length === 0 ? (
              <p className="text-[10px] text-[#555] italic text-center py-4">No subtitles registered. Perfect for lyrical sync!</p>
            ) : (
              config.subtitles.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-2.5 bg-black border border-[#222] rounded-sm text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#FF4E00] text-[9px] bg-black border border-[#222] px-1.5 py-0.5 rounded-sm">
                      {sub.time}s - {sub.time + sub.duration}s
                    </span>
                    <span className="text-[#E0E0E0] font-bold uppercase">{sub.text}</span>
                  </div>
                  <button
                    id={`btn-sub-del-${sub.id}`}
                    onClick={() => removeSubtitle(sub.id)}
                    className="text-[#555] hover:text-[#FF4E00] p-1 rounded hover:bg-[#FF4E00]/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Active Tab: Text Overlays */}
      {activeTab === 'overlays' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-black p-4 rounded border border-[#222]">
            <div className="sm:col-span-2">
              <label className="text-[9px] font-bold text-[#555] mb-1 block uppercase">OVERLAY HEADER</label>
              <input
                id="input-overlay-text"
                type="text"
                value={overlayText}
                onChange={e => setOverlayText(e.target.value)}
                placeholder="e.g. OUT NOW ON SPOTIFY"
                className="w-full bg-black border border-[#222] focus:border-[#FF4E00] text-xs px-3 py-2 rounded text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#555] mb-1 block uppercase">DISPLAY START (S)</label>
              <input
                id="input-overlay-start"
                type="number"
                min="0"
                max={durationMax}
                value={overlayStart}
                onChange={e => setOverlayStart(Number(e.target.value))}
                className="w-full bg-black border border-[#222] focus:border-[#FF4E00] text-xs px-3 py-2 rounded text-white focus:outline-none"
              />
            </div>
            <button
              id="btn-overlay-add"
              onClick={addOverlay}
              className="w-full px-4 py-2 bg-[#FF4E00] hover:bg-white text-black text-xs font-bold tracking-widest rounded-sm transition-all flex items-center justify-center gap-1 uppercase"
            >
              <Plus className="w-3.5 h-3.5" /> DISPLAY
            </button>
          </div>

          <div className="max-h-[140px] overflow-y-auto space-y-2 pr-2">
            {config.overlays.length === 0 ? (
              <p className="text-[10px] text-[#555] italic text-center py-4">No graphic overlays. Write promotional callouts here!</p>
            ) : (
              config.overlays.map(over => (
                <div key={over.id} className="flex items-center justify-between p-2.5 bg-black border border-[#222] rounded-sm text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#FF4E00] text-[9px] bg-black border border-[#222] px-1.5 py-0.5 rounded-sm">
                      {over.timeStart}s - {over.timeEnd}s
                    </span>
                    <span className="text-[#E0E0E0] font-bold uppercase">{over.text}</span>
                  </div>
                  <button
                    id={`btn-over-del-${over.id}`}
                    onClick={() => removeOverlay(over.id)}
                    className="text-[#555] hover:text-[#FF4E00] p-1 rounded hover:bg-[#FF4E00]/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
