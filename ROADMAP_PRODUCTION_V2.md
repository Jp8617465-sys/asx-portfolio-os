# ASX Portfolio OS Production Roadmap (Codex Optimized)

version: 2.0
last_updated: 2026-01-13

## Owners
- product: Head of Product
- strategy: Founder/Lead Architect
- ml: Lead Quant and ML Engineer
- rl: Reinforcement Learning Researcher
- nlp: Financial NLP Engineer
- mlops: Infrastructure and Pipeline Engineer
- backend: FastAPI / API Developer
- frontend: Next.js / UI Developer
- data: Data Engineering Lead
- quant: Quantitative Researcher
- compliance: Risk and Governance Officer
- ux: UX/UI Designer (Explainability and Chat)
- finance: Portfolio Analytics Lead
- integration: DevOps / Cloud Integration Engineer

## Metrics Targets
- target_sharpe: 1.5
- uptime_target: 99.8%
- explainability_coverage: 95%
- drift_detection_latency: 15m
- compliance_audit_frequency: Quarterly
- retrain_frequency: Weekly

---

## Phase 1: Foundations (0-3 months)
Objective: Stabilize infrastructure, ingestion, and model persistence.

Key Deliverables
- Database schema sync for fundamentals, ETF, sentiment, macro, features, predictions, backtests.
- Model persistence live on Render with registry and signal posts verified.
- 36-month EODHD dataset and caching.
- API hardening for registry and signal persistence.
- Prefect or equivalent orchestration initialized.

Owner Assignments
- mlops: Prefect setup and scheduling
- backend: API stabilization and error handling
- data: Loader pipelines and data health checks
- integration: Docker scheduling verification

---

## Phase 2: Expansion (3-6 months)
Objective: Integrate RL, NLP, and meta-ensemble prototypes.

Milestones
- RL sandbox (FinRL PPO/A2C baseline) with ASX subset.
- NLP pipeline automation for ASX announcements with FinBERT tone.
- Meta-ensemble MVP to blend fundamental, technical, sentiment models.
- MLOps hardening with MLflow or registry extensions.
- Drift monitoring (Evidently/WhyLabs) with alerts.

Owner Assignments
- rl: RL sandbox design
- nlp: FinBERT fine-tune and ASX parser
- ml: Ensemble design and tuning
- mlops: MLflow integration
- backend: New signal endpoints

---

## Phase 3: Human-Centric Intelligence (6-9 months)
Objective: Explainability, chat, and human-in-the-loop feedback.

Milestones
- SHAP visualizations and narrative explanations in UI.
- Conversational assistant with retrieval over registry and NLP signals.
- User feedback loop (risk tolerance + preference capture).
- Alerting engine for drift, volatility, and sentiment spikes.
- Daily AI briefing summaries.

Owner Assignments
- ux: Explainability UX
- frontend: Conversational UI
- ml: SHAP and interpretability layers
- integration: Notification orchestration

---

## Phase 4: Intelligence Scaling (9-12 months)
Objective: Meta-model, RL integration, and governance.

Milestones
- Meta-model v2 with dynamic weighting.
- RL integration to production allocation.
- Portfolio simulator with Monte Carlo stress tests.
- Compliance guardrails and audit trails.
- Continuous training pipeline via Prefect.

Owner Assignments
- quant: Portfolio simulator
- ml: Meta-model productionization
- rl: Production integration
- compliance: Governance review

---

## Phase 5: Expansion and B2B (12+ months)
Objective: B2B APIs and cross-market expansion.

Milestones
- Public signal APIs with authentication and throttling.
- Personalization engine (collaborative filtering).
- Real-time analytics dashboard.
- NZX/SGX expansion with retraining.
- Quarterly benchmarking vs ASX200 peers.

Owner Assignments
- integration: B2B deployment and API security
- data: Cross-market ingestion
- frontend: Analytics UI
- finance: Benchmark analysis

---

## Integration Notes
- Maintain a dependency graph of pipelines and models.
- Track verification steps for each endpoint and job.
- Prefer reproducible artifacts for training and inference.
- Log model registry deltas and drift alerts for auditability.
