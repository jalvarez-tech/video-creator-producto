@AGENTS.md

<!-- Lo de abajo solo lo lee Claude Code; Codex lee AGENTS.md directamente. -->

- **Windows sin Git Bash:** trabajas con la herramienta PowerShell (pwsh 7 si existe; si no, Windows PowerShell 5.1), sin perfil y sin sandbox. Vale lo de AGENTS.md §7: un comando por línea, sin `&&` ni sintaxis de bash; `node …` y `uv run …` van igual; si `npm` o `npx` fallan por la política de ejecución, usa `npm.cmd` y `npx.cmd`.
- **Permisos:** `.claude/settings.json` te niega `Read` sobre `.env` y `.env.*` a propósito (AGENTS.md §6): no es un fallo que haya que sortear. Para saber qué claves hay, `node herramientas/doctor.mjs --json` (solo nombres, nunca valores). Tus notas locales van en `CLAUDE.local.md`, que no se versiona.
