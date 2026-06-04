import { contextBridge, ipcRenderer } from 'electron';

const api = {
  loadProject: () => ipcRenderer.invoke('studio:load-project'),
  saveProject: (project: unknown) => ipcRenderer.invoke('studio:save-project', project),
  exportConfig: (project: unknown) => ipcRenderer.invoke('studio:export-config', project),
  startSimulator: (project: unknown) => ipcRenderer.invoke('studio:start-simulator', project),
  stopSimulator: () => ipcRenderer.invoke('studio:stop-simulator'),
  getRuntimeSnapshot: (project: unknown) => ipcRenderer.invoke('studio:get-runtime-snapshot', project)
};

contextBridge.exposeInMainWorld('studioApi', api);
