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
1. Link both modules to Supabase via new tables:
   - `property_assets`
   - `loan_accounts`
2. Expose endpoints:
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

## 🧩 Phase 8 – Portfolio Fusion (Scaffold)

**Goal:** Unify equity, property, and loan intelligence into a single portfolio view.

### Components
| Module | Path | Description | Status |
|---------|------|--------------|---------|
| Portfolio Fusion API | `app/main.py` | Unified portfolio endpoints | ⏳ |
| Property Assets Table | `schemas/property_assets.sql` | Property holdings + valuations | ⏳ |
| Loan Accounts Table | `schemas/loan_accounts.sql` | Loan balances + terms | ⏳ |
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
