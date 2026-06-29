import type { StudioApi } from '../shared/studio-types.js';

declare global {
  interface Window {
    studioApi?: StudioApi;
  }
}

export {};
