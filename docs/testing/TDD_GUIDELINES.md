# Test-Driven Development (TDD) Guidelines

**Guide Version:** 1.0
**Last Updated:** 2024-02-05
**Status:** Active Standard

## Table of Contents

1. [TDD Philosophy](#tdd-philosophy)
2. [RED-GREEN-REFACTOR Cycle](#red-green-refactor-cycle)
3. [Test Coverage Requirements](#test-coverage-requirements)
4. [Testing Patterns](#testing-patterns)
5. [Mocking Strategies](#mocking-strategies)
6. [Integration Testing](#integration-testing)
7. [Performance Testing](#performance-testing)
8. [Test Organization](#test-organization)

---

## TDD Philosophy

Test-Driven Development is the **primary development methodology** for ASX Portfolio OS. Every feature follows the TDD cycle to ensure:

- ✅ **High Code Quality**: Tests catch bugs before they reach production
- ✅ **Confidence in Refactoring**: Comprehensive tests enable safe refactoring
- ✅ **Living Documentation**: Tests document expected behavior
- ✅ **Design Feedback**: Writing tests first improves API design

### Core Principle

> **Write tests first, then write the minimal code to make them pass.**

This ensures:
1. We only write necessary code
2. Every line of code is tested
3. APIs are designed for usability (not implementation)

---

## RED-GREEN-REFACTOR Cycle

The TDD workflow follows three distinct phases:

```
┌─────────────────────────────────────────┐
│         RED → GREEN → REFACTOR          │
└─────────────────────────────────────────┘

1. RED:      Write a failing test
2. GREEN:    Write minimal code to pass
3. REFACTOR: Improve code quality
```

### Phase 1: RED - Write a Failing Test

**Write a test for the feature you want to add.**

The test should **fail** initially because the feature doesn't exist yet.

```python
# test_signal_repository.py

def test_get_live_signals_returns_latest_signals(mock_db_context):
    """Test that get_live_signals returns signals for the latest date."""
    # Arrange
    repo = SignalRepository()
    mock_cursor = mock_db_context['cursor']

    # Setup mock response
    mock_cursor.fetchone.return_value = {'max_date': date(2024, 1, 15)}
    mock_cursor.fetchall.return_value = [
        {'symbol': 'BHP.AX', 'rank': 1, 'score': 0.95}
    ]

    # Act
    result = repo.get_live_signals(model="model_a_ml", limit=20)

    # Assert
    assert result['count'] == 1
    assert result['signals'][0]['symbol'] == 'BHP.AX'
```

**Run the test - it should FAIL:**

```bash
pytest app/features/signals/repositories/__tests__/test_signal_repository.py::test_get_live_signals_returns_latest_signals -v

# Expected output:
# FAILED - AttributeError: 'SignalRepository' object has no attribute 'get_live_signals'
```

### Phase 2: GREEN - Write Minimal Code

**Write the simplest code that makes the test pass.**

Don't worry about perfect code yet - just make it work.

```python
# signal_repository.py

class SignalRepository(BaseRepository):
    def __init__(self):
        super().__init__('model_a_ml_signals')

    def get_live_signals(
        self,
        model: str = "model_a_ml",
        limit: int = 20,
        as_of: Optional[date] = None
    ) -> Dict[str, Any]:
        """Retrieve live signals for a model."""
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Get latest date
            if as_of is None:
                cur.execute(
                    "SELECT MAX(as_of) as max_date FROM model_a_ml_signals WHERE model = %s",
                    (model,)
                )
                as_of = cur.fetchone()['max_date']

            # Get signals
            cur.execute(
                "SELECT symbol, rank, score FROM model_a_ml_signals "
                "WHERE model = %s AND as_of = %s ORDER BY rank ASC LIMIT %s",
                (model, as_of, limit)
            )
            rows = cur.fetchall()

        return {
            "as_of": as_of,
            "signals": [dict(row) for row in rows],
            "count": len(rows)
        }
```

**Run the test - it should PASS:**

```bash
pytest app/features/signals/repositories/__tests__/test_signal_repository.py::test_get_live_signals_returns_latest_signals -v

# Expected output:
# PASSED ✅
```

### Phase 3: REFACTOR - Improve Code Quality

**Now that tests pass, improve the code.**

Add:
- Better error handling
- Logging
- Documentation
- Performance optimizations

```python
def get_live_signals(
    self,
    model: str = "model_a_ml",
    limit: int = 20,
    as_of: Optional[date] = None
) -> Dict[str, Any]:
    """
    Retrieve live signals for a given model.

    Args:
        model: Model name to filter signals
        limit: Maximum number of signals to return
        as_of: Specific date to retrieve signals for

    Returns:
        Dictionary containing signals, date, and count

    Raises:
        Exception: If no signals are available

    Example:
        >>> repo = SignalRepository()
        >>> result = repo.get_live_signals(limit=10)
        >>> print(result['count'])
        10
    """
    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Determine as_of date if not provided
            if as_of is None:
                cur.execute(
                    """
                    SELECT MAX(as_of) as max_date
                    FROM model_a_ml_signals
                    WHERE model = %s
                    """,
                    (model,)
                )
                row = cur.fetchone()
                if not row or not row['max_date']:
                    logger.warning(f"No signals found for model: {model}")
                    raise Exception(f"No signals available for model: {model}")
                as_of = row['max_date']

            # Retrieve signals for the determined date
            cur.execute(
                """
                SELECT symbol, rank, score, ml_prob, ml_expected_return
                FROM model_a_ml_signals
                WHERE model = %s AND as_of = %s
                ORDER BY rank ASC
                LIMIT %s
                """,
                (model, as_of, limit)
            )
            rows = cur.fetchall()

            signals = [dict(row) for row in rows]

            logger.info(f"Retrieved {len(signals)} signals for model={model}, as_of={as_of}")

            return {
                "as_of": as_of,
                "signals": signals,
                "count": len(signals)
            }

    except Exception as e:
        logger.error(f"Error retrieving live signals: {e}")
        raise
```

**Run tests again - should still PASS:**

```bash
pytest app/features/signals/repositories/__tests__/test_signal_repository.py -v

# All tests should pass ✅
```

---

## Test Coverage Requirements

### Target Coverage Levels

| Component | Minimum Coverage | Target |
|-----------|-----------------|--------|
| **Repositories** | 90% | 95% |
| **Services** | 85% | 90% |
| **Routes/APIs** | 70% | 80% |
| **Utilities** | 70% | 80% |
| **Overall** | 85% | 90% |

### Coverage Tools

```bash
# Install coverage tools
pip install pytest-cov coverage

# Run tests with coverage report
pytest --cov=app --cov-report=html --cov-report=term

# Open HTML report
open htmlcov/index.html

# Generate coverage badge
coverage-badge -o coverage.svg
```

### Coverage by Line vs Branch

```bash
# Line coverage (simpler)
pytest --cov=app --cov-report=term

# Branch coverage (stricter - tests all if/else paths)
pytest --cov=app --cov-branch --cov-report=term
```

### What to Test

**DO Test:**
- ✅ Business logic (service methods)
- ✅ Data access (repository queries)
- ✅ Edge cases (empty lists, None values)
- ✅ Error handling (exceptions, validation)
- ✅ Integration points (API routes, event handlers)

**DON'T Test:**
- ❌ Third-party library internals
- ❌ Python standard library
- ❌ Simple getters/setters
- ❌ Configuration files

---

## Testing Patterns

### 1. Arrange-Act-Assert (AAA) Pattern

Structure every test in three phases:

```python
def test_signal_service_get_live_signals():
    # ARRANGE: Setup test data and mocks
    service = SignalService()
    mock_repo = Mock()
    mock_repo.get_live_signals.return_value = {
        "as_of": date(2024, 1, 15),
        "signals": [{"symbol": "BHP.AX"}],
        "count": 1
    }
    service.repo = mock_repo

    # ACT: Execute the method under test
    result = await service.get_live_signals(model="model_a_ml")

    # ASSERT: Verify expected behavior
    assert result['status'] == 'ok'
    assert result['count'] == 1
    mock_repo.get_live_signals.assert_called_once()
```

### 2. One Assertion Per Test (Preferred)

**Good (focused test):**
```python
def test_signal_repository_get_live_signals_returns_correct_count():
    """Test that get_live_signals returns correct count."""
    result = repo.get_live_signals(limit=20)
    assert result['count'] == 20

def test_signal_repository_get_live_signals_orders_by_rank():
    """Test that signals are ordered by rank."""
    result = repo.get_live_signals()
    ranks = [s['rank'] for s in result['signals']]
    assert ranks == sorted(ranks)
```

**Acceptable (related assertions):**
```python
def test_signal_repository_get_live_signals_structure():
    """Test that response has expected structure."""
    result = repo.get_live_signals()

    # Related assertions about structure
    assert 'as_of' in result
    assert 'signals' in result
    assert 'count' in result
```

### 3. Test Edge Cases

Always test boundary conditions:

```python
class TestSignalRepository:
    def test_get_live_signals_empty_result(self):
        """Test behavior when no signals exist."""
        # Mock empty response
        with pytest.raises(Exception) as exc_info:
            repo.get_live_signals(model="nonexistent_model")

        assert "No signals available" in str(exc_info.value)

    def test_get_live_signals_limit_zero(self):
        """Test behavior with limit=0."""
        result = repo.get_live_signals(limit=0)
        assert result['count'] == 0
        assert result['signals'] == []

    def test_get_live_signals_limit_exceeds_available(self):
        """Test behavior when limit > available signals."""
        result = repo.get_live_signals(limit=10000)
        assert result['count'] <= 10000
```

### 4. Parametrized Tests (DRY)

Use `@pytest.mark.parametrize` to test multiple inputs:

```python
@pytest.mark.parametrize("confidence,expected_signal", [
    (0.80, "STRONG_BUY"),
    (0.65, "BUY"),
    (0.50, "HOLD"),
    (0.30, "SELL"),
    (0.20, "STRONG_SELL"),
])
def test_confidence_to_signal_thresholds(confidence, expected_signal):
    """Test signal threshold conversion for various confidence levels."""
    service = SignalService()
    signal = service._confidence_to_signal(confidence)
    assert signal == expected_signal
```

---

## Mocking Strategies

### When to Mock

**Mock external dependencies:**
- ✅ Database connections
- ✅ HTTP requests
- ✅ File I/O
- ✅ Time/date functions
- ✅ Random number generators

**Don't mock the unit under test:**
- ❌ The method you're testing
- ❌ Simple helper functions in the same class

### Database Mocking

**Pattern 1: Mock db_context**

```python
@pytest.fixture
def mock_db_context():
    """Mock database context manager."""
    with patch('app.core.repository.db_context') as mock_ctx:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        mock_ctx.return_value.__enter__.return_value = mock_conn
        mock_ctx.return_value.__exit__.return_value = None
        mock_conn.cursor.return_value = mock_cursor

        yield {
            'context': mock_ctx,
            'conn': mock_conn,
            'cursor': mock_cursor
        }

def test_with_mocked_db(mock_db_context):
    """Test using mocked database."""
    mock_cursor = mock_db_context['cursor']
    mock_cursor.fetchone.return_value = {'id': 1, 'name': 'test'}

    repo = SignalRepository()
    result = repo.find_by_id(1)

    assert result['name'] == 'test'
```

### Repository Mocking

**Pattern 2: Mock Repository in Service Tests**

```python
@pytest.fixture
def mock_signal_repository():
    """Mock SignalRepository for testing services."""
    mock_repo = Mock(spec=SignalRepository)

    mock_repo.get_live_signals.return_value = {
        "as_of": date(2024, 1, 15),
        "signals": [{"symbol": "BHP.AX", "rank": 1}],
        "count": 1
    }

    return mock_repo

@pytest.mark.asyncio
async def test_signal_service_with_mocked_repo(mock_signal_repository):
    """Test SignalService with mocked repository."""
    # Inject mock repository
    service = SignalService(repository=mock_signal_repository)

    # Test service logic
    result = await service.get_live_signals()

    assert result['status'] == 'ok'
    assert result['count'] == 1

    # Verify repository was called correctly
    mock_signal_repository.get_live_signals.assert_called_once_with(
        model="model_a_ml",
        limit=20,
        as_of=None
    )
```

### Event Bus Mocking

```python
@pytest.mark.asyncio
async def test_service_publishes_event():
    """Test that service publishes event after operation."""
    service = SignalService()

    # Mock event bus
    with patch.object(service, 'publish_event') as mock_publish:
        await service.get_live_signals()

        # Verify event was published
        mock_publish.assert_called_once()

        # Verify event payload
        call_args = mock_publish.call_args
        assert call_args[0][0] == EventType.SIGNAL_GENERATED
        assert 'count' in call_args[0][1]
```

---

## Integration Testing

Integration tests verify that components work together correctly.

### Repository Integration Tests

**Use a test database:**

```python
# conftest.py

@pytest.fixture(scope="session")
def test_database():
    """Setup test database."""
    # Create test DB
    test_db_url = os.getenv("TEST_DATABASE_URL")

    # Run migrations
    subprocess.run(["alembic", "upgrade", "head"])

    yield test_db_url

    # Teardown
    subprocess.run(["alembic", "downgrade", "base"])

@pytest.fixture
def clean_database(test_database):
    """Clean database before each test."""
    # Truncate all tables
    with db_context() as conn:
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE model_a_ml_signals CASCADE")
        conn.commit()

    yield
```

**Integration test example:**

```python
@pytest.mark.integration
def test_signal_repository_persist_and_retrieve(clean_database):
    """Integration test: Persist signals and retrieve them."""
    repo = SignalRepository()

    # Persist signals
    signals = [
        {"symbol": "BHP.AX", "rank": 1, "score": 0.95},
        {"symbol": "CBA.AX", "rank": 2, "score": 0.90}
    ]

    row_count = repo.persist_signals(
        signals=signals,
        model="model_a_ml",
        as_of="2024-01-15"
    )

    assert row_count == 2

    # Retrieve signals
    result = repo.get_live_signals(model="model_a_ml")

    assert result['count'] == 2
    assert result['signals'][0]['symbol'] == 'BHP.AX'
```

### API Integration Tests

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.mark.integration
def test_get_live_signals_endpoint():
    """Integration test for /signals/live endpoint."""
    response = client.get("/signals/live?limit=10")

    assert response.status_code == 200

    data = response.json()
    assert data['status'] == 'ok'
    assert 'signals' in data
    assert len(data['signals']) <= 10
```

### Running Integration Tests

```bash
# Run only unit tests (fast)
pytest -m "not integration"

# Run only integration tests
pytest -m integration

# Run all tests
pytest
```

---

## Performance Testing

Performance tests ensure the system meets performance targets.

### File Location

```
/app/features/__tests__/test_performance.py
```

### Performance Test Example

```python
import time

def test_bulk_insert_performance(signal_repository):
    """Benchmark: Bulk insert 1000 records should complete in <2s."""
    signals = [
        {"symbol": f"TST{i}.AX", "rank": i, "score": 0.75}
        for i in range(1000)
    ]

    start = time.time()
    repo.persist_signals(signals, "model_a_ml", "2024-01-15")
    elapsed = time.time() - start

    assert elapsed < 2.0, f"Bulk insert too slow: {elapsed:.3f}s"
    print(f"✅ Bulk insert 1000 records: {elapsed:.3f}s")
```

See `/app/features/__tests__/test_performance.py` for full benchmarks.

---

## Test Organization

### File Structure

```
app/features/signals/
├── repositories/
│   ├── signal_repository.py
│   └── __tests__/
│       ├── conftest.py              # Shared fixtures
│       └── test_signal_repository.py
├── services/
│   ├── signal_service.py
│   └── __tests__/
│       ├── conftest.py
│       └── test_signal_service.py
└── __tests__/
    └── test_signals_integration.py   # Integration tests
```

### Naming Conventions

**Test Files:**
- `test_<module_name>.py`
- Example: `test_signal_repository.py`

**Test Functions:**
- `test_<method>_<scenario>`
- Example: `test_get_live_signals_returns_latest_signals`

**Test Classes (optional):**
- `Test<ClassName>`
- Example: `class TestSignalRepository`

### Fixtures (conftest.py)

Share common fixtures across tests:

```python
# app/features/signals/repositories/__tests__/conftest.py

import pytest
from unittest.mock import MagicMock, patch

@pytest.fixture
def mock_db_context():
    """Mock database context for all repository tests."""
    with patch('app.core.repository.db_context') as mock_ctx:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        mock_ctx.return_value.__enter__.return_value = mock_conn
        mock_ctx.return_value.__exit__.return_value = None
        mock_conn.cursor.return_value = mock_cursor

        yield {
            'context': mock_ctx,
            'conn': mock_conn,
            'cursor': mock_cursor
        }

@pytest.fixture
def signal_repository(mock_db_context):
    """Create SignalRepository with mocked DB."""
    return SignalRepository()
```

---

## Summary

### TDD Checklist

Before committing code, ensure:

- [ ] **RED**: Test written and failing
- [ ] **GREEN**: Minimal code to pass test
- [ ] **REFACTOR**: Code cleaned up and documented
- [ ] **Coverage**: Target coverage achieved (85%+)
- [ ] **Edge Cases**: Boundary conditions tested
- [ ] **Integration**: End-to-end flow tested
- [ ] **Performance**: Benchmarks meet targets
- [ ] **Documentation**: Tests document expected behavior

### Running Tests

```bash
# Run all tests
pytest

# Run specific module
pytest app/features/signals/

# Run with coverage
pytest --cov=app --cov-report=html

# Run fast (skip integration)
pytest -m "not integration"

# Run verbose with output
pytest -v -s

# Run specific test
pytest app/features/signals/__tests__/test_signal_service.py::test_get_live_signals
```

### Resources

- [Backend Architecture](../architecture/BACKEND_ARCHITECTURE.md) - Architecture patterns
- [Adding New Models](../guides/ADDING_NEW_MODELS.md) - Model plugin guide
- [Performance Benchmarks](/app/features/__tests__/test_performance.py) - Performance targets

---

**Remember:** Tests are not overhead - they are **documentation, safety net, and design feedback** all in one.
