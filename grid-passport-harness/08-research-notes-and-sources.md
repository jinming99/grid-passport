# 08 — Research Notes and Sources

This file is for grounding, not for stage narration.

Use these sources to justify the wedge, the workflow design, and the infrastructure choices.

---

## 1) Why the market exists now

### U.S. data-center electricity demand is rising fast
- **DOE / LBNL**: data centers consumed about **4.4%** of U.S. electricity in **2023** and are projected to reach **6.7% to 12% by 2028**.  
  Source: https://www.energy.gov/articles/doe-releases-new-report-evaluating-increase-electricity-demand-data-centers

- **DOE demand-growth hub** repeats the same topline and frames rising electricity demand as being driven in part by data-center expansion and AI.  
  Source: https://www.energy.gov/policy/electricity-demand-growth-resource-hub

### Global demand is also accelerating
- **IEA (Energy and AI)**: global data-center electricity consumption is projected to **double** to around **945 TWh by 2030**, with the U.S. accounting for a very large share of the increase.  
  Sources:  
  https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai  
  https://www.iea.org/reports/energy-and-ai/executive-summary

- **IEA press release (Apr. 16, 2026)**: data-center electricity use surged in 2025, with tightening bottlenecks around chips, transformers, and grid connection.  
  Source: https://www.iea.org/news/data-centre-electricity-use-surged-in-2025-even-with-tightening-bottlenecks-driving-a-scramble-for-solutions

### The market is not just power; it is time to power
- **RMI (Apr. 14, 2026)**: large loads are triggering more network upgrades, and a piecemeal interconnection process is inefficient and costly.  
  Source: https://rmi.org/large-loads-and-network-upgrades/

---

## 2) Why Virginia / Dominion is the right demo wedge

### Dominion already asks for the kinds of inputs your product wants
- Dominion’s **Facility Interconnection Requirements** ask for many large-load/data-center details including:
  - total rated load
  - load percentages by stage
  - ramp / reconnection behavior
  - backup generator / BESS details
  - whether backup systems can participate in demand-side management
  - islanding capability
  - share of server load that can be redistributed to redundant global sites
  - expected redistribution timing  
  Source: https://www.dominionenergy.com/-/media/content/large-business-services/pdfs/virginia/facility-interconnection-requirements.pdf

### Dominion already has a portal / formalized intake process
- Dominion’s Virginia data-center request page references the **Data Center Portal** for new load letters.  
  Source: https://www.dominionenergy.com/en/Virginia/Large-Business-Services/Data-Center-Requests

### Dominion explicitly relies on confidential customer information in forecasting
- Dominion’s January 2026 PJM forecast support document says the forecast uses contracts in hand plus **public and confidential customer information**.  
  Source: https://www.pjm.com/-/media/DotCom/planning/res-adeq/load-forecast/dominion-documentation.pdf

### Dominion’s contracted capacity vs forecasted demand gap illustrates the planning problem
- Dominion’s filings and related materials show a large gap between contracted/requested capacity and forecasted actual demand, reinforcing that **requested MW is not the same as expected realized load**.  
  Sources:  
  https://www.pjm.com/-/media/DotCom/planning/res-adeq/load-forecast/dominion-documentation.pdf  
  https://www.in.gov/iurc/files/1.-Data-Center-Forecasting.pdf

### Virginia regulators are actively tightening rules around large loads
- **Virginia SCC fact sheet (Feb. 2026)** highlights protections including:
  - at least **85%** of transmission and distribution charges paid regardless of usage
  - collateral obligation up to **60%** of minimum contract charges
  - SCC review of Dominion’s interconnection process for data centers  
  Source: https://www.scc.virginia.gov/media/sccvirginiagov-home/about-the-scc/fact-sheets/scc-data-center-initiatives-02-2026.pdf

- **SCC news release (Nov. 2025)** approved creation of a new large-user rate class for the biggest electricity users, including data centers.  
  Source: https://www.scc.virginia.gov/about-the-scc/newsreleases/release/scc-issues-order-on-dev-biennial-review-2025/scc-rules-in-dev-biennial-review-case.html

### Public Virginia permit data is available for demo realism
- Virginia DEQ maintains a page for **issued air permits for data centers** and related guidance.  
  Source: https://www.deq.virginia.gov/news-info/shortcuts/permits/air/issued-air-permits-for-data-centers

- Virginia DEQ main site and GIS/document resources can support the public-evidence layer.  
  Source: https://www.deq.virginia.gov/

---

## 3) Why the workflow should start with planning, not live control

### Operators trust AI more for analysis than direct control
- **Uptime Institute Global Data Center Survey 2025** says most operators are comfortable with AI for analyzing sensor data and predictive maintenance, but not for configuration changes or controlling equipment.  
  Sources:  
  https://uptimeinstitute.com/resources/research-and-reports/uptime-institute-global-data-center-survey-results-2025  
  https://intelligence.uptimeinstitute.com/resource/uptime-institute-global-data-center-survey-2025

