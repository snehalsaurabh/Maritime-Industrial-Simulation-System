import type { FaultDefinition, ParameterPrimitive, ParameterValue } from '../domain/types.js';

export class FaultEngine {
  private readonly frozenValues = new Map<string, ParameterPrimitive>();
  private readonly driftOffsets = new Map<string, number>();

  apply(
    key: string,
    baseValue: ParameterPrimitive,
    value: Omit<ParameterValue, 'value' | 'quality'>,
    faults: FaultDefinition[] = []
  ): ParameterValue {
    let nextValue = baseValue;
    let quality: ParameterValue['quality'] = 'good';

    for (const fault of faults.filter((candidate) => candidate.enabled !== false)) {
      switch (fault.type) {
        case 'offline':
          return { ...value, value: nextValue, quality: 'offline' };
        case 'timeout':
          return { ...value, value: nextValue, quality: 'timeout' };
        case 'freeze':
          if (!this.frozenValues.has(key)) {
            this.frozenValues.set(key, nextValue);
          }
          nextValue = this.frozenValues.get(key) ?? nextValue;
          quality = 'frozen';
          break;
        case 'drift':
          if (typeof nextValue === 'number') {
            const offset = (this.driftOffsets.get(key) ?? 0) + (fault.ratePerTick ?? 0.1);
            this.driftOffsets.set(key, offset);
            nextValue += offset;
            quality = 'faulted';
          }
          break;
        case 'spike':
          if (typeof nextValue === 'number' && Math.random() <= (fault.probability ?? 0.05)) {
            nextValue = fault.value ?? nextValue * 2;
            quality = 'faulted';
          }
          break;
        case 'noise':
          if (typeof nextValue === 'number') {
            const amplitude = fault.amplitude ?? 1;
            nextValue += (Math.random() * 2 - 1) * amplitude;
            quality = 'faulted';
          }
          break;
      }
    }

    return { ...value, value: nextValue, quality };
  }
}
