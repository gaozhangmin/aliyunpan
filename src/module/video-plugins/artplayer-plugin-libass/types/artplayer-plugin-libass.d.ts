import type Artplayer from 'artplayer'
import type JASSUB from 'jassub'

export = artplayerPluginAss
export as namespace artplayerPluginAss

type Option = {
  canvas?: HTMLCanvasElement;

  blendMode?: 'js' | 'wasm';

  asyncRender?: boolean;
  offscreenRender?: boolean;
  onDemandRender?: boolean;
  targetFps?: number;
  timeOffset?: number;

  debug?: boolean;
  prescaleFactor?: number;
  prescaleHeightLimit?: number;
  maxRenderHeight?: number;
  dropAllAnimations?: boolean;
  dropAllBlur?: boolean

  workerUrl?: string;
  wasmUrl?: string;
  legacyWasmUrl?: string;
  modernWasmUrl?: string;

  subUrl?: string;
  subContent?: string;

  fonts?: string[] | Uint8Array[];
  availableFonts?: Record<string, string>;
  fallbackFont?: string;
  useLocalFonts?: boolean;

  libassMemoryLimit?: number;
  libassGlyphLimit?: number;
}

declare const artplayerPluginAss: (options: Option) => (art: Artplayer) => {
  name: 'artplayerPluginLibass';
  libass: JASSUB;
  visible: boolean;
  init: () => void;
  switch: (url: string) => void;
  resize: () => void;
  show: () => void;
  hide: () => void;
  destroy: () => void;
}
