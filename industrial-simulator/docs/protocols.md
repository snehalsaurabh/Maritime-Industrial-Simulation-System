# Protocols

## Modbus TCP V1

Supported function codes:

- `0x01`: read coils
- `0x02`: read discrete inputs
- `0x03`: read holding registers
- `0x04`: read input registers

Writes are not enabled in v1. Unknown functions return Modbus exception `0x01`.

Unmapped addresses return exception `0x02`. Offline and timeout faults return exception `0x0B`.

## NMEA0183 TCP

NMEA0183 is implemented as a plugin under `src/protocols/nmea0183`. It consumes the same simulated parameter values as Modbus TCP, but emits `$GPGGA`, `$GPRMC`, and `$GPGSV` sentences over a TCP text stream.

- Default Studio server: `nmea-gps` on `127.0.0.1:10110`
- Example config: `config/examples/nmea-gps.yaml`
- GSV sentences are split automatically when more than four satellites are active

## Future Protocols

Additional protocols should be implemented as plugins under `src/protocols/<protocol-name>` and should not modify simulation engine internals.
