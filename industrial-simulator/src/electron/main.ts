import { app, BrowserWindow, ipcMain } from 'electron';
import { createServer, type Server } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { validateConfig } from '../config/loader.js';
import type { ParameterValue } from '../domain/types.js';
import { SimulatorRuntime } from '../runtime/simulator-runtime.js';
import {
  compileSimulatorConfig,
  createDefaultStudioProject,
  type StudioProject,
  type StudioRegisterRow,
  type StudioRuntimeSnapshot
} from '../studio/shared/studio-types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.disableHardwareAcceleration();
app.setPath('userData', join(process.cwd(), '.studio-data'));

let mainWindow: BrowserWindow | undefined;
let runtime: SimulatorRuntime | undefined;
let runtimeConfigPath: string | undefined;
let rendererServer: Server | undefined;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#101820',
    title: 'Device Definition Studio',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[studio renderer] ${message}`);
  });
  mainWindow.webContents.on('did-fail-load', (_event, _errorCode, errorDescription, validatedUrl) => {
    console.error(`[studio load failed] ${validatedUrl}: ${errorDescription}`);
  });

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  const rendererUrl = await startRendererServer();
  await mainWindow.loadURL(rendererUrl);
}

function projectPath(): string {
  return join(app.getPath('userData'), 'studio-project.json');
}

function exportedConfigPath(): string {
  return join(app.getPath('userData'), 'runtime-config.yaml');
}

async function loadProject(): Promise<StudioProject> {
  try {
    const raw = await readFile(projectPath(), 'utf8');
    return JSON.parse(raw) as StudioProject;
  } catch {
    const project = createDefaultStudioProject();
    await saveProject(project);
    return project;
  }
}

async function saveProject(project: StudioProject): Promise<{ savedAt: string }> {
  const savedAt = new Date().toISOString();
  const nextProject = { ...project, updatedAt: savedAt };
  await mkdir(dirname(projectPath()), { recursive: true });
  await writeFile(projectPath(), JSON.stringify(nextProject, null, 2), 'utf8');
  return { savedAt };
}

async function exportConfig(project: StudioProject): Promise<{ configPath: string }> {
  const config = compileSimulatorConfig(project);
  await validateConfig(config);
  const configPath = exportedConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, stringify(config), 'utf8');
  return { configPath };
}

async function startSimulator(project: StudioProject): Promise<StudioRuntimeSnapshot> {
  await stopSimulator();
  await saveProject(project);
  const exported = await exportConfig(project);
  const nextRuntime = new SimulatorRuntime(exported.configPath);
  await nextRuntime.start();
  runtime = nextRuntime;
  runtimeConfigPath = exported.configPath;
  return snapshot(project);
}

async function stopSimulator(): Promise<StudioRuntimeSnapshot> {
  if (runtime) {
    await runtime.stop();
  }
  runtime = undefined;
  runtimeConfigPath = undefined;
  return snapshot(await loadProject());
}

function snapshot(project: StudioProject): StudioRuntimeSnapshot {
  const stats = runtime?.getStats() ?? {
    devices: project.devices.length,
    parameters: project.devices.reduce((count, device) => count + device.parameters.length, 0),
    ticks: 0,
    lastTickDurationMs: 0,
    protocolRequests: 0,
    protocolErrors: 0
  };
  const values = runtime?.listValues() ?? [];
  return {
    running: Boolean(runtime),
    configPath: runtimeConfigPath,
    stats,
    values: values.map((value) => ({
      deviceId: value.deviceId,
      parameterId: value.parameterId,
      dataType: value.dataType,
      value: primitiveToString(value.value),
      quality: value.quality,
      timestamp: value.timestamp.toISOString()
    })),
    registers: buildRegisterRows(project, values)
  };
}

function buildRegisterRows(project: StudioProject, values: ParameterValue[]): StudioRegisterRow[] {
  const valueMap = new Map(values.map((value) => [`${value.deviceId}:${value.parameterId}`, value]));
  const protocolPorts = new Map(
    project.protocols.map((protocol) => [protocol.id, protocol.port ?? 502])
  );
  const rows: StudioRegisterRow[] = [];

  for (const device of project.devices) {
    for (const parameter of device.parameters) {
      const value = valueMap.get(`${device.deviceId}:${parameter.parameterId}`);
      rows.push({
        serverId: device.protocol.serverId,
        port: protocolPorts.get(device.protocol.serverId) ?? 502,
        slaveId: device.protocol.slaveId ?? 1,
        deviceId: device.deviceId,
        parameterId: parameter.parameterId,
        registerType: parameter.mapping.registerType,
        address: parameter.mapping.address,
        dataType: parameter.dataType,
        value: value ? primitiveToString(value.value) : '',
        quality: value?.quality ?? 'pending'
      });
    }
  }

  return rows.sort((a, b) => {
    if (a.serverId !== b.serverId) {
      return a.serverId.localeCompare(b.serverId);
    }
    if (a.slaveId !== b.slaveId) {
      return a.slaveId - b.slaveId;
    }
    if (a.registerType !== b.registerType) {
      return a.registerType.localeCompare(b.registerType);
    }
    return a.address - b.address;
  });
}

function primitiveToString(value: unknown): string {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return String(value);
}

ipcMain.handle('studio:load-project', () => loadProject());
ipcMain.handle('studio:save-project', (_event, project: StudioProject) => saveProject(project));
ipcMain.handle('studio:export-config', (_event, project: StudioProject) => exportConfig(project));
ipcMain.handle('studio:start-simulator', (_event, project: StudioProject) => startSimulator(project));
ipcMain.handle('studio:stop-simulator', () => stopSimulator());
ipcMain.handle('studio:get-runtime-snapshot', (_event, project: StudioProject) => snapshot(project));

app.whenReady().then(() => void createWindow());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (runtime) {
    void runtime.stop();
  }
  rendererServer?.close();
});

async function startRendererServer(): Promise<string> {
  if (rendererServer) {
    const address = rendererServer.address();
    if (address && typeof address === 'object') {
      return `http://127.0.0.1:${address.port}/`;
    }
  }

  const rendererRoot = resolve(__dirname, '../studio/renderer');
  rendererServer = createServer((request, response) => {
    const rawPath = decodeURIComponent(request.url?.split('?')[0] ?? '/');
    const normalizedPath = normalize(rawPath === '/' ? '/index.html' : rawPath).replace(/^[/\\]+/, '');
    const filePath = resolve(rendererRoot, normalizedPath);
    if (!filePath.startsWith(rendererRoot)) {
      response.writeHead(403);
      response.end();
      return;
    }

    readFile(filePath)
      .then((content) => {
        response.writeHead(200, { 'content-type': contentType(filePath) });
        response.end(content);
      })
      .catch(() => {
        response.writeHead(404);
        response.end();
      });
  });

  await new Promise<void>((resolveServer, reject) => {
    rendererServer?.once('error', reject);
    rendererServer?.listen(0, '127.0.0.1', () => {
      rendererServer?.off('error', reject);
      resolveServer();
    });
  });

  const address = rendererServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Renderer server did not start on a TCP port');
  }
  return `http://127.0.0.1:${address.port}/`;
}

function contentType(filePath: string): string {
  switch (extname(filePath)) {
    case '.html':
      return 'text/html';
    case '.js':
      return 'text/javascript';
    case '.css':
      return 'text/css';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}
