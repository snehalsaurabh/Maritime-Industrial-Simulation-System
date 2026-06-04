# Protocols

## Modbus TCP V1

Supported function codes:

- `0x01`: read coils
- `0x02`: read discrete inputs
- `0x03`: read holding registers
- `0x04`: read input registers

Writes are not enabled in v1. Unknown functions return Modbus exception `0x01`.

Unmapped addresses return exception `0x02`. Offline and timeout faults return exception `0x0B`.

## Future Protocols

Future protocols should be implemented as plugins under `src/protocols/<protocol-name>` and should not modify simulation engine internals.

NMEA0183 is the preferred next target after the runtime refactor. It should consume the same protocol-facing values as Modbus TCP, but expose them as real serial or TCP text sentences instead of register maps.
