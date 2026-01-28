# V2 Implementation Tasks: Fundamental Intelligence

**Version**: 2.0.0
**Timeline**: Q2 2026 (4 weeks with Claude Code)
**Status**: 🟡 Planning
**Depends On**: V1 deployed to production
**Investment**: $0-$150 (infrastructure only, no personnel costs)

---

## OVERVIEW

**Goal**: Add fundamental analysis (Model B) to complement momentum signals (Model A)

**Development Approach**: Using Claude Code as dev team

**Key Deliverables**:
1. Model B trained on fundamental data (P/E, ROE, debt ratios)
2. Dual-signal system (Momentum + Fundamentals)
3. Ensemble strategy combining Models A + B
4. 5 new API endpoints
5. Frontend updates for dual signals

**Success Criteria**:
- Model B precision >65% on top quintile
- Ensemble Sharpe ratio 5%+ higher than Model A alone
- API latency <500ms
- 100+ users, 20+ try dual-signal filtering

**Bootstrap Options**:
- **Option A (Free)**: Use yfinance Python library = $0 total
- **Option B (Recommended)**: Use EODHD API = $50/month × 3 months = $150 total

---

## PHASE 1: DATA INFRASTRUCTURE (Week 1-2)

### Task 1.1: Set up Fundamentals Data Source

**Time with Claude Code**: ~2 prompting sessions (30 min total)

**Acceptance Criteria**:
- [ ] Data source chosen (yfinance free OR EODHD $50/month)
- [ ] API/library tested for ASX stocks
- [ ] Rate limits documented
- [ ] API key added to `.env` and Render (if using EODHD)

**Bootstrap Implementation** (Option A - Free):
```python
# Use yfinance (free) instead of EODHD ($50/month)
import yfinance as yf

def fetch_fundamentals_free(ticker: str) -> dict:
    """Fetch fundamentals using yfinance (free)"""
    stock = yf.Ticker(f"{ticker}.AX")
    info = stock.info

    return {
        'pe_ratio': info.get('trailingPE'),
        'pb_ratio': info.get('priceToBook'),
        'debt_to_equity': info.get('debtToEquity'),
        'roe': info.get('returnOnEquity'),
        'revenue_growth_yoy': info.get('revenueGrowth'),
        'profit_margin': info.get('profitMargins'),
        'current_ratio': info.get('currentRatio'),
        'quick_ratio': info.get('quickRatio')
    }
```

