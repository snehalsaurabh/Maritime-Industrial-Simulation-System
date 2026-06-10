# Device Definition Studio — User Guide

Device Definition Studio is the visual editor for the Industrial Simulator. Use it to define devices, parameters, protocol bindings, and simulation behavior without hand-editing YAML.

Your work is saved to `.studio-data/studio-project.json` in the project folder. When you start the simulator, Studio exports a runtime YAML file to `.studio-data/runtime-config.yaml`.

---

## Launching Studio

| Command | Purpose |
|---------|---------|
| `npm run studio` | Build the app and open the Electron desktop window (production-style) |
| `npm run studio:dev` | Hot-reload development mode with Vite and live TypeScript rebuild |

Use **studio** for day-to-day work. Use **studio:dev** when changing Studio UI code.

---

## Main window layout

### Header actions

| Button | What it does |
|--------|----------------|
| **Save** | Writes the current project to `.studio-data/studio-project.json` |
| **Export** | Compiles and validates the project, then writes `.studio-data/runtime-config.yaml` without starting the simulator |
| **Start** | Saves, exports, and starts the simulator using the exported config |
| **Stop** | Stops the running simulator |

Always **Save** before closing Studio if you want changes to persist. **Start** also saves automatically.

### Status strip

| Field | Meaning |
|-------|---------|
| **Devices** | Number of device definitions |
| **Parameters** | Total parameters across all devices |
| **Ticks** | Simulation engine tick count (updates while running) |
| **Protocol Requests** | Modbus reads and NMEA client writes served |
| **Running / Stopped** | Whether the simulator is active |

### Left navigation

| Tab | Purpose |
|-----|---------|
| **Devices** | Create and edit devices, parameters, and protocol bindings |
| **Profiles** | Organize device groups for future profile-based operation (metadata today) |
| **Faults** | Define named fault scenarios (metadata today) |
| **Runtime** | Simulator settings and live data viewers |

---

## Devices tab

The Devices tab uses four panels:

1. **Device Management** — list of devices
2. **Device Details** — identity and protocol settings for the selected device
3. **Parameter Management** — parameters for the selected device
4. **Parameter, Mapping, Limits** — generator and limit settings for the selected parameter

### Adding a Modbus device

1. Open the **Devices** tab.
2. In **Device Management**, click **Modbus**.
3. A new device appears with one default parameter mapped to a holding register.
4. Edit **Device ID**, **Display Name**, and **Device Type** in **Device Details**.
5. Set **Protocol Server** to `modbus-main`.
6. Set **Slave ID** (1–247) for Modbus addressing.

### Adding parameters (Modbus only)

1. Select a Modbus device.
2. Click **Add** in **Parameter Management**.
3. Configure the parameter in the right-hand panel:
   - **Datatype** — value type (float32, int16, etc.)
   - **Register Type** — holding/input register, coil, or discrete input
   - **Address** — Modbus address
   - **Generator** — how values change over time
   - **Plausible Min / Max** — bounds used by generators

### Removing devices and parameters

- Click the trash icon on a device row to remove it (at least one device must remain).
- Click the trash icon on a parameter row to remove it (Modbus devices must keep at least one parameter).
- NMEA devices cannot remove individual parameters because sentence fields are fixed.

### Adding an NMEA GPS device

1. Click **NMEA GPS** in **Device Management**.
2. Studio creates a GPS device bound to the `nmea-gps` server with all required sentence fields pre-loaded:
   - **GGA** — position fix and altitude
   - **RMC** — position, speed, course, date/time
   - **GSV** — satellites in view (up to 8 slots; multiple sentences emitted automatically)
3. Set **Talker ID** (GP, GN, or GL) in **Device Details**.
4. You cannot add custom parameters to NMEA devices. Each field maps to part of a standard sentence.

### Switching protocol on an existing device

Change **Protocol Server** in **Device Details**:

| Server | Result |
|--------|--------|
| `modbus-main` | Device becomes Modbus TCP with editable register parameters |
| `nmea-gps` | Device becomes NMEA with the fixed GGA/RMC/GSV parameter set |

Switching replaces parameters with the template for the target protocol.

---

## Generators (all device types)

| Generator | Behavior |
|-----------|----------|
| **static** | Fixed value |
| **random** | Random value between min and max each tick |
| **linear-ramp** | Increases by step until max, then wraps to min |
| **sine-wave** | Oscillates using amplitude, offset, and period |
| **square-wave** | Alternates between low and high |
| **sawtooth** | Ramps between min and max over a period |

Use **Plausible Min / Max** to keep generated values in a realistic range.

---

## Profiles tab

Profiles group devices under named operating modes.

