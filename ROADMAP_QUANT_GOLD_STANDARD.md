# 🧭 Quant Gold-Standard Roadmap Tracker

## ✅ Completed
- FastAPI + Supabase integration
- Model A v1.1 pipeline stable
- ML pipeline (LightGBM classifier & regressor)
- 25-month training dataset (546 K rows)
- Job automation (`run_model_a_job.py`)
- Backtest engine (`backtest_model_a_ml.py`, runs locally)
- Extended feature plan initiated
- Extended feature pipeline scaffolded (`jobs/build_extended_feature_set.py`)

---

## 📌 Milestone Update — 2026-01-15 (Phase 6B → 7A)

This milestone completes end-to-end integration for Models A (Quant), B (Fundamentals), and C (NLP),
with populated datasets flowing through to the extended feature layer. Assistant and explainability
services are implemented locally; Render activation requires env variables.

### ✅ What’s Completed

#### Assistant Intelligence Layer
- Implemented `/assistant/chat` backend using GPT-4o-mini.
- Frontend hook wired via `AssistantClient.tsx`; allowlist updated in OpenAPI actions.
- Awaiting `OPENAI_API_KEY` on Render + Vercel for cloud-side activation.

#### Explainability & Transparency
- Added `/model/explainability` endpoint with fallback to training summaries.
- Frontend wired via `InsightsClient.tsx`.

#### Model C — NLP / Announcements Feed
- `jobs/asx_announcements_scraper.py` uses NewsAPI + EODHD fallback feeds.
- Adds sentiment, stance, and relevance scoring.
- Inserts into `nlp_announcements` via psycopg2.
- Local ingestion validated; `/insights/asx_announcements` returns data.

#### Model B — Fundamentals Pipeline
- `.AU` ticker mapping fixed for EODHD fundamentals.
- Switched to psycopg2 inserts for transaction safety.
- Derived features persisted to `features_fundamental`.

#### Unified Feature Set & Artifacts
- `jobs/build_extended_feature_set.py` merges fundamentals + NLP fields.
- `jobs/export_feature_importance.py` produces explainability artifacts.
- Local integration validated end-to-end.

#### Loan Intelligence (Property deferred)
- Added `/loan/summary` endpoint for aggregates + health score.
- Added `jobs/ingest_loan_job.py` to load loan inputs from CSV or env sample.
- Dashboard now includes Loan Health Score panel.

### 🧪 Commands Executed (Local)
```bash
python jobs/asx_announcements_scraper.py
python jobs/load_fundamentals_pipeline.py
python jobs/derive_fundamentals_features.py
python jobs/build_extended_feature_set.py
python jobs/export_feature_importance.py
python jobs/ingest_loan_job.py
```

### 🧩 Live Checks
| Endpoint | Status | Notes |
| --- | --- | --- |
| `/health` | ✅ OK | Service responsive |
| `/insights/asx_announcements` | ✅ Populated | Data from NewsAPI/EODHD fallback |
| `/assistant/chat` | ✅ Local | Requires `OPENAI_API_KEY` for Render |
| `/model/explainability` | ⚠️ Render pending | Requires feature importance artifact |
| `/ingest/asx_announcements` | ✅ Inserts | Requires `NEWS_API_KEY` remotely |

### ⚙️ Environment Configuration (Required)
```ini
NEWS_API_KEY=<set_in_render>
MODEL_C_TICKERS=BHP,CBA,CSL,WES,FMG,WBC
MODEL_C_NEWS_LIMIT=50
OPENAI_API_KEY=<your_openai_key>
EODHD_API_KEY=<fundamentals_feed_key>
DATABASE_URL=<render_postgres_url>
OS_API_KEY=<internal_service_key>
```
**Note:** `MODEL_C_TICKERS` is a throttle. If omitted, ingestion iterates all ASX tickers in the database.

### ⚠️ Outstanding Tasks
| Area | Action |
| --- | --- |
| Render Env Vars | Add `NEWS_API_KEY`, `MODEL_C_*`, `OPENAI_API_KEY` |
| Explainability Artifacts | Upload `feature_importance_v1_2.json` |
| Cron Jobs | Schedule weekly fundamentals + NLP refresh |
| Frontend | Redeploy Vercel after env setup |
| Property Data | Deferred until a data feed is available |

