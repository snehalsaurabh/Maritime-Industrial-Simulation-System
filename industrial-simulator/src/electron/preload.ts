import { contextBridge, ipcRenderer } from 'electron';
import type { StudioApi, StudioProject } from '../studio/shared/studio-types.js';

const api: StudioApi = {
  loadProject: () => ipcRenderer.invoke('studio:load-project') as Promise<StudioProject>,
  saveProject: (project) => ipcRenderer.invoke('studio:save-project', project) as Promise<{ savedAt: string }>,
  exportConfig: (project) => ipcRenderer.invoke('studio:export-config', project) as Promise<{ configPath: string }>,
  startSimulator: (project) => ipcRenderer.invoke('studio:start-simulator', project),
  stopSimulator: () => ipcRenderer.invoke('studio:stop-simulator'),
  getRuntimeSnapshot: (project) => ipcRenderer.invoke('studio:get-runtime-snapshot', project)
};

contextBridge.exposeInMainWorld('studioApi', api);