Interpretation: a planning-and-proof product fits the trust envelope better than a control-plane product.

---

## 4) Why flexibility is still the right roadmap

### Google is already doing demand response with data centers
- **Google (Mar. 19, 2026)** says it has signed **1 GW** of data-center demand response with utility partners.  
  Source: https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/demand-response-data-center-milestone/

- **Google (Aug. 4, 2025)** says incorporating ML workloads is an important step toward larger-scale demand flexibility and grid benefits.  
  Source: https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/how-were-making-data-centers-more-flexible-to-benefit-power-grids/

### Flexibility frameworks are being standardized
- **EPRI DCFlex** says it now has **nine active demonstration sites** testing how data centers can flex in real time to support grid reliability and faster interconnections.  
  Source: https://dcflex.epri.com/

- **Flex MOSAIC** is aimed at standardizing flexibility classes and reducing time to power.  
  Sources:  
  https://dcflex.epri.com/flex-mosaic  
  https://www.publicpower.org/periodical/article/epri-launches-framework-reduce-time-power-data-centers

### Real commercial demonstrations are emerging
- **Emerald AI / NVIDIA** announced a flexible AI-factory approach and a **96 MW** Aurora facility in Manassas, Virginia.  
  Sources:  
  https://www.emeraldai.co/blog/launching-the-first-power-flexible-ai-factory-with-nvidia  
  https://www.datacenterdynamics.com/en/news/nvidia-to-deploy-emerald-ais-orchestration-software-at-96mw-aurora-data-center-in-manassas-virginia/

Interpretation: flexibility is real, but the planning/trust layer is still the cleaner initial wedge.

---

## 5) Why investors care

### Category validation examples
- **ThinkLabs AI**: $28M Series A for AI-powered utility/grid planning  
  Sources:  
  https://finance.yahoo.com/sectors/energy/articles/thinklabs-ai-closes-28-m-100000063.html  
  https://venturebeat.com/infrastructure/nvidia-backed-thinklabs-ai-raises-usd28-million-to-tackle-a-growing-power

- **Emerald AI**: $25M strategic expansion round for flexible AI data centers / grid assets  
  Sources:  
  https://www.emeraldai.co/blog/sharing-our-strategic-expansion-round-emerald-ai-raises-25-million-to-transform-ai-data-centers-into-flexible-power-grid-assets  
  https://www.esgtoday.com/emerald-ai-raises-25-million-to-align-data-center-energy-use-with-grid-capacity/

- **Claros**: $30M seed for data-center power delivery efficiency  
  Sources:  
  https://www.businesswire.com/news/home/20260319469046/en/Claros-Raises-%2430M-Seed-Round-Co-Led-By-General-Catalyst-and-Red-Cell-Partners-to-Redefine-Data-Center-Energy-From-Chip-to-Grid  
  https://www.datacenterdynamics.com/en/news/power-management-company-claros-raises-30m-seed-round/

- **Soma Energy**: $7M for AI orchestration of power producers and data-center loads  
  Sources:  
  https://www.datacenterdynamics.com/en/news/soma-energy-raises-7m-to-speed-data-center-grid-connections-with-ai/  
  https://techcouver.com/2026/04/02/soma-energy-raises-7m-to-power-ai-growth/

- **Phaidra**: $50M+ Series B for AI optimization in industrial/data-center operations  
  Sources:  
  https://www.geekwire.com/2025/phaidra-raises-50m-to-help-ai-data-centers-run-smarter-not-just-harder-by-boosting-energy-efficiency/  
  https://finance.yahoo.com/news/collaborative-fund-leads-phaidras-50m-130000127.html

Interpretation: both the planning side and the operations side are investable. Your differentiation should be the **privacy-preserving coordination layer**, not “AI for the grid” in general.

---

## 6) Privacy-preserving infrastructure research

### Best near-term primary primitive: confidential computing / TEEs
- **Google Cloud Confidential Computing overview** defines confidential computing as protection of data in use with hardware-based TEEs.  
  Source: https://docs.cloud.google.com/confidential-computing/docs/confidential-computing-overview

- **Google Cloud Confidential Space overview** says it provides an isolated environment to operate on sensitive data from multiple parties while the owners keep it confidential.  
  Source: https://docs.cloud.google.com/confidential-computing/confidential-space/docs/confidential-space-overview

- **Confidential Space security overview** emphasizes data visibility only to the workload and original owners.  
  Source: https://docs.cloud.google.com/docs/security/confidential-space

### Why GCP is the best fit for this specific product
Because the product story is explicitly:
- multiple parties
- a mutually agreed workload
- derived outputs
- attestation-governed release