### 🧭 Next Steps (Phase 7B Prep)
1. Apply env variables and redeploy Render + Vercel.
2. Validate live ingestion:
   - `POST /ingest/asx_announcements`
   - `GET /model/explainability`
3. Rebuild extended feature set after refresh.
4. Add job history API + UI for operational tracking.

---

## ✅ Completed (Pipeline)
**Module:** Extended Feature Pipeline  
**Files:** `jobs/build_extended_feature_set.py`  
**Goal:** Unify technical, fundamental, macro, and sentiment features.  
**Status:** Script runs and outputs parquet; fundamentals/ETF tables created.  
**Notes:** Data ingestion for fundamentals/ETF/sentiment still needed (no endpoints wired yet).  
**Deliverables:**
- Rich feature store (`featureset_extended_*.parquet`)
- Ready for multi-model training (LightGBM, LSTM)
- Macro + sentiment integration

---

## 📦 Phase 4 – Model Registry & Signal Persistence

**Status:** Completed (schemas applied, training persists runs/signals).

### Implemented
- API endpoints:
  - `POST /persist/ml_signals`
  - `POST /registry/model_run`
- Schemas:
  - `schemas/model_a_ml_signals.sql`
  - `schemas/model_registry.sql`

### Next Actions
- None (live and persisting).

---

## 📈 Phase 5 – Drift & Explainability

**Status:** Completed (drift job posts to API; cron installed locally).

### Implemented
- Drift audit endpoint:
  - `POST /drift/audit`
- PSI drift job:
  - `jobs/audit_drift_job.py`
- Schema:
  - `schemas/model_a_drift_audit.sql`

### Next Actions
- Optional: add SHAP plot export in training pipeline.

---

## 🏗️ Phase 7 – Property & Loan Intelligence (Partial)

**Goal:** Integrate property valuation, rental analytics, and loan optimization into the AI Wealth Operating System.

### Components
| Module | Path | Description | Status |
|---------|------|--------------|---------|
| Property Intelligence | `jobs/property_module_template.py` | Valuation, yield, growth forecast | ⏸️ Deferred (no data feed) |
| Loan Simulator | `jobs/loan_simulator.py` | Amortization, refinancing, payoff optimization | ✅ Complete |

### Next Actions
1. Link both modules to Supabase via new tables ✅
   - `property_assets`
   - `loan_accounts`
2. Expose endpoints ✅
   - `/property/valuation`
   - `/loan/simulate`
3. Add loan summary + ingestion ✅
   - `/loan/summary`
   - `jobs/ingest_loan_job.py`
4. Extend dashboard ✅
   - Loan health score summary
5. Integrate ChatGPT Actions ✅
   - “Simulate 3% rate rise impact on my loans.”
6. Revisit property once a data feed is available.

### Future Enhancements
- Add CoreLogic / PropTrack data connector.
- Include AI-generated property appraisal summaries.
- Incorporate RBA macro data into interest rate forecasting.

---

## 🔜 Next Phases
### **Phase 6 – Dashboard & Conversational AI**
- Streamlit or Next.js dashboard
- ChatGPT Actions integrated via OpenAPI
- Natural-language queries: “Which factors drove performance last month?”

---

## Phase 6B – Conversational Intelligence (Completed)

**Goal:** Wire Assistant UI to backend chat + explainability APIs.

### Components
| Module | Path | Description | Status |
|---------|------|--------------|---------|
| Assistant API | `app/main.py` | `/assistant/chat` endpoint | ✅ Complete |
| Chat Engine | `services/chat_engine.py` | OpenAI-backed responder | ✅ Complete |
| Assistant UI | `frontend/components/AssistantClient.tsx` | Chat UI + API hook | ✅ Complete |
| Explainability API | `app/main.py` | `/model/explainability` endpoint | ✅ Complete |

### Notes
1. Add `OPENAI_API_KEY` to Render + Vercel env (required for live responses).
2. Publish feature importance JSON (`feature_importance_v1_2.json`) if you want JSON-backed explainability; otherwise the endpoint falls back to training summaries.

---

## Phase 7A – Model B/C Live Activation (In Progress)

**Goal:** Populate fundamental + NLP tables with live data.

