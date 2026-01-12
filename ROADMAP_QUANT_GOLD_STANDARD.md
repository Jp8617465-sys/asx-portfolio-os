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

## 🏗️ Phase 7 – Property & Loan Intelligence

**Goal:** Integrate property valuation, rental analytics, and loan optimization into the AI Wealth Operating System.

### Components
| Module | Path | Description | Status |
|---------|------|--------------|---------|
| Property Intelligence | `jobs/property_module_template.py` | Valuation, yield, growth forecast | ✅ Complete |
| Loan Simulator | `jobs/loan_simulator.py` | Amortization, refinancing, payoff optimization | ✅ Complete |

### Next Actions
1. Link both modules to Supabase via new tables ✅
   - `property_assets`
   - `loan_accounts`
2. Expose endpoints ✅
   - `/property/valuation`
   - `/loan/simulate`
3. Add ML retraining job `train_property_model.py`.
4. Extend dashboard to show:
   - Property value trends
   - Loan health scores
5. Integrate ChatGPT Actions:
   - “Simulate 3% rate rise impact on my loans.”
   - “Forecast property yield in Melbourne for 12 months.”

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

## Phase 6B – Conversational Intelligence (In Progress)

**Goal:** Wire Assistant UI to backend chat + explainability APIs.

### Components
| Module | Path | Description | Status |
|---------|------|--------------|---------|
| Assistant API | `app/main.py` | `/assistant/chat` endpoint | ⚙️ In Progress |
| Chat Engine | `services/chat_engine.py` | OpenAI-backed responder | ⚙️ In Progress |
| Assistant UI | `frontend/components/AssistantClient.tsx` | Chat UI + API hook | ⚙️ In Progress |
| Explainability API | `app/main.py` | `/model/explainability` endpoint | ⚙️ In Progress |

### Next Actions
1. Add `OPENAI_API_KEY` to Render + Vercel env.
2. Publish feature importance JSON (`feature_importance_v1_2.json`).
3. Confirm Assistant responses in UI.

---

## Phase 7A – Model B/C Live Activation (In Progress)

**Goal:** Populate fundamental + NLP tables with live data.

### Next Actions
1. Set `NEWS_API_KEY`, `MODEL_C_TICKERS`, `MODEL_C_NEWS_LIMIT` in Render.
2. Run `/ingest/asx_announcements` and verify `/insights/asx_announcements`.
3. Run `jobs/load_fundamentals_pipeline.py` + `jobs/derive_fundamentals_features.py`.
4. Rebuild extended feature set for Model A ML.

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