### Key handling / split trust
- **STET (Split-Trust Encryption Tool)** supports secure key transfer and environment attestations; docs frame it as protected from Google Cloud insiders through split trust across multiple KMS systems.  
  Sources:  
  https://docs.cloud.google.com/confidential-computing/docs/split-trust-encryption-tool  
  https://github.com/GoogleCloudPlatform/stet

### Strong alternative: AWS Nitro Enclaves
- Nitro Enclaves are isolated execution environments created from EC2 instances, with no persistent storage or external networking.  
  Sources:  
  https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html  
  https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave-concepts.html

### Why not lead with Azure Confidential Containers
- Microsoft’s AKS Confidential Containers docs state the preview is set to **sunset in March 2026**.  
  Source: https://learn.microsoft.com/en-us/azure/aks/confidential-containers-overview

### Additional privacy-enhancing technologies (later, not first)
- **OpenDP** for differential privacy on aggregate analytics: https://docs.opendp.org/
- **OpenFHE** for narrow encrypted numerical collaboration:  
  https://openfhe.org/  
  https://github.com/openfheorg/openfhe-development
- **SyftBox / syft-flwr / OpenMined** for federated analytics when data cannot move:  
  https://syftbox-documentation.openmined.org/  
  https://openmined.org/syft-flwr/

Interpretation:
- DP is good for portfolio reporting, not single-case decisions.
- FHE is promising, but awkward for document-heavy interactive workflows.
- Federated analytics is compelling for later cross-utility benchmarking, not the initial intake product.

---

## 7) AI-agent / developer infrastructure research

### Claude Code capabilities relevant to this project
- Overview: Claude Code supports instructions, skills, hooks, MCP, and subagents.  
  Source: https://code.claude.com/docs/en/overview

- **MCP support** in Claude Code:  
  Source: https://code.claude.com/docs/en/mcp

- **Hooks** provide deterministic control over Claude Code’s behavior.  
  Sources:  
  https://code.claude.com/docs/en/hooks  
  https://code.claude.com/docs/en/hooks-guide

- **Subagents**: Claude Code supports built-in and custom subagents.  
  Source: https://code.claude.com/docs/en/sub-agents

- **Best practices**: plugins can bundle skills, hooks, subagents, and MCP servers.  
  Source: https://code.claude.com/docs/en/best-practices

### Security note on MCP
There are active security discussions and vulnerabilities around MCP implementations in the wider ecosystem. Treat MCP servers as privileged code and apply strict review and least privilege.  
Example coverage: https://www.techradar.com/pro/security/this-is-not-a-traditional-coding-error-experts-flag-potentially-critical-security-issues-at-the-heart-of-anthropics-mcp-exposes-150-million-downloads-and-thousands-of-servers-to-complete-takeover

---

## 8) Open tooling recommendations

### Policy
- **Open Policy Agent (OPA)**: open-source, general-purpose policy engine; good fit for field-level release decisions.  
  Source: https://openpolicyagent.org/docs

### Maps
- **MapLibre GL JS**: open-source TypeScript library for interactive vector-tile maps in the browser.  
  Sources:  
  https://www.maplibre.org/maplibre-gl-js/docs/  
  https://maplibre.org/

### Evals
- **Promptfoo**: open-source CLI/library for evals and red teaming.  
  Sources:  
  https://www.promptfoo.dev/docs/intro/  
  https://github.com/promptfoo/promptfoo

- **DeepEval**: open-source framework for LLM evaluation, similar to pytest for LLM apps.  
  Sources:  
  https://deepeval.com/docs/getting-started  
  https://github.com/confident-ai/deepeval

### Observability
- **Phoenix**: open-source tracing and evaluation platform.  
  Sources:  
  https://phoenix.arize.com/  
  https://arize.com/docs/phoenix

---

## 9) Honest conclusions from the research

### Best entry
Start with **privacy-preserving intake, qualification, and planning**.

### Best roadmap
Expand later into **bounded operational flexibility**.

### Best privacy architecture
Use **TEE/confidential compute + policy-as-code + audit artifacts**.

### Best cloud story
Use **GCP Confidential Space** if possible, with **AWS Nitro Enclaves** as the strongest alternative.

### Best open-platform story
Use:
- LangGraph
- MCP
- OPA
- Postgres/PostGIS
- DuckDB
- MapLibre
- Phoenix
- Promptfoo
- DeepEval

### What not to lead with
Do not make **FHE**, **MPC**, or **differential privacy** the headline for v1. They are valid tools, but not the clearest or strongest first product story.

---

## 10) Suggested one-line summary for judges or investors

> We are not replacing utility judgment.  
> We are making cross-party planning possible when the necessary information cannot be shared raw.
