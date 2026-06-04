import {
  Activity,
  AlertTriangle,
  Database,
  Download,
  Gauge,
  ListPlus,
  Play,
  Save,
  Settings,
  Square,
  Waves
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  DataType,
  FaultDefinition,
  GeneratorDefinition,
  RegisterType
} from '../../domain/types.js';
import type {
  FaultScenario,
  SimulationProfile,
  StudioDeviceDefinition,
  StudioParameterDefinition,
  StudioProject,
  StudioRuntimeSnapshot
} from '../shared/studio-types.js';
import { createDefaultStudioProject } from '../shared/studio-types.js';

type Tab = 'device' | 'profiles' | 'faults' | 'runtime';

const dataTypes: DataType[] = ['int16', 'uint16', 'int32', 'uint32', 'float32', 'float64', 'boolean', 'string'];
const registerTypes: RegisterType[] = ['holding-register', 'input-register', 'coil', 'discrete-input'];
const generatorTypes: GeneratorDefinition['type'][] = [
  'static',
  'random',
  'linear-ramp',
  'sine-wave',
  'square-wave',
  'sawtooth'
];
const faultTypes: FaultDefinition['type'][] = ['freeze', 'timeout', 'drift', 'spike', 'noise', 'offline'];

export function App(): JSX.Element {
  const [project, setProject] = useState<StudioProject>(() => createDefaultStudioProject());
  const [snapshot, setSnapshot] = useState<StudioRuntimeSnapshot | undefined>();
  const [selectedDeviceId, setSelectedDeviceId] = useState('main-engine-01');
  const [selectedParameterId, setSelectedParameterId] = useState('rpm');
  const [tab, setTab] = useState<Tab>('device');
  const [status, setStatus] = useState('Loading studio project');

  const selectedDevice = useMemo(
    () => project.devices.find((device) => device.deviceId === selectedDeviceId) ?? project.devices[0],
    [project.devices, selectedDeviceId]
  );
  const selectedParameter = useMemo(
    () => selectedDevice?.parameters.find((parameter) => parameter.parameterId === selectedParameterId) ?? selectedDevice?.parameters[0],
    [selectedDevice, selectedParameterId]
  );

  useEffect(() => {
    void window.studioApi.loadProject().then((loaded) => {
      setProject(loaded);
      setSelectedDeviceId(loaded.devices[0]?.deviceId ?? '');
      setSelectedParameterId(loaded.devices[0]?.parameters[0]?.parameterId ?? '');
      setStatus(`Loaded ${loaded.devices.length} device definition(s)`);
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void window.studioApi.getRuntimeSnapshot(project).then(setSnapshot);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [project]);

  function updateProject(mutator: (draft: StudioProject) => void): void {
    setProject((current) => {
      const next = structuredClone(current) as StudioProject;
      mutator(next);
      next.updatedAt = new Date().toISOString();
      return next;
    });
  }

  function updateDevice(mutator: (device: StudioDeviceDefinition) => void): void {
    updateProject((draft) => {
      const device = draft.devices.find((candidate) => candidate.deviceId === selectedDeviceId);
      if (device) {
        mutator(device);
      }
    });
  }

  function updateParameter(mutator: (parameter: StudioParameterDefinition) => void): void {
    updateDevice((device) => {
      const parameter = device.parameters.find((candidate) => candidate.parameterId === selectedParameterId);
      if (parameter) {
        mutator(parameter);
      }
    });
  }

  async function saveProject(): Promise<void> {
    const result = await window.studioApi.saveProject(project);
    setStatus(`Saved project at ${new Date(result.savedAt).toLocaleTimeString()}`);
  }

  async function exportConfig(): Promise<void> {
    const result = await window.studioApi.exportConfig(project);
    setStatus(`Exported runtime config to ${result.configPath}`);
  }

  async function startSimulator(): Promise<void> {
    const nextSnapshot = await window.studioApi.startSimulator(project);
    setSnapshot(nextSnapshot);
    setStatus(`Simulator running from ${nextSnapshot.configPath ?? 'generated config'}`);
  }

  async function stopSimulator(): Promise<void> {
    setSnapshot(await window.studioApi.stopSimulator());
    setStatus('Simulator stopped');
  }

  function addDevice(): void {
    const index = project.devices.length + 1;
    const deviceId = `device-${index.toString().padStart(2, '0')}`;
    updateProject((draft) => {
      draft.devices.push({
        deviceId,
        deviceType: 'generic-device',
        displayName: `Device ${index}`,
        protocol: { type: 'modbus-tcp', serverId: draft.protocols[0]?.id ?? 'modbus-main', slaveId: index },
        parameters: [createParameter('value', 0)]
      });
    });
    setSelectedDeviceId(deviceId);
    setSelectedParameterId('value');
  }

  function addParameter(): void {
    const address = selectedDevice?.parameters.length ?? 0;
    const parameter = createParameter(`parameter-${address + 1}`, address * 2);
    updateDevice((device) => {
      device.parameters.push(parameter);
    });
    setSelectedParameterId(parameter.parameterId);
  }

  function addProfile(): void {
    const index = project.profiles.length + 1;
    updateProject((draft) => {
      draft.profiles.push({
        profileId: `profile-${index}`,
        displayName: `Profile ${index}`,
        deviceIds: draft.devices.map((device) => device.deviceId),
        enabled: false
      });
    });
  }

  function addScenario(): void {
    const index = project.scenarios.length + 1;
    updateProject((draft) => {
      draft.scenarios.push({
        scenarioId: `scenario-${index}`,
        displayName: `Scenario ${index}`,
        enabled: false,
        faults: [{ type: 'noise', enabled: true, amplitude: 1 }]
      });
    });
  }

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Industrial Simulation Platform</p>
          <h1>Device Definition Studio</h1>
        </div>
        <div className="actions">
          <button onClick={() => void saveProject()} title="Save project">
            <Save size={18} />
            Save
          </button>
          <button onClick={() => void exportConfig()} title="Export runtime config">
            <Download size={18} />
            Export
          </button>
          {snapshot?.running ? (
            <button className="danger" onClick={() => void stopSimulator()} title="Stop simulator">
              <Square size={18} />
              Stop
            </button>
          ) : (
            <button className="primary" onClick={() => void startSimulator()} title="Start simulator">
              <Play size={18} />
              Start
            </button>
          )}
        </div>
      </header>

      <section className="status-strip">
        <Metric label="Devices" value={snapshot?.stats.devices ?? project.devices.length} />
        <Metric label="Parameters" value={snapshot?.stats.parameters ?? project.devices.reduce((sum, device) => sum + device.parameters.length, 0)} />
        <Metric label="Ticks" value={snapshot?.stats.ticks ?? 0} />
        <Metric label="Protocol Requests" value={snapshot?.stats.protocolRequests ?? 0} />
        <span className={snapshot?.running ? 'runtime-state running' : 'runtime-state'}>{snapshot?.running ? 'Running' : 'Stopped'}</span>
      </section>

      <section className="workspace">
        <aside className="rail">
          <button className={tab === 'device' ? 'active' : ''} onClick={() => setTab('device')} title="Devices">
            <Gauge size={18} />
            Devices
          </button>
          <button className={tab === 'profiles' ? 'active' : ''} onClick={() => setTab('profiles')} title="Profiles">
            <Waves size={18} />
            Profiles
          </button>
          <button className={tab === 'faults' ? 'active' : ''} onClick={() => setTab('faults')} title="Fault scenarios">
            <AlertTriangle size={18} />
            Faults
          </button>
          <button className={tab === 'runtime' ? 'active' : ''} onClick={() => setTab('runtime')} title="Runtime">
            <Activity size={18} />
            Runtime
          </button>
        </aside>

        {tab === 'device' && (
          <DeviceWorkspace
            project={project}
            selectedDevice={selectedDevice}
            selectedParameter={selectedParameter}
            selectedDeviceId={selectedDeviceId}
            selectedParameterId={selectedParameterId}
            setSelectedDeviceId={setSelectedDeviceId}
            setSelectedParameterId={setSelectedParameterId}
            updateDevice={updateDevice}
            updateParameter={updateParameter}
            addDevice={addDevice}
            addParameter={addParameter}
          />
        )}
        {tab === 'profiles' && <ProfilesWorkspace project={project} updateProject={updateProject} addProfile={addProfile} />}
        {tab === 'faults' && <FaultsWorkspace project={project} updateProject={updateProject} addScenario={addScenario} />}
        {tab === 'runtime' && <RuntimeWorkspace snapshot={snapshot} project={project} updateProject={updateProject} />}
      </section>
      <footer>{status}</footer>
    </main>
  );
}

function DeviceWorkspace(props: {
  project: StudioProject;
  selectedDevice: StudioDeviceDefinition | undefined;
  selectedParameter: StudioParameterDefinition | undefined;
  selectedDeviceId: string;
  selectedParameterId: string;
  setSelectedDeviceId: (value: string) => void;
  setSelectedParameterId: (value: string) => void;
  updateDevice: (mutator: (device: StudioDeviceDefinition) => void) => void;
  updateParameter: (mutator: (parameter: StudioParameterDefinition) => void) => void;
  addDevice: () => void;
  addParameter: () => void;
}): JSX.Element {
  const {
    project,
    selectedDevice,
    selectedParameter,
    selectedDeviceId,
    selectedParameterId,
    setSelectedDeviceId,
    setSelectedParameterId,
    updateDevice,
    updateParameter,
    addDevice,
    addParameter
  } = props;

  return (
    <div className="editor-grid">
      <section className="pane compact-list">
        <PaneTitle icon={<Database size={18} />} title="Device Management" action="Add" onAction={addDevice} />
        {project.devices.map((device) => (
          <button
            key={device.deviceId}
            className={device.deviceId === selectedDeviceId ? 'list-row active' : 'list-row'}
            onClick={() => {
              setSelectedDeviceId(device.deviceId);
              setSelectedParameterId(device.parameters[0]?.parameterId ?? '');
            }}
          >
            <strong>{device.displayName || device.deviceId}</strong>
            <span>{device.protocol.serverId} / slave {device.protocol.slaveId ?? 1}</span>
          </button>
        ))}
      </section>

      <section className="pane form-pane">
        <PaneTitle icon={<Settings size={18} />} title="Device Details" />
        {selectedDevice && (
          <div className="form-grid">
            <TextField label="Device ID" value={selectedDevice.deviceId} onChange={(value) => {
              const nextId = slug(value);
              updateDevice((device) => { device.deviceId = nextId; });
              setSelectedDeviceId(nextId);
            }} />
            <TextField label="Display Name" value={selectedDevice.displayName ?? ''} onChange={(value) => updateDevice((device) => { device.displayName = value; })} />
            <TextField label="Device Type" value={selectedDevice.deviceType ?? ''} onChange={(value) => updateDevice((device) => { device.deviceType = slug(value); })} />
            <SelectField label="Protocol Server" value={selectedDevice.protocol.serverId} options={project.protocols.map((protocol) => protocol.id)} onChange={(value) => updateDevice((device) => { device.protocol.serverId = value; })} />
            <NumberField label="Slave ID" value={selectedDevice.protocol.slaveId ?? 1} onChange={(value) => updateDevice((device) => { device.protocol.slaveId = value; })} />
            <TextField label="Notes" value={selectedDevice.notes ?? ''} onChange={(value) => updateDevice((device) => { device.notes = value; })} />
          </div>
        )}
      </section>

      <section className="pane compact-list">
        <PaneTitle icon={<ListPlus size={18} />} title="Parameter Management" action="Add" onAction={addParameter} />
        {selectedDevice?.parameters.map((parameter) => (
          <button
            key={parameter.parameterId}
            className={parameter.parameterId === selectedParameterId ? 'list-row active' : 'list-row'}
            onClick={() => setSelectedParameterId(parameter.parameterId)}
          >
            <strong>{parameter.displayName || parameter.parameterId}</strong>
            <span>{parameter.dataType} / {parameter.mapping.registerType} @{parameter.mapping.address}</span>
          </button>
        ))}
      </section>

      <section className="pane parameter-pane">
        <PaneTitle icon={<Gauge size={18} />} title="Parameter, Mapping, Limits" />
        {selectedParameter && (
          <>
            <div className="form-grid">
              <TextField label="Parameter ID" value={selectedParameter.parameterId} onChange={(value) => {
                const nextId = slug(value);
                updateParameter((parameter) => { parameter.parameterId = nextId; });
                setSelectedParameterId(nextId);
              }} />
              <TextField label="Display Name" value={selectedParameter.displayName ?? ''} onChange={(value) => updateParameter((parameter) => { parameter.displayName = value; })} />
              <SelectField label="Datatype" value={selectedParameter.dataType} options={dataTypes} onChange={(value) => updateParameter((parameter) => { parameter.dataType = value as DataType; })} />
              <TextField label="Unit" value={selectedParameter.unit ?? ''} onChange={(value) => updateParameter((parameter) => { parameter.unit = value; })} />
              <NumberField label="Plausible Min" value={selectedParameter.plausibleMin ?? 0} onChange={(value) => updateParameter((parameter) => { parameter.plausibleMin = value; applyLimits(parameter); })} />
              <NumberField label="Plausible Max" value={selectedParameter.plausibleMax ?? 100} onChange={(value) => updateParameter((parameter) => { parameter.plausibleMax = value; applyLimits(parameter); })} />
              <SelectField label="Register Type" value={selectedParameter.mapping.registerType} options={registerTypes} onChange={(value) => updateParameter((parameter) => { parameter.mapping.registerType = value as RegisterType; })} />
              <NumberField label="Address" value={selectedParameter.mapping.address} onChange={(value) => updateParameter((parameter) => { parameter.mapping.address = value; })} />
              <SelectField label="Generator" value={selectedParameter.generator.type} options={generatorTypes} onChange={(value) => updateParameter((parameter) => { parameter.generator = createGenerator(value as GeneratorDefinition['type'], parameter); })} />
              <NumberField label="Gen Min / Value" value={generatorNumber(selectedParameter.generator, 'min')} onChange={(value) => updateParameter((parameter) => { setGeneratorNumber(parameter.generator, 'min', value); })} />
              <NumberField label="Gen Max / Offset" value={generatorNumber(selectedParameter.generator, 'max')} onChange={(value) => updateParameter((parameter) => { setGeneratorNumber(parameter.generator, 'max', value); })} />
              <NumberField label="Step / Period" value={generatorNumber(selectedParameter.generator, 'step')} onChange={(value) => updateParameter((parameter) => { setGeneratorNumber(parameter.generator, 'step', value); })} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ProfilesWorkspace(props: {
  project: StudioProject;
  updateProject: (mutator: (draft: StudioProject) => void) => void;
  addProfile: () => void;
}): JSX.Element {
  return (
    <section className="pane full">
      <PaneTitle icon={<Waves size={18} />} title="Simulation Profile UI" action="Add" onAction={props.addProfile} />
      <div className="table">
        <div className="table-head profile-grid"><span>ID</span><span>Name</span><span>Devices</span><span>Enabled</span></div>
        {props.project.profiles.map((profile, index) => (
          <div className="table-row profile-grid" key={profile.profileId}>
            <input value={profile.profileId} onChange={(event) => updateProfile(props.updateProject, index, { profileId: slug(event.target.value) })} />
            <input value={profile.displayName} onChange={(event) => updateProfile(props.updateProject, index, { displayName: event.target.value })} />
            <input value={profile.deviceIds.join(', ')} onChange={(event) => updateProfile(props.updateProject, index, { deviceIds: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} />
            <input type="checkbox" checked={profile.enabled} onChange={(event) => updateProfile(props.updateProject, index, { enabled: event.target.checked })} />
          </div>
        ))}
      </div>
    </section>
  );
}

function FaultsWorkspace(props: {
  project: StudioProject;
  updateProject: (mutator: (draft: StudioProject) => void) => void;
  addScenario: () => void;
}): JSX.Element {
  return (
    <section className="pane full">
      <PaneTitle icon={<AlertTriangle size={18} />} title="Fault Scenario UI" action="Add" onAction={props.addScenario} />
      <div className="table">
        <div className="table-head fault-grid"><span>ID</span><span>Name</span><span>Fault</span><span>Enabled</span><span>Value</span></div>
        {props.project.scenarios.map((scenario, index) => {
          const fault = scenario.faults[0] ?? { type: 'noise', enabled: true, amplitude: 1 };
          return (
            <div className="table-row fault-grid" key={scenario.scenarioId}>
              <input value={scenario.scenarioId} onChange={(event) => updateScenario(props.updateProject, index, { scenarioId: slug(event.target.value) })} />
              <input value={scenario.displayName} onChange={(event) => updateScenario(props.updateProject, index, { displayName: event.target.value })} />
              <select value={fault.type} onChange={(event) => updateScenarioFault(props.updateProject, index, { type: event.target.value as FaultDefinition['type'] })}>
                {faultTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
              <input type="checkbox" checked={scenario.enabled} onChange={(event) => updateScenario(props.updateProject, index, { enabled: event.target.checked })} />
              <input type="number" value={faultValue(fault)} onChange={(event) => updateFaultNumeric(props.updateProject, index, Number(event.target.value))} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RuntimeWorkspace(props: {
  snapshot: StudioRuntimeSnapshot | undefined;
  project: StudioProject;
  updateProject: (mutator: (draft: StudioProject) => void) => void;
}): JSX.Element {
  const snapshot = props.snapshot;
  return (
    <div className="runtime-grid">
      <section className="pane form-pane">
        <PaneTitle icon={<Settings size={18} />} title="Runtime Control Panel" />
        <div className="form-grid">
          <NumberField label="Update Interval" value={props.project.simulator.updateIntervalMs ?? 1000} onChange={(value) => props.updateProject((draft) => { draft.simulator.updateIntervalMs = value; })} />
          <NumberField label="Health Port" value={props.project.simulator.healthPort ?? 8088} onChange={(value) => props.updateProject((draft) => { draft.simulator.healthPort = value; })} />
          <TextField label="Protocol Host" value={props.project.protocols[0]?.host ?? '127.0.0.1'} onChange={(value) => props.updateProject((draft) => { if (draft.protocols[0]) draft.protocols[0].host = value; })} />
          <NumberField label="Modbus Port" value={props.project.protocols[0]?.port ?? 5020} onChange={(value) => props.updateProject((draft) => { if (draft.protocols[0]) draft.protocols[0].port = value; })} />
        </div>
      </section>
      <section className="pane table-pane">
        <PaneTitle icon={<Activity size={18} />} title="Live Value Viewer" />
        <div className="table">
          <div className="table-head value-grid"><span>Device</span><span>Parameter</span><span>Value</span><span>Quality</span><span>Timestamp</span></div>
          {(snapshot?.values ?? []).map((value) => (
            <div className="table-row value-grid" key={`${value.deviceId}:${value.parameterId}`}>
              <span>{value.deviceId}</span><span>{value.parameterId}</span><strong>{value.value}</strong><span>{value.quality}</span><span>{new Date(value.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="pane table-pane wide">
        <PaneTitle icon={<ListPlus size={18} />} title="Live Register Viewer" />
        <div className="table">
          <div className="table-head register-grid"><span>Endpoint</span><span>Slave</span><span>Register</span><span>Address</span><span>Parameter</span><span>Value</span><span>Quality</span></div>
          {(snapshot?.registers ?? []).map((row) => (
            <div className="table-row register-grid" key={`${row.serverId}:${row.slaveId}:${row.registerType}:${row.address}`}>
              <span>{row.serverId}:{row.port}</span><span>{row.slaveId}</span><span>{row.registerType}</span><span>{row.address}</span><span>{row.deviceId}.{row.parameterId}</span><strong>{row.value}</strong><span>{row.quality}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PaneTitle(props: { icon: JSX.Element; title: string; action?: string; onAction?: () => void }): JSX.Element {
  return (
    <div className="pane-title">
      <h2>{props.icon}{props.title}</h2>
      {props.action && <button onClick={props.onAction}>{props.action}</button>}
    </div>
  );
}

function Metric(props: { label: string; value: number }): JSX.Element {
  return <div className="metric"><span>{props.label}</span><strong>{props.value}</strong></div>;
}

function TextField(props: { label: string; value: string; onChange: (value: string) => void }): JSX.Element {
  return <label><span>{props.label}</span><input value={props.value} onChange={(event) => props.onChange(event.target.value)} /></label>;
}

function NumberField(props: { label: string; value: number; onChange: (value: number) => void }): JSX.Element {
  return <label><span>{props.label}</span><input type="number" value={Number.isFinite(props.value) ? props.value : 0} onChange={(event) => props.onChange(Number(event.target.value))} /></label>;
}

function SelectField(props: { label: string; value: string; options: string[]; onChange: (value: string) => void }): JSX.Element {
  return <label><span>{props.label}</span><select value={props.value} onChange={(event) => props.onChange(event.target.value)}>{props.options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function createParameter(parameterId: string, address: number): StudioParameterDefinition {
  return {
    parameterId,
    displayName: parameterId.replaceAll('-', ' '),
    dataType: 'float32',
    unit: '',
    plausibleMin: 0,
    plausibleMax: 100,
    generator: { type: 'random', min: 0, max: 100 },
    mapping: { registerType: 'holding-register', address }
  };
}

function createGenerator(type: GeneratorDefinition['type'], parameter: StudioParameterDefinition): GeneratorDefinition {
  const min = parameter.plausibleMin ?? 0;
  const max = parameter.plausibleMax ?? 100;
  switch (type) {
    case 'static':
      return { type, value: min };
    case 'linear-ramp':
      return { type, min, max, step: 1 };
    case 'sine-wave':
      return { type, amplitude: (max - min) / 2, offset: (max + min) / 2, periodSeconds: 60 };
    case 'square-wave':
      return { type, low: min, high: max, periodSeconds: 20 };
    case 'sawtooth':
      return { type, min, max, periodSeconds: 60 };
    case 'random':
      return { type, min, max };
    case 'replay':
      return { type, sourceFile: '' };
    case 'script':
      return { type, script: 'value = value', initialValue: min };
  }
}

function applyLimits(parameter: StudioParameterDefinition): void {
  if (parameter.plausibleMin === undefined || parameter.plausibleMax === undefined) {
    return;
  }
  if (parameter.generator.type === 'random' || parameter.generator.type === 'linear-ramp') {
    parameter.generator.min = parameter.plausibleMin;
    parameter.generator.max = parameter.plausibleMax;
  }
}

function generatorNumber(generator: GeneratorDefinition, slot: 'min' | 'max' | 'step'): number {
  if (generator.type === 'static') return Number(generator.value);
  if (generator.type === 'sine-wave') return slot === 'min' ? generator.amplitude : slot === 'max' ? generator.offset : generator.periodSeconds;
  if (generator.type === 'square-wave') return slot === 'min' ? generator.low ?? 0 : slot === 'max' ? generator.high ?? 1 : generator.periodSeconds ?? 20;
  if (generator.type === 'sawtooth') return slot === 'min' ? generator.min ?? 0 : slot === 'max' ? generator.max ?? 100 : generator.periodSeconds ?? 60;
  if (generator.type === 'linear-ramp') return slot === 'step' ? generator.step : slot === 'min' ? generator.min : generator.max;
  if (generator.type === 'random') return slot === 'min' ? generator.min : slot === 'max' ? generator.max : 0;
  if (generator.type === 'script') return generator.initialValue ?? 0;
  return 0;
}

function setGeneratorNumber(generator: GeneratorDefinition, slot: 'min' | 'max' | 'step', value: number): void {
  if (generator.type === 'static') generator.value = value;
  if (generator.type === 'sine-wave') {
    if (slot === 'min') generator.amplitude = value;
    if (slot === 'max') generator.offset = value;
    if (slot === 'step') generator.periodSeconds = value;
  }
  if (generator.type === 'square-wave') {
    if (slot === 'min') generator.low = value;
    if (slot === 'max') generator.high = value;
    if (slot === 'step') generator.periodSeconds = value;
  }
  if (generator.type === 'sawtooth') {
    if (slot === 'min') generator.min = value;
    if (slot === 'max') generator.max = value;
    if (slot === 'step') generator.periodSeconds = value;
  }
  if (generator.type === 'linear-ramp') {
    if (slot === 'min') generator.min = value;
    if (slot === 'max') generator.max = value;
    if (slot === 'step') generator.step = value;
  }
  if (generator.type === 'random') {
    if (slot === 'min') generator.min = value;
    if (slot === 'max') generator.max = value;
  }
  if (generator.type === 'script') generator.initialValue = value;
}

function updateProfile(updateProject: (mutator: (draft: StudioProject) => void) => void, index: number, patch: Partial<SimulationProfile>): void {
  updateProject((draft) => Object.assign(draft.profiles[index], patch));
}

function updateScenario(updateProject: (mutator: (draft: StudioProject) => void) => void, index: number, patch: Partial<FaultScenario>): void {
  updateProject((draft) => Object.assign(draft.scenarios[index], patch));
}

function updateScenarioFault(updateProject: (mutator: (draft: StudioProject) => void) => void, index: number, patch: Partial<FaultDefinition>): void {
  updateProject((draft) => {
    const fault = draft.scenarios[index]?.faults[0];
    if (fault) {
      Object.assign(fault, patch);
    }
  });
}

function updateFaultNumeric(updateProject: (mutator: (draft: StudioProject) => void) => void, index: number, value: number): void {
  updateProject((draft) => {
    const fault = draft.scenarios[index]?.faults[0];
    if (!fault) return;
    if (fault.type === 'drift') fault.ratePerTick = value;
    if (fault.type === 'spike') fault.value = value;
    if (fault.type === 'noise') fault.amplitude = value;
  });
}

function faultValue(fault: FaultDefinition): number {
  if (fault.type === 'drift') return fault.ratePerTick ?? 0;
  if (fault.type === 'spike') return fault.value ?? 0;
  if (fault.type === 'noise') return fault.amplitude ?? 0;
  return 0;
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed';
}
