import { describe, expect, it } from '@jest/globals';
import { compileSimulatorConfig, createDefaultStudioProject } from '../../src/studio/shared/studio-types.js';

describe('compileSimulatorConfig', () => {
  it('includes active fault scenarios in the compiled device definition', () => {
    const project = createDefaultStudioProject();
    
    // Add an active/enabled fault scenario
    project.scenarios = [
      {
        scenarioId: 'active-noise-scenario',
        displayName: 'Active Noise Scenario',
        enabled: true,
        faults: [
          { type: 'noise', enabled: true, amplitude: 5.5 }
        ]
      },
      {
        scenarioId: 'disabled-spike-scenario',
        displayName: 'Disabled Spike Scenario',
        enabled: false,
        faults: [
          { type: 'spike', enabled: true, value: 100 }
        ]
      }
    ];

    const config = compileSimulatorConfig(project);

    expect(config.devices[0].faults).toBeDefined();
    expect(config.devices[0].faults).toHaveLength(1);
    expect(config.devices[0].faults![0]).toEqual({
      type: 'noise',
      enabled: true,
      amplitude: 5.5
    });
  });
});
