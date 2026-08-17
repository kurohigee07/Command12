---
name: Imported pipeline archives
description: How to handle dashboard archives whose visible pipeline is only a client-side simulation.
---

An imported dashboard archive can contain the full command-console UI, generated API clients, and telemetry database schema while still omitting the actual Scout, Council, Dispatch, and cron implementation. A staged-looking UI is not evidence that the operational pipeline exists.

**Why:** Triggering a simulated pipeline or reporting success when the stage logic is absent would create a false operational signal.

**How to apply:** Before wiring manual or scheduled controls, search the archive for the real stage handlers and cron route. If they are absent, keep the trigger accepted-but-observable, log the unavailable stage explicitly, and ask for the prior stage implementation or provider contracts.