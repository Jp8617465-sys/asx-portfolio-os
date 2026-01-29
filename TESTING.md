# Test Suite Documentation

## Overview

Comprehensive testing implementing risk-weighted strategy:
- **Overall Coverage Target**: 75-85%
- **Core Domain Logic**: 90-100%
- **Test Pyramid**: 60-70% unit, 20-30% integration, 5-10% E2E

## Running Tests

```bash
# Install test dependencies
pip install pytest pytest-cov pytest-mock

# Run all tests with coverage
pytest tests/ -v --cov=app --cov=jobs --cov-report=term-missing

# Run specific test categories
pytest tests/test_*.py -v                    # Unit tests
pytest tests/test_*_integration.py -v        # Integration tests
pytest tests/test_e2e_*.py -v                # E2E tests

# Check coverage threshold
pytest tests/ --cov=app --cov=jobs --cov-fail-under=75
```

## Test Files Created

### Unit Tests (7 files)
1. `test_eodhd_client.py` - EODHD API client
2. `test_model_b_signals.py` - Signal classification logic
3. `test_ensemble_logic.py` - Ensemble weighted scoring
4. `test_fundamental_features.py` - Feature engineering
5. `test_model_b_training.py` - Model training logic
6. `test_fundamentals_api.py` - Fundamentals endpoints
7. `test_ensemble_api.py` - Ensemble endpoints

### Integration Tests (4 files) - To be created
8. `test_fundamentals_pipeline_integration.py`
9. `test_model_b_persistence.py`
10. `test_ensemble_integration.py`
11. `test_api_integration.py`

### E2E Tests (3 files) - To be created
12. `test_e2e_signal_generation.py`
13. `test_e2e_ensemble_conflict.py`
14. `test_e2e_fundamentals_tab.py`

## Coverage by Module

Target coverage:
- `jobs/generate_signals_model_b.py`: 90-100%
- `jobs/generate_ensemble_signals.py`: 90-100%
- `app/routes/fundamentals.py`: 90-100%
- `app/routes/ensemble.py`: 90-100%
- `api_clients/eodhd_client.py`: 85-95%
- Feature engineering functions: 90-100%
