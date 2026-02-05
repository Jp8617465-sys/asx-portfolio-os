# Signals Feature Tests

Comprehensive unit tests for the signals feature (repository and service layers) following TDD best practices.

## Test Files

### repositories/__tests__/test_signal_repository.py
Tests for `SignalRepository` - ML signal data persistence and retrieval

**Coverage**: 89% (160/179 statements)

**Test Classes**:
- `TestSignalRepositoryInit`: Repository initialization
- `TestGetLiveSignals`: Live signal retrieval with filters (5 tests)
- `TestGetSignalByTicker`: Ticker-specific signal lookup (5 tests)
- `TestGetSignalReasoning`: SHAP-based signal explanations (2 tests)
- `TestPersistSignals`: Bulk signal persistence with upserts (3 tests)
- `TestGetAccuracyMetrics`: Historical accuracy calculation (3 tests)
- `TestRegisterModelRun`: Model registry operations (2 tests)
- `TestPersistDriftAudit`: Drift metrics persistence (1 test)
- `TestGetDriftSummary`: Drift audit retrieval (3 tests)
- `TestGetModelStatus`: Comprehensive model status (2 tests)
- `TestErrorHandling`: Database error scenarios (3 tests)
- `TestSQLQueryCorrectness`: SQL query validation (2 tests)

**Total Tests**: 33

**Key Features Tested**:
- Automatic .AX suffix handling for ASX tickers
- Date-based signal filtering
- JSONB field handling (SHAP values, metrics)
- Bulk insert with ON CONFLICT upserts
- Complex JOIN queries for accuracy metrics
- Model registry and drift audit tracking

### services/__tests__/test_signal_service.py
Tests for `SignalService` - ML signal business logic and workflows

**Coverage**: 87% (99/114 statements)

**Test Classes**:
- `TestSignalServiceInit`: Service initialization with DI
- `TestGetLiveSignals`: Live signal retrieval with event publishing (3 tests)
- `TestGetSignalForTicker`: Ticker-specific signal lookup (3 tests)
- `TestGetSignalWithReasoning`: Signal explanations with SHAP (3 tests)
- `TestParseFeatureContributions`: Feature ranking logic (3 tests)
- `TestPersistModelRun`: Model run persistence with registry (3 tests)
- `TestRegisterModelRun`: Model registration workflow (2 tests)
- `TestPersistDriftAudit`: Drift detection and alerting (4 tests)
- `TestGetDriftSummary`: Drift summary retrieval (2 tests)
- `TestGetModelStatus`: Model health checks (1 test)
- `TestGetAccuracyMetrics`: Accuracy calculation (1 test)
- `TestServiceIntegration`: Complete workflows (2 tests)
- `TestErrorHandlingAndLogging`: Error resilience (2 tests)
- `TestEventPublishing`: Event structure validation (3 tests)

**Total Tests**: 35

**Key Features Tested**:
- Async service methods
- Event publishing after operations
- Drift detection thresholds (PSI > 0.1 = medium, > 0.25 = high)
- Top 10 feature limiting for explanations
- Repository dependency injection
- Error handling without breaking flow

## Running Tests

Run all signals tests:
```bash
python -m pytest app/features/signals/ -v
```

Run with coverage:
```bash
python -m pytest app/features/signals/ --cov=app/features/signals --cov-report=term-missing
```

Run repository tests only:
```bash
python -m pytest app/features/signals/repositories/__tests__/ -v
```

Run service tests only:
```bash
python -m pytest app/features/signals/services/__tests__/ -v
```

## Test Patterns

### Repository Tests
- Mock `db_context` and cursor operations
- Verify SQL query structure and parameters
- Test `execute_values` for bulk operations
- Validate JSONB handling
- Test date parsing and filtering

### Service Tests
- Mock `SignalRepository` for isolation
- Mock `event_bus` to verify event publishing
- Test async/await patterns with pytest-asyncio
- Verify business logic without database
- Test error propagation and logging

### Fixtures
- `mock_db_context`: Database connection mock
- `mock_repository`: SignalRepository mock
- `mock_event_bus`: Event bus for async events
- `mock_logger`: Logger verification
- `repository`/`service`: Test instances

## Coverage Notes

**Missing Coverage**:
- Repository: Error paths in some query methods (212-214, 241, 279-281, etc.)
- Service: Error handlers in async operations (423-425, 490-492, etc.)
- These are primarily exception handlers that are difficult to trigger in unit tests

**High Coverage Areas**:
- All main business logic paths: 100%
- Event publishing: 100%
- SQL query construction: 100%
- CRUD operations: 100%

## Event Publishing

The service publishes these events:
- `SIGNAL_GENERATED`: After retrieving/persisting signals
- `MODEL_DRIFT_DETECTED`: When PSI > 0.1 or max PSI > 0.25
- `JOB_COMPLETED`: After model registration

Event structure is validated in `TestEventPublishing` class.

## Drift Detection

Drift thresholds tested:
- **Low drift** (PSI < 0.1, max < 0.25): No event
- **Medium drift** (PSI > 0.1, max < 0.25): Event with severity="medium"
- **High drift** (max PSI > 0.25): Event with severity="high"