| Column | Purpose |
|--------|---------|
| **ID** | Unique profile identifier |
| **Name** | Display name |
| **Devices** | Comma-separated device IDs included in the profile |
| **Enabled** | Whether the profile is marked active in Studio |

**Note:** Profiles are stored in the Studio project but are not yet applied by the simulator runtime. They are planning metadata for future profile-driven simulation.

---

## Faults tab

Fault scenarios describe error conditions you may enable later.

| Column | Purpose |
|--------|---------|
| **ID** | Scenario identifier |
| **Name** | Display name |
| **Fault** | Fault type (freeze, timeout, drift, spike, noise, offline) |
| **Enabled** | Whether the scenario is active in Studio |
| **Value** | Numeric tuning for drift, spike, or noise faults |

**Note:** Like profiles, fault scenarios are Studio metadata today and are not exported into the runtime YAML yet.

---

## Runtime tab

### Runtime Control Panel

| Setting | Purpose |
|---------|---------|
| **Update Interval** | Milliseconds between simulation ticks |
| **Health Port** | HTTP port for `/health` and `/stats` endpoints |
| **Modbus Host / Port** | Where the Modbus TCP server listens (default `127.0.0.1:5020`) |
| **NMEA Host / Port** | Where the NMEA TCP stream listens (default `127.0.0.1:10110`) |

### Live Value Viewer

Shows every simulated parameter value: device, parameter ID, current value, quality, and timestamp. Updates every second while Studio is open.

### Live Register Viewer

Shows Modbus register mappings and live values. Only Modbus parameters appear here.

### Live NMEA Sentence Viewer

Shows the most recently emitted NMEA sentences per device while the simulator is running. Connect an external TCP client to the NMEA port to receive the same lines.

---

## End-to-end workflows

### Modbus engine device

1. **Devices** → select **Main Engine 01** (or add a Modbus device).
2. Configure RPM or other parameters with register addresses.
3. Click **Save**.
4. Click **Start**.
5. Open **Runtime** → **Live Register Viewer** to confirm values.
6. Read registers from `127.0.0.1:5020` with any Modbus TCP client.

### NMEA GPS device

1. **Devices** → click **NMEA GPS**.
2. Adjust latitude, speed, or satellite SNR generators as needed.
3. Click **Save**, then **Start**.
4. Open **Runtime** → **Live NMEA Sentence Viewer**.
5. Connect to `127.0.0.1:10110` with a TCP client (PuTTY raw mode, `nc`, or a test harness) to read `$GPGGA`, `$GPRMC`, and `$GPGSV` lines.

### Export without running

1. Configure your project.
2. Click **Export**.
3. Use `.studio-data/runtime-config.yaml` with the CLI:  
   `node dist/cli/index.js --config .studio-data/runtime-config.yaml`

---

## NMEA appendix

NMEA-0183 sentences are comma-separated ASCII lines:

```
$TTXXX,field1,field2,...*CS
```

| Part | Meaning |
|------|---------|
| `$` | Start delimiter |
| `TT` | Talker ID (GP = GPS) |
| `XXX` | Sentence type |
| `*CS` | XOR checksum (hex) |

### GGA — GPS fix data

Provides time, position, fix quality, satellite count, HDOP, and altitude.

Key simulated fields: `gga.utcTime`, `gga.latitude`, `gga.longitude`, `gga.fixQuality`, `gga.satellitesUsed`, `gga.hdop`, `gga.altitude`.

Latitude and longitude are stored as **decimal degrees** in Studio. The simulator formats them as `DDMM.MMMM` with hemisphere letters when building the sentence.

### RMC — Recommended minimum navigation

Provides time, date, position, speed, course, and magnetic variation.

Key simulated fields: `rmc.utcTime`, `rmc.latitude`, `rmc.longitude`, `rmc.speedKnots`, `rmc.courseOverGround`, `rmc.date`, `rmc.status`.

### GSV — Satellites in view

Each satellite uses four fields: PRN, elevation, azimuth, SNR. Studio provides eight satellite slots (`gsv.sat1` … `gsv.sat8`). Slots with `prn = 0` are omitted.

When more than four satellites are active, the simulator emits **multiple GSV sentences** (up to four satellites per line), matching real receiver behavior.

### Typical combined use

| Sentence | Answers |
|----------|---------|
| **RMC** | Where am I, how fast, and in what direction? |
| **GGA** | How accurate is my position and altitude? |
| **GSV** | Which satellites are visible and how strong are they? |

---

## Tips

- Scroll device and parameter lists when you have many entries; each row is equal height.
- After switching a device to NMEA, tune generators rather than adding new parameters.
- If the simulator fails to start, check the footer status message and run `npm run validate-config` from the project root.
- See also: [protocols.md](./protocols.md) for protocol-level details.
