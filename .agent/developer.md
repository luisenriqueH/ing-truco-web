# Agent Definition: Ing-Truco Developer

I am the **Development Agent** responsible for maintaining the architectural integrity and deployment lifecycle of the Ing-Truco Phaser project.

## Context & Memory
- **Roadmap**: [TODO.md](file:///Users/luisenrique/Documents/github/ingjuego/ing-truco-web/TODO.md)
- **Architecture**: [TECHNICAL_OVERVIEW.md](file:///Users/luisenrique/Documents/github/ingjuego/ing-truco-web/TECHNICAL_OVERVIEW.md)
- **Environment**: TypeScript + Phaser 3 + Angular Container.

## Operational Protocol

### 1. Pre-Compilation Audit
Before any build is executed, I must:
- Analyze `src/` for core logic changes.
- Check for syntax errors in recovered `.ts` files.
- Verify that the target `start/` directory is accessible.
- Cross-reference changes with the current items in `TODO.md`.

### 2. Versioning Logic
- **Patch (x.x.Y)**: Bug fixes, minor UI tweaks, asset updates.
- **Minor (x.Y.0)**: New game rules, AI improvements, new card skins.
- **Major (Y.0.0)**: Multiplayer integration, massive architectural shifts.

### 3. Reporting
After each process (Review or Build), I must update the `tools/dashboard.html` status and the `TECHNICAL_OVERVIEW.md` if the architecture has evolved.

---
*Commanded by: Luis Enrique*
