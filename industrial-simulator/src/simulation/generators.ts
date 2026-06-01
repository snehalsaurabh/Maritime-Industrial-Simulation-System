import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  GeneratorDefinition,
  ParameterPrimitive,
  ReplayGeneratorDefinition,
  ScriptGeneratorDefinition
} from '../domain/types.js';

export interface GeneratorContext {
  now: Date;
  tick: number;
  elapsedSeconds: number;
  previousValue?: ParameterPrimitive;
}

export interface SimulationGenerator {
  next(context: GeneratorContext): ParameterPrimitive;
}

export function createGenerator(
  definition: GeneratorDefinition,
  options: { configDir: string; scriptGeneratorsEnabled: boolean }
): SimulationGenerator {
  switch (definition.type) {
    case 'static':
      return { next: () => definition.value };
    case 'random':
      return { next: () => definition.min + Math.random() * (definition.max - definition.min) };
    case 'linear-ramp':
      return new LinearRampGenerator(definition.min, definition.max, definition.step);
    case 'sine-wave':
      return {
        next: (context) =>
          definition.offset +
          definition.amplitude *
            Math.sin((2 * Math.PI * context.elapsedSeconds) / definition.periodSeconds)
      };
    case 'sawtooth':
      return new SawtoothGenerator(definition.min ?? 0, definition.max ?? 100, definition.periodSeconds ?? 60);
    case 'square-wave':
      return new SquareWaveGenerator(definition.low ?? 0, definition.high ?? 1, definition.periodSeconds ?? 60);
    case 'replay':
      return new ReplayGenerator(definition, options.configDir);
    case 'script':
      if (!options.scriptGeneratorsEnabled) {
        throw new Error('Script generators are disabled. Set simulator.scriptGeneratorsEnabled=true.');
      }
      return new ScriptGenerator(definition);
  }
}

class LinearRampGenerator implements SimulationGenerator {
  private current: number;
  private direction = 1;

  constructor(
    private readonly min: number,
    private readonly max: number,
    private readonly step: number
  ) {
    this.current = min;
  }

  next(): ParameterPrimitive {
    const value = this.current;
    this.current += this.step * this.direction;
    if (this.current >= this.max || this.current <= this.min) {
      this.current = Math.max(this.min, Math.min(this.max, this.current));
      this.direction *= -1;
    }
    return value;
  }
}

class SawtoothGenerator implements SimulationGenerator {
  constructor(
    private readonly min: number,
    private readonly max: number,
    private readonly periodSeconds: number
  ) {}

  next(context: GeneratorContext): ParameterPrimitive {
    const phase = (context.elapsedSeconds % this.periodSeconds) / this.periodSeconds;
    return this.min + phase * (this.max - this.min);
  }
}

class SquareWaveGenerator implements SimulationGenerator {
  constructor(
    private readonly low: number,
    private readonly high: number,
    private readonly periodSeconds: number
  ) {}

  next(context: GeneratorContext): ParameterPrimitive {
    const phase = (context.elapsedSeconds % this.periodSeconds) / this.periodSeconds;
    return phase < 0.5 ? this.low : this.high;
  }
}

class ReplayGenerator implements SimulationGenerator {
  private readonly values: ParameterPrimitive[];
  private index = 0;

  constructor(definition: ReplayGeneratorDefinition, configDir: string) {
    const filePath = resolve(configDir, definition.sourceFile);
    const raw = readFileSync(filePath, 'utf8');
    const rows = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (rows.length === 0) {
      throw new Error(`Replay source is empty: ${filePath}`);
    }
    const headers = rows[0].split(',').map((header) => header.trim());
    const column = definition.parameterColumn ?? headers.find((header) => header !== definition.timestampColumn) ?? headers[0];
    const columnIndex = headers.indexOf(column);
    if (columnIndex < 0) {
      throw new Error(`Replay column ${column} not found in ${filePath}`);
    }
    this.values = rows.slice(1).map((row) => parseReplayValue(row.split(',')[columnIndex]));
    if (this.values.length === 0) {
      throw new Error(`Replay source has no data rows: ${filePath}`);
    }
  }

  next(): ParameterPrimitive {
    const value = this.values[this.index];
    this.index = (this.index + 1) % this.values.length;
    return value;
  }
}

class ScriptGenerator implements SimulationGenerator {
  private value: number;

  constructor(private readonly definition: ScriptGeneratorDefinition) {
    this.value = definition.initialValue ?? 0;
    if (!/^[a-zA-Z0-9_+\-*/().\s=]+$/.test(definition.script)) {
      throw new Error('Script generator only allows arithmetic assignment expressions.');
    }
    if (!definition.script.trim().startsWith('value')) {
      throw new Error('Script generator must assign to value, for example: value = value + 5');
    }
  }

  next(): ParameterPrimitive {
    const expression = this.definition.script.split('=').slice(1).join('=').trim();
    const sanitized = expression.replace(/\bvalue\b/g, String(this.value));
    // The expression was reduced to numbers and arithmetic operators by constructor validation.
    const result = Function(`"use strict"; return (${sanitized});`)() as unknown;
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Script generator produced a non-finite number.');
    }
    this.value = result;
    return this.value;
  }
}

function parseReplayValue(raw: string | undefined): ParameterPrimitive {
  const value = raw?.trim() ?? '';
  if (value.toLowerCase() === 'true') {
    return true;
  }
  if (value.toLowerCase() === 'false') {
    return false;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}
