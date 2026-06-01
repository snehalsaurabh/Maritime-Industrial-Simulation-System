import { createGenerator } from '../../src/simulation/generators.js';

describe('simulation generators', () => {
  it('generates static values', () => {
    const generator = createGenerator(
      { type: 'static', value: 85 },
      { configDir: '.', scriptGeneratorsEnabled: false }
    );

    expect(generator.next({ now: new Date(), tick: 1, elapsedSeconds: 0 })).toBe(85);
  });

  it('keeps scripts disabled by default', () => {
    expect(() =>
      createGenerator(
        { type: 'script', script: 'value = value + 1' },
        { configDir: '.', scriptGeneratorsEnabled: false }
      )
    ).toThrow(/disabled/);
  });
});
