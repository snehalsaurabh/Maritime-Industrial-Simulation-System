# Architecture

The simulator is organized around a protocol-independent runtime model:

1. Configuration loader parses JSON/YAML and validates schema plus semantic rules.
2. Device registry owns configured device definitions.
3. Simulation engine updates parameter values on a tick.
4. Fault engine transforms generated values into abnormal conditions.
5. Parameter store exposes the latest values to protocol plugins.
6. Protocol servers expose those values through industrial protocols.

Core simulation packages do not import protocol implementations. Protocol plugins depend on the parameter store and domain interfaces only.

## Extension Points

- Add protocols by implementing `ProtocolPlugin` and `ProtocolServer`.
- Add generators by implementing `SimulationGenerator` and extending the generator factory.
- Add faults by extending `FaultEngine`.
- Add device types by configuration only.
