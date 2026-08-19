# Maru Tauri Projects (Desktop Monorepo)

A Cargo & pnpm workspace monorepo for all Maru desktop applications powered by Tauri 2.

## Apps

- **`apps/nami-agent`**: Nami Agent Desktop — Native desktop shell with local AI agent, filesystem bridges, and applet hosts.
- **`apps/files-companion`**: Files Companion — Desktop companion for the Maru Files applet.

## Shared Packages & Crates

- **`crates/maru-core`**: Shared Rust utilities, encryption, and API relays.
- **`packages/ui`**: Shared React components (`@maru/ui`).
- **`packages/theme`**: Shared design tokens and theme styling (`@maru/theme`).

## Development

```bash
# Install dependencies
pnpm install

# Run Nami Agent desktop in dev mode
pnpm dev:nami

# Run Files Companion in dev mode
pnpm dev:files
```

## Release Tags

- Nami Agent Desktop: `nami-agent/vX.Y.Z`
- Files Companion: `files-companion/vX.Y.Z`
