# Architecture

The simulator is organized around a protocol-independent runtime model:

1. Configuration loader parses JSON/YAML and validates schema plus semantic rules.
2. Device registry owns configured device definitions.
3. Parameter registry owns configured parameter definitions and latest runtime values.
4. Simulation engine generates truth values on a tick.
5. Fault engine transforms generated values into abnormal conditions.
6. Protocol servers expose the final values through industrial protocols.

Core simulation packages do not import protocol implementations. Protocol plugins depend on the parameter registry and domain interfaces only.

Runtime flow:

```text
Configuration Loader -> Device Registry -> Parameter Registry -> Simulation Engine -> Fault Engine -> Protocol Server
```

## Extension Points

- Add protocols by implementing `ProtocolPlugin` and `ProtocolServer`.
- Add generators by implementing `SimulationGenerator` and extending the generator factory.
- Add faults by extending `FaultEngine`.
- Add device types by configuration only.
- The preferred next protocol target is NMEA0183 because it exercises a serial/text-stream endpoint model distinct from Modbus registers.
