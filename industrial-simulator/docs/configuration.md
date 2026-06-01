# Configuration

Configuration may be JSON, YAML, or YML. The schema lives at `config/schemas/simulator.schema.json`.

Top-level sections:

- `simulator`: runtime options such as update interval, hot reload, script policy, and health port.
- `protocols`: protocol server instances.
- `devices`: configured industrial devices and their parameters.

Register mappings are always explicit. No Modbus address is hardcoded in source code.

Script generators are disabled by default and only support arithmetic assignments to `value`, for example:

```yaml
generator:
  type: script
  initialValue: 0
  script: value = value + 5
```
