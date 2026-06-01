# Deployment

Run with Node 22+:

```bash
industrial-simulator --config /etc/industrial-simulator/devices.yaml
```

Recommended container deployment:

- Mount configuration as a read-only volume.
- Expose only configured protocol ports.
- Run as a non-root user.
- Use `SIGTERM` for graceful shutdown.
- Use `/health` and `/stats` only on loopback or trusted networks.
