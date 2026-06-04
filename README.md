## Disclaimer: 
This repository is an independent project. It does not contain proprietary information, intellectual property, confidential materials, or code from any employer or client. Any resemblance to real-world systems is purely for simulation and educational purposes. No IP was harmed in the making of this project.

The implementation is based solely on publicly available information and original work.

# Industrial Simulator

Configuration-driven industrial device simulator for development, QA, protocol validation, adapter validation, load testing, demonstrations, and digital twin scenarios.

The simulator is domain-agnostic. Devices, parameters, generators, faults, and protocol mappings are defined through configuration.

## Quick Start

```bash
npm install
npm run build
npm start
```

Validate configuration without starting protocol servers:

```bash
npm run validate-config
```

Run from source:

```bash
npm run dev
```

## V1 Capabilities

- JSON and YAML configuration.
- Device and parameter registries.
- Simulation models: static, random, linear ramp, sine wave, sawtooth, square wave, replay, and opt-in sandboxed arithmetic scripts.
- Faults: freeze, timeout, drift, spike, noise, and offline.
- Modbus TCP protocol plugin with holding registers, input registers, coils, discrete inputs, multiple slave IDs, and configurable port.
- Local health endpoints when `simulator.healthPort` is configured: `/health` and `/stats`.

## Boundary

This repository intentionally does not contain ingestion services, adapters, MQTT publishing logic, cloud integrations, or database integrations. The simulator behaves like an industrial endpoint and stops at protocol communication.
