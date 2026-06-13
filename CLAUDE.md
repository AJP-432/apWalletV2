# CLAUDE.md

Claude Code: the canonical engineering instructions for this repository live in
**[`AGENTS.md`](./AGENTS.md)**. Read and follow it in full before acting.

@AGENTS.md

## Claude-specific reminders

- Follow the **Verify Before Committing Loop** in `AGENTS.md` §2.C: write the
  test, run `npm run test:unit -- --run <file>`, confirm it passes, *then*
  propose an atomic conventional commit.
- One logical change per commit. Do not batch unrelated edits.
- Define TypeScript types first, tests second, implementation third
  (`AGENTS.md` §4).
- Treat the Ledger device as the final, non-removable confirmation gate.
- North-star reference material (Ledger signers/CLI/DMK, ENSIP-25/26, prizes)
  is under [`docs/`](./docs/).