### Next Actions
1. Set `NEWS_API_KEY`, `MODEL_C_TICKERS`, `MODEL_C_NEWS_LIMIT` in Render (news fallback still needed on Render).
2. Run `/ingest/asx_announcements` and verify `/insights/asx_announcements`.
3. Rebuild extended feature set for Model A ML after new data.

---

## Phase C – ASX Announcements NLP (Model C Foundation)

**Goal:** Scrape ASX announcements, classify sentiment/event type, and persist to DB + CSV.

### Components
| Module | Path | Description | Status |
|---------|------|--------------|---------|
| ASX Scraper | `jobs/asx_announcements_scraper.py` | Scrape feed + parse PDFs | ⚙️ In Progress |
| NLP Storage | `schemas/nlp_announcements.sql` | Persist announcements | ✅ |
| Manual Trigger | `POST /ingest/asx_announcements` | API trigger | ✅ |
| Cron Job | `scripts/cron_asx_scrape.sh` | Daily scrape | ✅ |

### Next Actions
1. Add ASX NLP signals into `featureset_extended_latest.parquet`.
2. Add explainability layer for event types (guidance/dividend/etc).
3. Fine-tune FinBERT on ASX announcement corpus.
4. Enable fallback feeds (EODHD/NewsAPI) while ASX feed is gated.

---

## Phase B – Fundamentals Ingestion (Model B Foundation)

**Goal:** Pull fundamentals from EODHD and generate derived scoring features.

### Components
| Module | Path | Description | Status |
|---------|------|--------------|---------|
| Fundamentals Pipeline | `jobs/load_fundamentals_pipeline.py` | EODHD fundamentals ingestion | ⚙️ In Progress |
| Derived Features | `jobs/derive_fundamentals_features.py` | Fundamental scoring table | ⚙️ In Progress |
| Schema | `schemas/features_fundamental.sql` | Feature storage table | ✅ |

### Next Actions
1. Run fundamentals pipeline on the upgraded EODHD plan.
2. Run feature derivation job to populate `features_fundamental`.
3. Merge derived features into the extended feature set.

---

## 🧩 Phase 8 – Portfolio Fusion (Scaffold)

**Goal:** Unify equity, property, and loan intelligence into a single portfolio view.

### Components
| Module | Path | Description | Status |
|---------|------|--------------|---------|
| Portfolio Fusion API | `app/main.py` | Unified portfolio endpoints | ⏳ |
| Property Assets Table | `schemas/property_assets.sql` | Property holdings + valuations | ✅ |
| Loan Accounts Table | `schemas/loan_accounts.sql` | Loan balances + terms | ✅ |
| Fusion Job | `jobs/portfolio_fusion_job.py` | Aggregation + analytics | ⏳ |

### Next Actions
1. Define Supabase schemas for `property_assets` and `loan_accounts`.
2. Add endpoints:
   - `/portfolio/overview`
   - `/portfolio/risk`
3. Build `jobs/portfolio_fusion_job.py` to compute:
   - Total net worth
   - Asset allocation by class
   - Debt service ratios
4. Extend dashboard to show unified portfolio health.

---

## 🧮 Long-Term Enhancements
| Area | Enhancement | Benefit |
|------|--------------|----------|
| Reinforcement Learning | Adaptive allocation | Dynamic risk response |
| Regime Classifier | Market state detection | Smarter exposure control |
| Multi-Asset Models | ETFs, options, crypto | Broader alpha surface |
| Macro Forecaster | Rates, inflation, GDP | Strategic allocation |
| LLM Quant Assistant | ChatGPT research summaries | Conversational analytics |

---

## 🛠️ Toolchain
| Layer | Stack |
|--------|--------|
| Backend | FastAPI + Supabase (Postgres) |
| ML | scikit-learn, LightGBM, Optuna |
| Feature Mgmt | Prefect / Airflow |
| UI | Streamlit / Next.js + Recharts |
| AI Integration | ChatGPT Actions (OpenAPI) |
| Automation | Cron / Prefect Flows |

---

## 📅 Timeline
| Phase | Duration | ETA |
|--------|-----------|-----|
| Extended Features | 3 days | 🔄 Active |
| Model Registry | 1 day | ⏳ |
| Drift + Explainability | 3 days | ⏳ |
| Dashboard & AI | 4 days | ⏳ |
| Portfolio Optimization | 3 days | Planned |

---

**Guiding Principle:** *Every step is reproducible, versioned, and auditable.*
