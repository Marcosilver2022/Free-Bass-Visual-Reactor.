export type VisualPreset =
  | 'cyberpunk'
  | 'liquid_dnb'
  | 'psychedelic'
  | 'dark_garage'
  | 'scifi'
  | 'vhs'
  | 'sacred_geometry'
  | 'cosmic_frequencies'
  | 'ai_dreamscape';

export type AspectRatio = '16:9' | '9:16' | '1:1';

export interface AudioStats {
  duration: number;
  bpm: number;
  name: string;
  url: string;
  detectedMood: string;
}

export interface SubtitleItem {
  id: string;
  time: number; // in seconds
  duration: number; // in seconds
  text: string;
  color: string;
  fontSize: number;
}

export interface TextOverlayItem {
  id: string;
  text: string;
  timeStart: number;
  timeEnd: number;
  positionX: number; // 0-100 percentage
  positionY: number; // 0-100 percentage
  fontSize: number;
  color: string;
  fontFamily: string;
}

export interface AutomationLanes {
  bassSensitivity: number; // multiplier
  particleSpeed: number; // multiplier
  glowIntensity: number; // multiplier
  chromaticAberration: number; // strength
  glitchLevel: number; // strength
}

export interface RenderConfig {
  preset: VisualPreset;
  aspectRatio: AspectRatio;
  subtitles: SubtitleItem[];
  overlays: TextOverlayItem[];
  automation: AutomationLanes;
  trimStart: number;
  trimEnd: number;
  customImageUri: string | null;
  customVideoUri: string | null;
  backgroundImageQuery: string;
  watermarkText: string;
  showWatermark: boolean;
  tuningMode: '440hz' | '432hz' | '528hz';
}

export interface TrackFeatureLevels {
  bass: number;       // 0 to 1 normalized
  mid: number;        // 0 to 1 normalized
  high: number;       // 0 to 1 normalized
  rms: number;        // root mean square level
  kickPeak: boolean;   // transient trigger
  snarePeak: boolean;  // transient trigger
  hatPeak: boolean;    // transient trigger
}