**Paid Implementation** (Option B - Recommended, $150 total):
1. Register for EODHD API (https://eodhistoricaldata.com) - $50/month
2. Test API with 10 ASX stocks
3. Add `EODHD_API_KEY` to environment
4. Run for 3 months during V2 development = $150 total

**Trade-off Decision**:
- Free (yfinance): Good for MVP/testing, may hit rate limits with 500 stocks
- Paid (EODHD): More reliable, but $150 cost
- **Recommendation**: Start with yfinance, upgrade to EODHD if users request better data

**Deliverable**: Working fundamental data source (free or paid)

---

### Task 1.2: Create Fundamentals Ingestion Pipeline

**Estimated Time**: 8 hours

**Acceptance Criteria**:
- [ ] `jobs/sync_fundamentals.py` created
- [ ] Fetches 10 fundamental metrics per stock
- [ ] Validates data quality (no negative P/E > 1000)
- [ ] Handles missing data (NaN for stocks without financials)
- [ ] Writes to `model_b_fundamentals_data` table
- [ ] Logs success/failure per stock

**Steps**:
1. Create database table:
```sql
CREATE TABLE model_b_fundamentals_data (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    dt DATE NOT NULL,
    pe_ratio FLOAT,
    pb_ratio FLOAT,
    debt_to_equity FLOAT,
    roe FLOAT,
    revenue_growth_yoy FLOAT,
    profit_margin FLOAT,
    current_ratio FLOAT,
    quick_ratio FLOAT,
    eps_growth_ttm FLOAT,
    free_cash_flow FLOAT,
    sector VARCHAR(50),
    market_cap FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ticker, dt)
);
```

2. Create `jobs/sync_fundamentals.py`:
```python
import os
import requests
from datetime import datetime
from app.database import get_db_connection

def fetch_fundamentals(ticker: str) -> dict:
    """Fetch fundamentals from EODHD API"""
    api_key = os.getenv("EODHD_API_KEY")
    url = f"https://eodhistoricaldata.com/api/fundamentals/{ticker}.AU"
    params = {"api_token": api_key}
    response = requests.get(url, params=params)
    if response.status_code == 200:
        return response.json()
    return None

def validate_fundamentals(data: dict) -> dict:
    """Validate and clean fundamental data"""
    # Cap P/E ratio at 100 (avoid outliers)
    if data.get('pe_ratio') and data['pe_ratio'] > 100:
        data['pe_ratio'] = 100
    # Debt/equity should be non-negative
    if data.get('debt_to_equity') and data['debt_to_equity'] < 0:
        data['debt_to_equity'] = None
    return data

def sync_fundamentals():
    """Sync fundamentals for top 500 ASX stocks"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get top 500 stocks by market cap
    cursor.execute("""
        SELECT DISTINCT ticker
        FROM prices
        ORDER BY ticker
        LIMIT 500
    """)
    tickers = [row[0] for row in cursor.fetchall()]

    success_count = 0
    fail_count = 0

    for ticker in tickers:
        try:
            raw_data = fetch_fundamentals(ticker)
            if raw_data:
                data = validate_fundamentals(raw_data)
                cursor.execute("""
                    INSERT INTO model_b_fundamentals_data
                    (ticker, dt, pe_ratio, pb_ratio, debt_to_equity, roe,
                     revenue_growth_yoy, profit_margin, current_ratio,
                     quick_ratio, eps_growth_ttm, free_cash_flow,
                     sector, market_cap)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (ticker, dt) DO UPDATE SET
                        pe_ratio = EXCLUDED.pe_ratio,
                        pb_ratio = EXCLUDED.pb_ratio,
                        ...
                """, (ticker, datetime.now().date(), ...))
                conn.commit()
                success_count += 1
        except Exception as e:
            print(f"Failed to sync {ticker}: {e}")
            fail_count += 1

    print(f"Synced {success_count} stocks, {fail_count} failed")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    sync_fundamentals()
```

3. Test on 10 stocks locally
4. Schedule weekly cron job on Render:
```yaml
# render.yaml
jobs:
  - name: sync-fundamentals
    schedule: "0 3 * * 0"  # Every Sunday at 3am
    command: python jobs/sync_fundamentals.py
```

**Deliverable**: Weekly fundamentals sync for 500 stocks

---

### Task 1.3: Fundamentals Data Validation Tests

**Estimated Time**: 4 hours

**Acceptance Criteria**:
- [ ] `tests/test_fundamentals_ingestion.py` created
- [ ] Tests API response parsing
- [ ] Tests data validation logic
- [ ] Tests missing data handling
- [ ] Tests database insertion

**Steps**:
1. Create test file:
```python
import pytest
from jobs.sync_fundamentals import validate_fundamentals

def test_pe_ratio_capping():
    """Test P/E ratio is capped at 100"""
    data = {'pe_ratio': 250}
    result = validate_fundamentals(data)
    assert result['pe_ratio'] == 100

def test_negative_debt_equity():
    """Test negative debt/equity is set to None"""
    data = {'debt_to_equity': -5}
    result = validate_fundamentals(data)
    assert result['debt_to_equity'] is None

def test_missing_data_handling():
    """Test NaN for missing fields"""
    data = {}
    result = validate_fundamentals(data)
    assert result.get('pe_ratio') is None
```

2. Run tests: `pytest tests/test_fundamentals_ingestion.py`
3. Add to CI/CD pipeline

**Deliverable**: Fundamentals ingestion tests passing

---

## PHASE 2: MODEL B TRAINING (Week 3-5)

### Task 2.1: Feature Engineering for Fundamentals

**Estimated Time**: 8 hours

**Acceptance Criteria**:
- [ ] `models/build_fundamental_features.py` created
- [ ] Features normalized by sector (Z-score)
- [ ] Outliers handled (winsorization)
- [ ] Sector encoding (one-hot)
- [ ] Training dataset created (500 stocks × 3 years)

**Steps**:
1. Create feature engineering script:
```python
import pandas as pd
from sklearn.preprocessing import StandardScaler

def build_fundamental_features():
    """Build feature set for Model B training"""
    # Load fundamentals data
    df = pd.read_sql("""
        SELECT ticker, dt, pe_ratio, pb_ratio, debt_to_equity,
               roe, revenue_growth_yoy, profit_margin, current_ratio,
               quick_ratio, eps_growth_ttm, free_cash_flow, sector
        FROM model_b_fundamentals_data
        WHERE dt >= '2021-01-01'
    """, conn)

    # Sector normalization (Z-score within sector)
    for sector in df['sector'].unique():
        sector_mask = df['sector'] == sector
        for col in ['pe_ratio', 'pb_ratio', ...]:
            df.loc[sector_mask, f'{col}_zscore'] = (
                df.loc[sector_mask, col] - df.loc[sector_mask, col].mean()
            ) / df.loc[sector_mask, col].std()

    # One-hot encode sectors
    df = pd.get_dummies(df, columns=['sector'])

    return df
```

2. Create target variable (6-month forward return):
```python
def create_target_variable(df):
    """Create 6-month forward return quintiles"""
    # Merge with price data to get 6-month returns
    returns = pd.read_sql("""
        SELECT ticker, dt,
               (LEAD(close, 126) OVER (PARTITION BY ticker ORDER BY dt) - close) / close AS return_6m
        FROM prices
    """, conn)

    df = df.merge(returns, on=['ticker', 'dt'])

    # Convert to quintiles (1-5)
    df['target_quintile'] = pd.qcut(df['return_6m'], q=5, labels=[1,2,3,4,5])

    return df
```

3. Validate no data leakage:
   - Fundamentals at date `t`
   - Target is return from `t` to `t+180 days`
   - No future information in features

4. Save training dataset: `outputs/model_b_training_data.csv`

**Deliverable**: Training dataset ready (1500 samples)

---

### Task 2.2: Train Model B

**Estimated Time**: 12 hours

**Acceptance Criteria**:
- [ ] `models/train_model_b_fundamentals.py` created
- [ ] LightGBM classifier trained (5 classes)
- [ ] 5-fold cross-validation by sector
- [ ] Hyperparameters tuned (Optuna)
- [ ] Model saved to `outputs/model_b_fundamentals_v1.pkl`
- [ ] Feature importance generated (SHAP)

**Steps**:
1. Create training script:
```python
import lightgbm as lgb
from sklearn.model_selection import StratifiedKFold
import optuna

def train_model_b():
    """Train Model B on fundamental features"""
    # Load training data
    df = pd.read_csv('outputs/model_b_training_data.csv')

    feature_cols = [
        'pe_ratio_zscore', 'pb_ratio_zscore', 'debt_to_equity_zscore',
        'roe_zscore', 'revenue_growth_yoy_zscore', 'profit_margin_zscore',
        'current_ratio_zscore', 'quick_ratio_zscore',
        'eps_growth_ttm_zscore', 'free_cash_flow_zscore'
        # + sector dummies
    ]

    X = df[feature_cols]
    y = df['target_quintile']

    # 5-fold cross-validation (stratified by sector)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # Hyperparameter tuning with Optuna
    def objective(trial):
        params = {
            'objective': 'multiclass',
            'num_class': 5,
            'max_depth': trial.suggest_int('max_depth', 3, 7),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.1),
            'n_estimators': trial.suggest_int('n_estimators', 50, 300),
            'min_child_samples': trial.suggest_int('min_child_samples', 10, 50)
        }

        scores = []
        for train_idx, val_idx in skf.split(X, y):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            model = lgb.LGBMClassifier(**params)
            model.fit(X_train, y_train)

            # Precision on top quintile (class 5)
            y_pred = model.predict(X_val)
            precision_top = precision_score(y_val, y_pred, labels=[5], average='macro')
            scores.append(precision_top)

        return np.mean(scores)

    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=50)

    # Train final model with best params
    best_params = study.best_params
    model = lgb.LGBMClassifier(**best_params)
    model.fit(X, y)

    # Save model
    import joblib
    joblib.dump(model, 'outputs/model_b_fundamentals_v1.pkl')

    return model
```

2. Generate SHAP feature importance:
```python
import shap
shap_values = shap.TreeExplainer(model).shap_values(X)
shap.summary_plot(shap_values, X, plot_type="bar", show=False)
plt.savefig('outputs/model_b_feature_importance.png')
```

3. Run training: `python models/train_model_b_fundamentals.py`
4. Verify model file size < 10 MB

**Deliverable**: Trained Model B saved

---

### Task 2.3: Model B Validation

**Estimated Time**: 6 hours

**Acceptance Criteria**:
- [ ] `models/validate_model_b.py` created
- [ ] Precision on top quintile >65%
- [ ] Sector-balanced performance validated
- [ ] Comparison to naive baseline
- [ ] Validation report created (`outputs/model_b_validation.md`)

**Steps**:
1. Create validation script:
```python
def validate_model_b():
    """Validate Model B performance"""
    model = joblib.load('outputs/model_b_fundamentals_v1.pkl')
    df = pd.read_csv('outputs/model_b_training_data.csv')

    # Holdout test set (last 20% chronologically)
    split_date = df['dt'].quantile(0.8)
    train_df = df[df['dt'] < split_date]
    test_df = df[df['dt'] >= split_date]

    X_test = test_df[feature_cols]
    y_test = test_df['target_quintile']

    # Predict
    y_pred = model.predict(X_test)

    # Metrics
    from sklearn.metrics import precision_score, classification_report

    # Precision on top quintile (most important metric)
    precision_top = precision_score(y_test, y_pred, labels=[5], average='macro')
    print(f"Precision on top quintile: {precision_top:.2%}")

    # Full classification report
    print(classification_report(y_test, y_pred))

    # Sector-balanced performance
    for sector in test_df['sector'].unique():
        sector_mask = test_df['sector'] == sector
        sector_precision = precision_score(
            y_test[sector_mask],
            y_pred[sector_mask],
            labels=[5],
            average='macro'
        )
        print(f"{sector}: {sector_precision:.2%}")

    # Compare to naive baseline (equal-weight)
    baseline_precision = 1/5  # Random guessing
    improvement = (precision_top - baseline_precision) / baseline_precision
    print(f"Improvement over baseline: {improvement:.1%}")

    return {
        'precision_top': precision_top,
        'improvement': improvement,
        'passes_threshold': precision_top > 0.65
    }
```

2. Run validation: `python models/validate_model_b.py`
3. Create validation report (markdown)
4. If precision < 65%, iterate on features/hyperparameters

**Deliverable**: Validation report confirming >65% precision

---

## PHASE 3: ENSEMBLE STRATEGY (Week 6)

### Task 3.1: Implement Ensemble Logic

**Estimated Time**: 6 hours

**Acceptance Criteria**:
- [ ] `models/ensemble_strategy.py` created
- [ ] Weighted average (60% Model A, 40% Model B)
- [ ] Conflict detection logic
- [ ] Override rules (STRONG_BUY only if both agree)
- [ ] Tests for ensemble logic

**Steps**:
1. Create ensemble module:
```python
from enum import Enum

class Signal(Enum):
    STRONG_SELL = 1
    SELL = 2
    HOLD = 3
    BUY = 4
    STRONG_BUY = 5

def ensemble_signals(model_a_signal: Signal, model_b_quality: str,
                     model_a_confidence: float, model_b_confidence: float) -> dict:
    """Combine Model A (momentum) and Model B (fundamentals) signals"""

    # Convert Model B quality to signal
    quality_to_signal = {'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1}
    model_b_signal_value = quality_to_signal.get(model_b_quality, 3)

    # Weighted average (60% Model A, 40% Model B)
    ensemble_value = 0.6 * model_a_signal.value + 0.4 * model_b_signal_value

    # Convert back to signal
    if ensemble_value >= 4.5:
        ensemble_signal = Signal.STRONG_BUY
    elif ensemble_value >= 3.5:
        ensemble_signal = Signal.BUY
    elif ensemble_value >= 2.5:
        ensemble_signal = Signal.HOLD
    elif ensemble_value >= 1.5:
        ensemble_signal = Signal.SELL
    else:
        ensemble_signal = Signal.STRONG_SELL

    # Override rule: STRONG_BUY only if both agree
    if ensemble_signal == Signal.STRONG_BUY:
        if model_a_signal.value < 4.5 or model_b_signal_value < 4:
            ensemble_signal = Signal.BUY

    # Conflict detection (signals differ by >2 levels)
    conflict = abs(model_a_signal.value - model_b_signal_value) > 2

    # Ensemble confidence (weighted average)
    ensemble_confidence = 0.6 * model_a_confidence + 0.4 * model_b_confidence

    return {
        'signal': ensemble_signal,
        'confidence': ensemble_confidence,
        'conflict': conflict,
        'model_a_signal': model_a_signal,
        'model_b_quality': model_b_quality
    }
```

2. Create tests:
```python
def test_ensemble_both_buy():
    """Test ensemble when both models say BUY"""
    result = ensemble_signals(
        Signal.BUY, 'B', 0.75, 0.70
    )
    assert result['signal'] == Signal.BUY
    assert not result['conflict']

def test_ensemble_conflict():
    """Test conflict detection"""
    result = ensemble_signals(
        Signal.STRONG_BUY, 'D', 0.80, 0.60
    )
    assert result['conflict']  # BUY vs SELL → conflict

def test_ensemble_override_strong_buy():
    """Test STRONG_BUY override rule"""
    result = ensemble_signals(
        Signal.STRONG_BUY, 'C', 0.90, 0.50
    )
    assert result['signal'] == Signal.BUY  # Downgraded from STRONG_BUY
```

3. Run tests: `pytest tests/test_ensemble.py`

**Deliverable**: Ensemble logic implemented and tested

---

### Task 3.2: Ensemble Validation (Backtest)

**Estimated Time**: 8 hours

**Acceptance Criteria**:
- [ ] Backtest ensemble on historical data
- [ ] Compare ensemble vs Model A alone
- [ ] Sharpe ratio improvement >5%
- [ ] Ensemble performance report created

**Steps**:
1. Create backtest script:
```python
def backtest_ensemble():
    """Backtest ensemble strategy vs Model A alone"""
    # Load historical signals
    model_a_signals = pd.read_sql("SELECT * FROM model_a_ml_signals WHERE dt >= '2023-01-01'", conn)
    model_b_signals = pd.read_sql("SELECT * FROM model_b_fundamentals_signals WHERE dt >= '2023-01-01'", conn)

    # Merge signals
    signals = model_a_signals.merge(model_b_signals, on=['ticker', 'dt'], suffixes=('_a', '_b'))

    # Generate ensemble signals
    signals['ensemble_signal'] = signals.apply(
        lambda row: ensemble_signals(
            Signal(row['signal_a']),
            row['quality_b'],
            row['confidence_a'],
            row['confidence_b']
        )['signal'].value,
        axis=1
    )

    # Backtest returns
    def calculate_returns(signals_df, signal_col):
        """Calculate portfolio returns following signals"""
        # Top 20 stocks by signal confidence
        portfolio = signals_df.sort_values('confidence', ascending=False).head(20)
        # Equal-weight portfolio
        returns = portfolio.groupby('dt')['forward_return_21d'].mean()
        return returns

    returns_model_a = calculate_returns(model_a_signals, 'signal_a')
    returns_ensemble = calculate_returns(signals, 'ensemble_signal')

    # Calculate Sharpe ratios
    sharpe_a = returns_model_a.mean() / returns_model_a.std() * np.sqrt(252)
    sharpe_ensemble = returns_ensemble.mean() / returns_ensemble.std() * np.sqrt(252)

    improvement = (sharpe_ensemble - sharpe_a) / sharpe_a

    print(f"Model A Sharpe: {sharpe_a:.2f}")
    print(f"Ensemble Sharpe: {sharpe_ensemble:.2f}")
    print(f"Improvement: {improvement:.1%}")

    return {
        'sharpe_a': sharpe_a,
        'sharpe_ensemble': sharpe_ensemble,
        'improvement': improvement,
        'passes_threshold': improvement > 0.05
    }
```

2. Run backtest: `python models/backtest_ensemble.py`
3. Create performance report
4. If improvement < 5%, adjust ensemble weights

**Deliverable**: Ensemble validated with >5% Sharpe improvement

---

## PHASE 4: BACKEND API (Week 7-8)

### Task 4.1: Model B Signal Generation Job

**Estimated Time**: 6 hours

**Acceptance Criteria**:
- [ ] `jobs/generate_model_b_signals.py` created
- [ ] Loads fundamentals data
- [ ] Runs Model B inference
- [ ] Generates quality scores (A-F)
- [ ] Writes to `model_b_fundamentals_signals` table
- [ ] Scheduled daily after fundamentals sync

**Steps**:
1. Create database table:
```sql
CREATE TABLE model_b_fundamentals_signals (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    dt DATE NOT NULL,
    quality_score VARCHAR(1),  -- A, B, C, D, F
    signal VARCHAR(20),  -- BUY, HOLD, SELL
    confidence FLOAT,
    fundamentals_json JSONB,  -- Raw fundamentals
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ticker, dt)
);
```

2. Create signal generation script:
```python
def generate_model_b_signals():
    """Generate Model B signals for all stocks"""
    model = joblib.load('outputs/model_b_fundamentals_v1.pkl')

    # Load latest fundamentals
    df = pd.read_sql("""
        SELECT ticker, dt, pe_ratio, pb_ratio, debt_to_equity, ...
        FROM model_b_fundamentals_data
        WHERE dt = (SELECT MAX(dt) FROM model_b_fundamentals_data)
    """, conn)

    # Feature engineering (same as training)
    X = build_fundamental_features(df)

    # Predict quintiles
    predictions = model.predict(X)
    probabilities = model.predict_proba(X)

    # Convert quintiles to quality scores
    quintile_to_quality = {5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'F'}
    df['quality_score'] = df['prediction'].map(quintile_to_quality)

    # Convert to signals
    quality_to_signal = {'A': 'BUY', 'B': 'BUY', 'C': 'HOLD', 'D': 'SELL', 'F': 'SELL'}
    df['signal'] = df['quality_score'].map(quality_to_signal)

    # Confidence is max probability
    df['confidence'] = probabilities.max(axis=1)

    # Write to database
    for _, row in df.iterrows():
        cursor.execute("""
            INSERT INTO model_b_fundamentals_signals
            (ticker, dt, quality_score, signal, confidence, fundamentals_json)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (ticker, dt) DO UPDATE SET ...
        """, (...))
    conn.commit()
```

3. Schedule daily cron (Render):
```yaml
jobs:
  - name: generate-model-b-signals
    schedule: "0 4 * * *"  # Daily at 4am (after fundamentals sync)
    command: python jobs/generate_model_b_signals.py
```

**Deliverable**: Daily Model B signals generated

---

### Task 4.2: Create New API Endpoints

**Estimated Time**: 10 hours

**Acceptance Criteria**:
- [ ] 5 new endpoints created
- [ ] Rate limiting applied (100 req/min)
- [ ] Input validation
- [ ] Error handling
- [ ] API tests passing

**Endpoints**:
1. `GET /signals/fundamentals` - Model B signals only
2. `GET /signals/ensemble` - Combined A + B signals
3. `GET /fundamentals/metrics?ticker=CBA` - Raw fundamental data
4. `GET /fundamentals/quality?ticker=CBA` - Quality score
5. `GET /model/compare_ensemble` - Model A vs B vs Ensemble

**Steps**:
1. Create route file `app/routes/fundamentals.py`:
```python
from fastapi import APIRouter, Query
from app.database import get_db_connection

router = APIRouter(prefix="/fundamentals", tags=["fundamentals"])

@router.get("/metrics")
async def get_fundamental_metrics(ticker: str = Query(..., regex="^[A-Z]{3}$")):
    """Get raw fundamental metrics for a ticker"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT ticker, dt, pe_ratio, pb_ratio, debt_to_equity, roe,
               revenue_growth_yoy, profit_margin, current_ratio,
               quick_ratio, eps_growth_ttm, free_cash_flow, sector
        FROM model_b_fundamentals_data
        WHERE ticker = %s
        ORDER BY dt DESC
        LIMIT 1
    """, (ticker,))

    result = cursor.fetchone()
    cursor.close()
    conn.close()

    if not result:
        return {"error": "Ticker not found"}

    return {
        "ticker": result[0],
        "date": result[1],
        "metrics": {
            "pe_ratio": result[2],
            "pb_ratio": result[3],
            "debt_to_equity": result[4],
            "roe": result[5],
            "revenue_growth_yoy": result[6],
            "profit_margin": result[7],
            ...
        }
    }

@router.get("/quality")
async def get_fundamental_quality(ticker: str):
    """Get fundamental quality score (A-F)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT quality_score, signal, confidence, dt
        FROM model_b_fundamentals_signals
        WHERE ticker = %s
        ORDER BY dt DESC
        LIMIT 1
    """, (ticker,))

    result = cursor.fetchone()
    cursor.close()
    conn.close()

    if not result:
        return {"error": "No quality score available"}

    return {
        "ticker": ticker,
        "quality_score": result[0],
        "signal": result[1],
        "confidence": result[2],
        "date": result[3]
    }
```

2. Create ensemble endpoint `app/routes/signals.py`:
```python
@router.get("/ensemble")
async def get_ensemble_signals():
    """Get ensemble signals (Model A + B combined)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            a.ticker,
            a.signal AS model_a_signal,
            a.confidence AS model_a_confidence,
            b.quality_score AS model_b_quality,
            b.confidence AS model_b_confidence,
            a.dt
        FROM model_a_ml_signals a
        LEFT JOIN model_b_fundamentals_signals b
            ON a.ticker = b.ticker AND a.dt = b.dt
        WHERE a.dt = (SELECT MAX(dt) FROM model_a_ml_signals)
        ORDER BY a.expected_return DESC
    """)

    results = cursor.fetchall()
    cursor.close()
    conn.close()

    # Compute ensemble signals
    ensemble_results = []
    for row in results:
        ensemble = ensemble_signals(
            Signal[row[1]], row[3], row[2], row[4]
        )
        ensemble_results.append({
            "ticker": row[0],
            "model_a_signal": row[1],
            "model_b_quality": row[3],
            "ensemble_signal": ensemble['signal'].name,
            "ensemble_confidence": ensemble['confidence'],
            "conflict": ensemble['conflict'],
            "date": row[5]
        })

    return ensemble_results
```

3. Add routes to `app/main.py`:
```python
from app.routes import fundamentals
app.include_router(fundamentals.router)
```

4. Create API tests `tests/test_fundamentals_api.py`:
```python
def test_get_fundamental_metrics():
    """Test GET /fundamentals/metrics"""
    response = client.get("/fundamentals/metrics?ticker=CBA")
    assert response.status_code == 200
    assert "pe_ratio" in response.json()["metrics"]

def test_get_ensemble_signals():
    """Test GET /signals/ensemble"""
    response = client.get("/signals/ensemble")
    assert response.status_code == 200
    assert len(response.json()) > 0
    assert "ensemble_signal" in response.json()[0]
```

5. Run tests: `pytest tests/test_fundamentals_api.py`

**Deliverable**: 5 new API endpoints operational

---

## PHASE 5: FRONTEND UPDATES (Week 9-10)

### Task 5.1: Dual Signal Display on Dashboard

**Estimated Time**: 8 hours

**Acceptance Criteria**:
- [ ] Dashboard shows Model A + Model B columns
- [ ] Conflict indicator (⚠️) when models disagree
- [ ] Filter: "Only show stocks where models agree"
- [ ] Tooltip explains dual signals

**Steps**:
1. Update API client `frontend/lib/api-client.ts`:
```typescript
export interface EnsembleSignal {
  ticker: string;
  model_a_signal: string;
  model_b_quality: string;
  ensemble_signal: string;
  ensemble_confidence: number;
  conflict: boolean;
  date: string;
}

export async function getEnsembleSignals(): Promise<EnsembleSignal[]> {
  const response = await fetch(`${API_URL}/signals/ensemble`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return response.json();
}
```

2. Update dashboard component `frontend/components/DashboardClient.tsx`:
```typescript
const DashboardClient = () => {
  const [signals, setSignals] = useState<EnsembleSignal[]>([]);
  const [filterAgreement, setFilterAgreement] = useState(false);

  useEffect(() => {
    getEnsembleSignals().then(setSignals);
  }, []);

  const filteredSignals = filterAgreement
    ? signals.filter(s => !s.conflict)
    : signals;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <label>
          <input
            type="checkbox"
            checked={filterAgreement}
            onChange={(e) => setFilterAgreement(e.target.checked)}
          />
          Only show stocks where models agree
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Model A (Momentum)</th>
            <th>Model B (Fundamentals)</th>
            <th>Ensemble Signal</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {filteredSignals.map(signal => (
            <tr key={signal.ticker}>
              <td>{signal.ticker}</td>
              <td>
                <SignalBadge signal={signal.model_a_signal} />
              </td>
              <td>
                <QualityBadge quality={signal.model_b_quality} />
              </td>
              <td>
                <SignalBadge signal={signal.ensemble_signal} />
                {signal.conflict && <span title="Models disagree">⚠️</span>}
              </td>
              <td>{(signal.ensemble_confidence * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

3. Create QualityBadge component:
```typescript
const QualityBadge = ({ quality }: { quality: string }) => {
  const colors = {
    'A': 'bg-green-500',
    'B': 'bg-blue-500',
    'C': 'bg-yellow-500',
    'D': 'bg-orange-500',
    'F': 'bg-red-500'
  };
  return (
    <span className={`px-2 py-1 rounded text-white ${colors[quality]}`}>
      {quality}
    </span>
  );
};
```

**Deliverable**: Dashboard displays dual signals

---

### Task 5.2: Stock Detail Page - Fundamentals Tab

**Estimated Time**: 6 hours

**Acceptance Criteria**:
- [ ] Stock detail page has "Fundamentals" tab
- [ ] Displays P/E, P/B, ROE, revenue growth, etc.
- [ ] Shows Model B quality score
- [ ] Explains what each metric means

**Steps**:
1. Update stock detail page `frontend/app/stock/[ticker]/page.tsx`:
```typescript
const StockDetailPage = ({ params }: { params: { ticker: string } }) => {
  const [tab, setTab] = useState<'signals' | 'fundamentals'>('signals');
  const [fundamentals, setFundamentals] = useState(null);

  useEffect(() => {
    if (tab === 'fundamentals') {
      getFundamentalMetrics(params.ticker).then(setFundamentals);
    }
  }, [tab, params.ticker]);

  return (
    <div>
      <div className="tabs">
        <button onClick={() => setTab('signals')}>Signals</button>
        <button onClick={() => setTab('fundamentals')}>Fundamentals</button>
      </div>

      {tab === 'signals' && <SignalsTab ticker={params.ticker} />}
      {tab === 'fundamentals' && fundamentals && (
        <FundamentalsTab data={fundamentals} />
      )}
    </div>
  );
};

const FundamentalsTab = ({ data }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        label="P/E Ratio"
        value={data.metrics.pe_ratio}
        tooltip="Price-to-Earnings: How much investors pay per dollar of earnings"
      />
      <MetricCard
        label="P/B Ratio"
        value={data.metrics.pb_ratio}
        tooltip="Price-to-Book: Stock price vs book value"
      />
      <MetricCard
        label="ROE"
        value={`${(data.metrics.roe * 100).toFixed(1)}%`}
        tooltip="Return on Equity: How efficiently company uses shareholder capital"
      />
      <MetricCard
        label="Debt/Equity"
        value={data.metrics.debt_to_equity}
        tooltip="Total debt divided by total equity"
      />
      <MetricCard
        label="Revenue Growth"
        value={`${(data.metrics.revenue_growth_yoy * 100).toFixed(1)}%`}
        tooltip="Year-over-year revenue growth rate"
      />
      <MetricCard
        label="Profit Margin"
        value={`${(data.metrics.profit_margin * 100).toFixed(1)}%`}
        tooltip="Net income as percentage of revenue"
      />
    </div>
  );
};
```

**Deliverable**: Stock detail page shows fundamentals

---

### Task 5.3: Portfolio - Fundamental Quality Column

**Estimated Time**: 4 hours

**Acceptance Criteria**:
- [ ] Portfolio holdings table has "Quality" column
- [ ] Shows A-F quality score per holding
- [ ] Quality distribution chart (how many A's, B's, etc.)
- [ ] Average quality score displayed

**Steps**:
1. Update portfolio API to include quality:
```python
@router.get("/holdings")
async def get_holdings(user_id: str):
    """Get portfolio holdings with signals and quality"""
    cursor.execute("""
        SELECT
            h.ticker, h.shares, h.avg_cost,
            a.signal AS model_a_signal,
            b.quality_score AS quality
        FROM holdings h
        LEFT JOIN model_a_ml_signals a ON h.ticker = a.ticker
        LEFT JOIN model_b_fundamentals_signals b ON h.ticker = b.ticker
        WHERE h.user_id = %s
    """, (user_id,))
    ...
