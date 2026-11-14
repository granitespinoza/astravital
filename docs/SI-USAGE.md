# Use of Super Intelligence (SI)

[Evidence] The team defined the ASTRAVITAL concept and selected the dashboard and resting heart rate workflow. The [system concept](CONCEPTO-SISTEMA.md), [requirements](REQUISITOS-MVP.md), and [handoff](RELEVO-CLAUDE.md) record the scope and earlier work.

## AI-assisted contributions

| Tool | Contribution | Where to inspect it |
| --- | --- | --- |
| OpenAI Codex | Implementation and review of the browser interface, local rules, persistence, offline assets and development server | [Application source](../app/) and [local server](../scripts/serve.mjs) |
| OpenAI Codex | Code for generating synthetic scenarios and code for verifying rule behavior and the offline workflow | [Scenario generator](../app/scenarios.js), [data description](../data/README.md) and [tests](../tests/) |
| OpenAI Codex | Drafting and reviewing the instructions, results and AI disclosure accompanying this implementation | [Project README](../README.md) and [results](RESULTADOS.md) |
| Anthropic Claude and OpenAI Codex | Earlier assistance with the concept documentation, source checks and project requirements | [Reference audit](AUDITORIA-REFERENCIAS.md) and [handoff](RELEVO-CLAUDE.md) |

[Simulation] All dashboard inputs are synthetic. Codex assisted with the generator and scenario parameters. The application generates readings with a fixed-seed algorithm and labels them as simulated. See [data origin and assumptions](../data/README.md).

[Evidence] The decision engine executes versioned rules in the browser with no model inference or AI service at runtime. The interface uses HTML, CSS, and a chart drawn from the simulated readings.