```

2. Update portfolio component `frontend/components/PortfolioFusionClient.tsx`:
```typescript
const PortfolioTable = ({ holdings }) => {
  const qualityDistribution = useMemo(() => {
    const counts = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0};
    holdings.forEach(h => counts[h.quality]++);
    return counts;
  }, [holdings]);

  const avgQualityScore = useMemo(() => {
    const scores = {'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1};
    const total = holdings.reduce((sum, h) => sum + scores[h.quality], 0);
    return (total / holdings.length).toFixed(1);
  }, [holdings]);

  return (
    <div>
      <div className="mb-4">
        <h3>Portfolio Quality: {avgQualityScore}/5.0</h3>
        <QualityDistributionChart data={qualityDistribution} />
      </div>

      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Shares</th>
            <th>Signal</th>
            <th>Quality</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map(h => (
            <tr key={h.ticker}>
              <td>{h.ticker}</td>
              <td>{h.shares}</td>
              <td><SignalBadge signal={h.signal} /></td>
              <td><QualityBadge quality={h.quality} /></td>
              <td>${h.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

**Deliverable**: Portfolio shows fundamental quality

---

### Task 5.4: Models Page - Comparison Chart

**Estimated Time**: 6 hours

**Acceptance Criteria**:
- [ ] Models page shows Model A vs Model B performance
- [ ] Agreement rate chart (% of time models agree)
- [ ] Ensemble performance vs single models
- [ ] Historical accuracy over time

**Steps**:
1. Create comparison endpoint:
```python
@router.get("/model/compare_ensemble")
async def compare_ensemble():
    """Compare Model A vs B vs Ensemble performance"""
    # Calculate agreement rate
    cursor.execute("""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN ABS(a.signal_numeric - b.signal_numeric) <= 1 THEN 1 ELSE 0 END) AS agreements
        FROM model_a_ml_signals a
        JOIN model_b_fundamentals_signals b ON a.ticker = b.ticker AND a.dt = b.dt
    """)
    ...
```

2. Update models page `frontend/app/models/page.tsx`:
```typescript
const ModelsPage = () => {
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    fetch('/api/model/compare_ensemble').then(r => r.json()).then(setComparison);
  }, []);

  return (
    <div>
      <h1>Model Comparison</h1>

      <div className="grid grid-cols-3 gap-4">
        <ModelCard
          name="Model A (Momentum)"
          accuracy={comparison?.model_a_accuracy}
          description="Technical analysis based on price momentum"
        />
        <ModelCard
          name="Model B (Fundamentals)"
          accuracy={comparison?.model_b_accuracy}
          description="Fundamental analysis based on financial metrics"
        />
        <ModelCard
          name="Ensemble (A + B)"
          accuracy={comparison?.ensemble_accuracy}
          description="Combined momentum + fundamentals"
        />
      </div>

      <div className="mt-8">
        <h2>Agreement Rate</h2>
        <p>Models agree {comparison?.agreement_rate}% of the time</p>
        <AgreementChart data={comparison?.agreement_over_time} />
      </div>
    </div>
  );
};
```

**Deliverable**: Models page shows comparison

---

## PHASE 6: TESTING & DEPLOYMENT (Week 11-12)

### Task 6.1: Integration Testing

**Estimated Time**: 8 hours

**Acceptance Criteria**:
- [ ] End-to-end test passing
- [ ] Load test (100 req/min) passing
- [ ] Data quality monitoring in place
- [ ] All API endpoints return <500ms

**Steps**:
1. Create E2E test script:
```bash
#!/bin/bash
# Test full V2 pipeline

# Step 1: Sync fundamentals
python jobs/sync_fundamentals.py
if [ $? -ne 0 ]; then
  echo "Fundamentals sync failed"
  exit 1
fi

# Step 2: Generate Model B signals
python jobs/generate_model_b_signals.py
if [ $? -ne 0 ]; then
  echo "Model B signal generation failed"
  exit 1
fi

# Step 3: Test API endpoints
curl -X GET "http://localhost:8788/fundamentals/metrics?ticker=CBA" | jq .
curl -X GET "http://localhost:8788/signals/ensemble" | jq '. | length'

echo "E2E test passed"
```

2. Load test with `locust`:
```python
from locust import HttpUser, task

class APIUser(HttpUser):
    @task
    def get_ensemble_signals(self):
        self.client.get("/signals/ensemble")

    @task
    def get_fundamentals(self):
        self.client.get("/fundamentals/metrics?ticker=CBA")
```

3. Run load test: `locust -f tests/load_test.py --host=http://localhost:8788`

**Deliverable**: All tests passing

---

### Task 6.2: Documentation

**Estimated Time**: 4 hours

**Acceptance Criteria**:
- [ ] README updated with Model B
- [ ] API docs updated with new endpoints
- [ ] Model B guide created

**Steps**:
1. Update `README.md`:
```markdown
## Features

### ✅ V2: Fundamental Intelligence (May 2026)
- **Model B (Fundamental Analysis)**: Quality scores based on P/E, ROE, debt ratios
  - Quality scores: A (best) to F (worst)
  - Features: 10 fundamental metrics normalized by sector
- **Dual-Signal System**: Momentum (Model A) + Fundamentals (Model B)
- **Ensemble Strategy**: Weighted combination (60% momentum, 40% fundamentals)
- **Conflict Detection**: Warns when models disagree
```

2. Create `docs/MODEL_B_GUIDE.md`:
```markdown
# Model B: Fundamental Analysis Guide

## What is Model B?

Model B analyzes company fundamentals (P/E ratio, debt, profitability) to assess quality.

## How it Works

1. Collect fundamental data (P/E, ROE, debt/equity, etc.)
2. Normalize by sector (financials have different P/E than tech)
3. Classify stocks into quintiles (A, B, C, D, F)
4. Combine with Model A (momentum) using ensemble

## What Metrics Matter

- **P/E Ratio**: Lower is better (stock is cheaper relative to earnings)
- **ROE**: Higher is better (company efficiently uses capital)
- **Debt/Equity**: Lower is better (less financial risk)
- **Revenue Growth**: Higher is better (company is growing)

## When to Use Model B

- Filter out value traps (stocks with good momentum but terrible fundamentals)
- Find quality stocks with both momentum and solid financials
- Understand why a stock is rated A vs F
```

3. Update `API_DOCUMENTATION.md` with new endpoints

**Deliverable**: Documentation complete

---

### Task 6.3: Deployment

**Estimated Time**: 6 hours

**Acceptance Criteria**:
- [ ] Backend deployed to Render staging
- [ ] Integration tests passing on staging
- [ ] Backend deployed to production
- [ ] Frontend deployed to Vercel
- [ ] Smoke test passing on production

**Steps**:
1. Deploy to staging:
```bash
git checkout -b v2-deployment
git push origin v2-deployment

# Render auto-deploys staging branch
```

2. Run integration tests on staging:
```bash
API_URL=https://staging-asx-portfolio-os.onrender.com pytest tests/test_fundamentals_api.py
```

3. Deploy to production:
```bash
git checkout main
git merge v2-deployment
git push origin main

# Render auto-deploys main branch
```

4. Deploy frontend:
```bash
cd frontend
vercel --prod
```

5. Smoke test:
```bash
# Visit https://asx-portfolio-os.vercel.app
# Upload portfolio
# Check dashboard shows dual signals
# Verify fundamentals tab on stock detail page
```

**Deliverable**: V2 deployed to production

---

### Task 6.4: Monitoring & Alerts

**Estimated Time**: 4 hours

**Acceptance Criteria**:
- [ ] Fundamentals sync failure alerts configured
- [ ] Model B signal distribution monitored
- [ ] Ensemble agreement rate tracked
- [ ] API latency monitored (<500ms)

**Steps**:
1. Configure Sentry alerts:
   - Fundamentals sync failures
   - Model B signal generation failures
   - API 5xx errors

2. Add monitoring script `jobs/monitor_v2.py`:
```python
def monitor_v2_health():
    """Monitor V2 system health"""
    # Check fundamentals data freshness
    cursor.execute("SELECT MAX(dt) FROM model_b_fundamentals_data")
    latest_date = cursor.fetchone()[0]
    if (datetime.now().date() - latest_date).days > 7:
        send_alert("Fundamentals data is stale (>7 days old)")

    # Check Model B signal distribution
    cursor.execute("""
        SELECT quality_score, COUNT(*)
        FROM model_b_fundamentals_signals
        WHERE dt = (SELECT MAX(dt) FROM model_b_fundamentals_signals)
        GROUP BY quality_score
    """)
    distribution = dict(cursor.fetchall())

    # Alert if distribution is skewed (e.g., 90% are A)
    total = sum(distribution.values())
    if distribution.get('A', 0) / total > 0.5:
        send_alert("Model B signal distribution is skewed (>50% A)")

    # Check ensemble agreement rate
    cursor.execute("""
        SELECT
            SUM(CASE WHEN conflict = false THEN 1 ELSE 0 END)::FLOAT / COUNT(*)
        FROM ensemble_signals
    """)
    agreement_rate = cursor.fetchone()[0]
    if agreement_rate < 0.6 or agreement_rate > 0.8:
        send_alert(f"Ensemble agreement rate is {agreement_rate:.1%} (expected 60-80%)")
```

3. Schedule monitoring: `0 9 * * * python jobs/monitor_v2.py` (daily)

**Deliverable**: Monitoring configured

---

## V2 SUCCESS CRITERIA

### Technical Metrics

- [ ] Model B precision >65% on top quintile: **Target: 68%**
- [ ] Ensemble Sharpe ratio 5%+ higher than Model A: **Target: 8% improvement**
- [ ] API latency <500ms for all endpoints: **Target: <400ms**
- [ ] Fundamentals data freshness <7 days: **Target: <2 days**
- [ ] Zero critical errors in first week: **Target: 0**

### User Metrics

- [ ] 100+ users try dual-signal system: **Target: 150**
- [ ] 20+ users use "models agree" filter: **Target: 30**
- [ ] Positive feedback on fundamental quality score: **Target: 80% satisfaction**
- [ ] Signal distribution stable (not all HOLD): **Target: <40% HOLD**

### Business Metrics

- [ ] User engagement increases (DAU/MAU): **Target: 10% increase**
- [ ] Portfolio uploads increase: **Target: 20% increase**
- [ ] Feature request: "Add Model C (sentiment)": **Target: 5+ requests**

---

## RISKS & MITIGATION

### Technical Risks

1. **Fundamentals API Rate Limits**
   - Risk: Hit rate limits, data becomes stale
   - Mitigation: Cache fundamentals for 7 days, batch requests

2. **Model B Overfitting**
   - Risk: Model performs well in backtest, poorly in production
   - Mitigation: Walk-forward validation, sector-balanced training

3. **Ensemble Complexity**
   - Risk: Users confused by dual signals
   - Mitigation: Clear UI ("Momentum: BUY, Fundamentals: A"), tooltips

4. **API Latency**
   - Risk: Adding Model B queries slows down dashboard
   - Mitigation: Pre-compute ensemble signals, cache aggressively

### User Trust Risks

1. **Model Disagreement Confusion**
   - Risk: Users don't know which signal to follow when A says BUY, B says SELL
   - Mitigation: Show ensemble signal prominently, explain conflicts

2. **Fundamental Data Lag**
   - Risk: Fundamentals updated quarterly, can be 3+ months old
   - Mitigation: Show data date, explain "fundamentals change slowly"

3. **Over-Reliance on Quality Score**
   - Risk: Users think "A" means "guaranteed winner"
   - Mitigation: Disclaimers, show "A-rated stocks outperform 65% of time, not 100%"

---

## TIMELINE

| Week | Phase | Tasks | Deliverable |
|------|-------|-------|-------------|
| 1 | Data Infrastructure | Set up API, ingestion pipeline | Fundamentals data syncing |
| 2 | Data Infrastructure | Validation, tests | Tests passing |
| 3-4 | Model B Training | Feature engineering, training | Model B trained |
| 5 | Model B Training | Validation, backtest | Model B validated |
| 6 | Ensemble | Implement ensemble logic, backtest | Ensemble validated |
| 7-8 | Backend API | Signal generation, 5 endpoints | APIs operational |
| 9-10 | Frontend | Dual signals, fundamentals tab | Frontend updated |
| 11-12 | Testing & Deployment | Integration tests, deployment | V2 live in production |

**Total**: 12 weeks (Q2 2026)

---

## POST-V2 LAUNCH

### Week 1 Post-Launch

- [ ] Monitor for errors (Sentry)
- [ ] Track signal distribution (not all HOLD)
- [ ] Gather user feedback ("Was this helpful?")
- [ ] Fix critical bugs within 24 hours

### Month 1 Post-Launch

- [ ] Analyze user behavior (which filters are used?)
- [ ] A/B test: Ensemble weights (60/40 vs 50/50)
- [ ] Optimize API latency (<400ms)
- [ ] Plan V3 (Sentiment & News)

### Month 2-3 (V2 Iteration)

- [ ] Expand fundamentals coverage (500 → 2000 stocks)
- [ ] Add more fundamental metrics (cash flow, book value)
- [ ] Improve ensemble meta-learner (learn optimal weights)
- [ ] User research for V3 features

---

## CONCLUSION

V2 adds fundamental analysis to complement momentum signals, providing users with a dual-signal system that catches both technical and fundamental opportunities.

**Claude Code Bootstrap Approach**:
- **Time**: 4 weeks of focused work with Claude Code (~160 hours)
- **Cost**: $0-$150 (vs $70,650 with traditional team)
- **Priorities**: Data quality, model performance >65%, clear UX, <500ms latency

**Bootstrap Decision Matrix**:

| Aspect | Free Option | Cost | Paid Option | Cost |
|--------|-------------|------|-------------|------|
| **Data Source** | yfinance | $0 | EODHD API | $150 |
| **Pros** | Zero cost, quick setup | | Reliable, comprehensive | |
| **Cons** | Rate limits, less stable | | $150 cost | |
| **Recommendation** | Start here, upgrade if needed | | Upgrade if users complain about data | |

**Implementation with Claude Code**:
1. Prompt Claude Code to create data pipeline (Task 1.1-1.3)
2. Prompt Claude Code to train Model B (Task 2.1-2.3)
3. Prompt Claude Code to implement ensemble (Task 3.1-3.2)
4. Prompt Claude Code to create APIs (Task 4.1-4.4)
5. Prompt Claude Code to update frontend (Task 5.1-5.4)
6. Review, test, deploy (Task 6.1-6.4)

**Next**: After V2 launch, plan V3 (Sentiment & News) based on user feedback.

---

**Prepared By**: Claude Code Bootstrap Plan
**Date**: January 28, 2026
**Investment**: $0-$150 (infrastructure only)
**Your Time**: 4 weeks with Claude Code
**Status**: Ready for execution
