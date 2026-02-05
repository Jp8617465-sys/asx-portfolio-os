# Backend Architecture - ASX Portfolio OS

**Version:** 3.0 (Phase 3 - Modular Architecture)
**Last Updated:** 2024-02-05
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Repository Pattern](#repository-pattern)
4. [Service Pattern](#service-pattern)
5. [Event-Driven Architecture](#event-driven-architecture)
6. [Plugin System](#plugin-system)
7. [Feature Module Organization](#feature-module-organization)
8. [Testing Strategy](#testing-strategy)
9. [Performance Considerations](#performance-considerations)

---

## Overview

ASX Portfolio OS uses a **modular, event-driven architecture** following clean architecture principles. The backend is organized into distinct layers with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     API Routes Layer                        │
│              (FastAPI endpoints - thin)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Service Layer                            │
│        (Business logic, validation, orchestration)          │
│              Extends BaseService                            │
└────────────────────────┬────────────────────────────────────┘
                         │
            ┌────────────┴──────────────┐
            │                           │
┌───────────▼──────────┐    ┌──────────▼──────────┐
│  Repository Layer    │    │    Event Bus        │
│  (Data access only)  │    │  (Pub/Sub events)   │
│  Extends BaseRepo    │    │                     │
└──────────┬───────────┘    └─────────────────────┘
           │
┌──────────▼───────────┐
│   Database Layer     │
│  (PostgreSQL/RDS)    │
└──────────────────────┘
```

### Key Benefits

- **Testability**: Mock repositories/services independently
- **Maintainability**: Changes isolated to specific layers
- **Reusability**: Repositories/services shared across features
- **Scalability**: Event-driven architecture supports async workflows
- **Performance**: Optimized database access with connection pooling

---

## Architecture Principles

### 1. Separation of Concerns

Each layer has a single, well-defined responsibility:

| Layer | Responsibility | Example |
|-------|----------------|---------|
| **Routes** | HTTP handling, request/response serialization | `app/routes/signals.py` |
| **Services** | Business logic, validation, orchestration | `SignalService.get_live_signals()` |
| **Repositories** | Database queries, data persistence | `SignalRepository.persist_signals()` |
| **Events** | Cross-feature communication | `EventType.SIGNAL_GENERATED` |

### 2. Dependency Injection

Services receive dependencies via constructor injection for testability:

```python
class SignalService(BaseService):
    def __init__(self, repository: Optional[SignalRepository] = None):
        super().__init__()
        self.repo = repository or SignalRepository()
```

**Testing Benefits:**
- Mock repositories in unit tests
- Test business logic without database
- Faster test execution

### 3. Event-Driven Communication

Features communicate via events instead of direct coupling:

```python
# Service A publishes event
await self.publish_event(
    EventType.SIGNAL_GENERATED,
    {"model": "model_a", "count": 300}
)

# Service B subscribes to event
event_bus.subscribe(EventType.SIGNAL_GENERATED, handle_new_signals)
```

**Benefits:**
- Loose coupling between features
- Easy to add new features without modifying existing code
- Supports async workflows

---

## Repository Pattern

The **Repository Pattern** provides a clean abstraction over database access. All repositories extend `BaseRepository` which provides common CRUD operations.

### BaseRepository Class

**Location:** `/app/core/repository.py`

#### Key Methods

```python
class BaseRepository(Generic[T]):
    def __init__(self, table_name: str):
        """Initialize with database table name."""

    def find_by_id(self, id: int) -> Optional[Dict[str, Any]]:
        """Find single record by primary key."""

    def find_all(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Retrieve multiple records with pagination."""

    def insert(self, data: Dict[str, Any]) -> int:
        """Insert single record, return new ID."""

    def bulk_insert(self, records: List[Dict[str, Any]]) -> None:
        """Efficient bulk insert using execute_values."""

    def update(self, id: int, data: Dict[str, Any]) -> bool:
        """Update record by ID."""

    def delete(self, id: int) -> bool:
        """Delete record by ID."""

    def count(self, where_clause: Optional[str] = None) -> int:
        """Count records with optional filter."""
```

### Example: SignalRepository Implementation

**Location:** `/app/features/signals/repositories/signal_repository.py`

```python
from app.core.repository import BaseRepository

class SignalRepository(BaseRepository):
    def __init__(self):
        super().__init__('model_a_ml_signals')

    def get_live_signals(
        self,
        model: str = "model_a_ml",
        limit: int = 20,
        as_of: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Retrieve live signals for a model.

        Returns:
            {
                "as_of": date,
                "signals": List[Dict],
                "count": int
            }
        """
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Determine latest date if not provided
            if as_of is None:
                cur.execute(
                    "SELECT MAX(as_of) as max_date "
                    "FROM model_a_ml_signals WHERE model = %s",
                    (model,)
                )
                as_of = cur.fetchone()['max_date']

            # Retrieve signals
            cur.execute(
                "SELECT symbol, rank, score, ml_prob, ml_expected_return "
                "FROM model_a_ml_signals "
                "WHERE model = %s AND as_of = %s "
                "ORDER BY rank ASC LIMIT %s",
                (model, as_of, limit)
            )
            rows = cur.fetchall()

        return {
            "as_of": as_of,
            "signals": [dict(row) for row in rows],
            "count": len(rows)
        }

    def persist_signals(
        self,
        signals: List[Dict[str, Any]],
        model: str,
        as_of: str
    ) -> int:
        """
        Bulk insert signals using execute_values.

        Performance: ~1000 records in <2 seconds.
        """
        rows = [
            (as_of, model, s["symbol"], s.get("rank"),
             s.get("score"), s.get("ml_prob"))
            for s in signals
        ]

        with db_context() as conn:
            cur = conn.cursor()
            execute_values(
                cur,
                """
                INSERT INTO model_a_ml_signals
                (as_of, model, symbol, rank, score, ml_prob)
                VALUES %s
                ON CONFLICT (as_of, model, symbol) DO UPDATE SET
                    rank = EXCLUDED.rank,
                    score = EXCLUDED.score,
                    ml_prob = EXCLUDED.ml_prob
                """,
                rows
            )

        return len(rows)
```

### Database Access Patterns

#### 1. Use RealDictCursor for Dictionary Access

```python
from psycopg2.extras import RealDictCursor

with db_context() as conn:
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM signals WHERE id = %s", (signal_id,))
    result = cur.fetchone()

    # Access as dictionary
    print(result['symbol'])  # Not result[0]
```

#### 2. Bulk Inserts with execute_values

```python
from psycopg2.extras import execute_values

# Efficient batch insert (10-100x faster than individual INSERTs)
execute_values(
    cursor,
    "INSERT INTO table (col1, col2) VALUES %s",
    [(val1, val2), (val3, val4), ...]
)
```

#### 3. Avoid N+1 Query Problems

**Bad (N+1):**
```python
# 1 query to get portfolio
portfolio = get_portfolio(portfolio_id)

# N queries for each holding (SLOW!)
for holding in portfolio['holdings']:
    price = get_latest_price(holding['ticker'])  # N queries!
```

**Good (Batch Query):**
```python
# 1 query to get portfolio
portfolio = get_portfolio(portfolio_id)

# 1 batch query for all prices
tickers = [h['ticker'] for h in portfolio['holdings']]
prices = get_latest_prices_batch(tickers)  # Single query with WHERE IN
```

---

## Service Pattern

The **Service Pattern** encapsulates business logic and orchestrates repository operations. All services extend `BaseService` which provides event publishing.

### BaseService Class

**Location:** `/app/core/service.py`

```python
from app.core.events.event_bus import event_bus, EventType

class BaseService(ABC):
    def __init__(self):
        self.event_bus = event_bus

    async def publish_event(
        self,
        event_type: EventType,
        payload: Dict[str, Any],
        source: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> None:
        """Publish event to event bus."""
        event = Event(
            type=event_type,
            payload=payload,
            timestamp=datetime.utcnow(),
            source=source or self.__class__.__name__
        )
        await self.event_bus.publish(event)
```

### Example: SignalService Implementation

**Location:** `/app/features/signals/services/signal_service.py`

```python
from app.core.service import BaseService
from app.features.signals.repositories import SignalRepository

class SignalService(BaseService):
    def __init__(self, repository: Optional[SignalRepository] = None):
        super().__init__()
        self.repo = repository or SignalRepository()

    async def get_live_signals(
        self,
        model: str = "model_a_ml",
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Retrieve live signals and publish event.

        Business logic:
        1. Fetch signals from repository
        2. Validate signal count
        3. Publish SIGNAL_GENERATED event
        4. Format response
        """
        # Step 1: Data access
        result = self.repo.get_live_signals(model=model, limit=limit)

        # Step 2: Business logic / validation
        if result['count'] == 0:
            logger.warning(f"No signals found for model: {model}")

        # Step 3: Event publishing
        await self.publish_event(
            EventType.SIGNAL_GENERATED,
            {
                "model": model,
                "as_of": result['as_of'].isoformat(),
                "count": result['count'],
                "top_signal": result['signals'][0]['symbol'] if result['signals'] else None
            }
        )

        # Step 4: Response formatting
        return {
            "status": "ok",
            "model": model,
            "as_of": result['as_of'].isoformat(),
            "count": result['count'],
            "signals": result['signals']
        }
```

### Service Best Practices

1. **Services orchestrate, repositories execute**
   - Services contain business logic (validation, calculations)
   - Repositories contain only data access logic

2. **Use async for I/O operations**
   ```python
   async def get_live_signals(self, ...):
       # Allows concurrent event publishing
       await self.publish_event(...)
   ```

3. **Publish events after successful operations**
   ```python
   # Do work
   result = self.repo.persist_signals(...)

   # Then notify
   await self.publish_event(EventType.SIGNAL_GENERATED, {...})
   ```

4. **Handle errors gracefully**
   ```python
   try:
       result = self.repo.get_live_signals(...)
   except Exception as e:
       logger.error(f"Failed to get signals: {e}")
       raise  # Re-raise for route handler to catch
   ```

---

## Event-Driven Architecture

The **Event Bus** enables loose coupling between features through publish-subscribe messaging.

### Event Bus Overview

**Location:** `/app/core/events/event_bus.py`

```python
class EventBus:
    """Singleton in-memory event bus for pub/sub."""

    def subscribe(self, event_type: EventType, handler: Callable) -> Callable:
        """Subscribe handler to event type."""

    async def publish(self, event: Event) -> None:
        """Publish event to all subscribers."""

    def get_history(self, event_type: Optional[EventType] = None) -> List[Event]:
        """Retrieve event history (last 1000 events)."""
```

### Event Types

```python
class EventType(str, Enum):
    SIGNAL_GENERATED = "signal.generated"
    SIGNAL_CHANGED = "signal.changed"
    PRICE_UPDATED = "price.updated"
    MODEL_DRIFT_DETECTED = "model.drift_detected"
    PORTFOLIO_CHANGED = "portfolio.changed"
    ALERT_TRIGGERED = "alert.triggered"
    NEWS_INGESTED = "news.ingested"
    SENTIMENT_CHANGED = "sentiment.changed"
    JOB_COMPLETED = "job.completed"
```

### Event Flow Example

```
┌─────────────────┐
│ SignalService   │
│ generates       │
│ new signals     │
└────────┬────────┘
         │
         │ publish(SIGNAL_GENERATED)
         │
         ▼
┌─────────────────────────────┐
│       Event Bus             │
│  (in-memory singleton)      │
└─────┬──────────┬────────┬──┘
      │          │        │
      │          │        │ (multiple subscribers)
      ▼          ▼        ▼
┌──────────┐ ┌──────┐ ┌──────────┐
│Portfolio │ │Alert │ │Drift     │
│Handler   │ │Handler│ │Handler   │
└──────────┘ └──────┘ └──────────┘
```

### Creating an Event Handler

**Location:** `/app/core/events/handlers/signal_handler.py`

```python
from app.core.events.event_bus import event_bus, Event, EventType

async def handle_signal_generated(event: Event) -> None:
    """
    Handle SIGNAL_GENERATED events.

    Example: Update portfolio holdings when new signals arrive.
    """
    payload = event.payload
    model = payload.get("model")
    count = payload.get("count")

    logger.info(f"New signals generated: model={model}, count={count}")

    # Trigger downstream actions
    # e.g., update portfolio recommendations, send alerts, etc.

# Register handler on module import
event_bus.subscribe(EventType.SIGNAL_GENERATED, handle_signal_generated)
```

### Event Publishing Best Practices

1. **Publish events after successful operations**
   ```python
   # Persist first
   self.repo.persist_signals(signals)

   # Then notify (don't notify before saving!)
   await self.publish_event(EventType.SIGNAL_GENERATED, {...})
   ```

2. **Include correlation_id for tracing**
   ```python
   await self.publish_event(
       EventType.SIGNAL_GENERATED,
       payload={"model": "model_a"},
       correlation_id=request_id  # Track related events
   )
   ```

3. **Keep event payloads small and JSON-serializable**
   ```python
   # Good
   payload = {"model": "model_a", "count": 300, "as_of": "2024-01-15"}

   # Bad (don't send entire objects)
   payload = {"signals": [... 300 signal objects ...]}  # Too large!
   ```

---

## Plugin System

The **Plugin System** enables dynamic model registration and ensemble weighting through a standardized interface.

### ModelPlugin Interface

**Location:** `/app/features/models/plugins/base.py`

```python
from abc import ABC, abstractmethod
from datetime import date
from typing import List
from dataclasses import dataclass

@dataclass
class ModelOutput:
    symbol: str
    signal: SignalType  # STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
    confidence: float   # 0.0 to 1.0
    expected_return: float
    rank: int

class ModelPlugin(ABC):
    """Base class for all model plugins."""

    def __init__(self, config: ModelConfig):
        self.config = config

    @abstractmethod
    async def generate_signals(
        self,
        symbols: List[str],
        as_of: date
    ) -> List[ModelOutput]:
        """Generate signals for given symbols."""
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """Return model metadata (version, features, etc.)."""
        pass
```

### Creating a Model Plugin

**Example: Model A Plugin**

**Location:** `/app/features/models/plugins/model_a.py`

```python
from app.features.models.plugins.base import ModelPlugin, ModelOutput

class ModelAPlugin(ModelPlugin):
    """Model A: Technical momentum-based signals."""

    async def generate_signals(
        self,
        symbols: List[str],
        as_of: date
    ) -> List[ModelOutput]:
        """
        Generate signals using LightGBM momentum model.

        Features:
        - 12-month momentum
        - RSI, MACD indicators
        - Volatility measures
        """
        # 1. Fetch features from database
        features = self._fetch_features(symbols, as_of)

        # 2. Load trained model
        model = self._load_model()

        # 3. Generate predictions
        predictions = model.predict_proba(features)

        # 4. Convert to ModelOutput objects
        outputs = []
        for i, symbol in enumerate(symbols):
            prob = predictions[i][1]  # Probability of positive class
            signal = self._prob_to_signal(prob)

            outputs.append(ModelOutput(
                symbol=symbol,
                signal=signal,
                confidence=prob,
                expected_return=self._calculate_expected_return(prob),
                rank=i + 1
            ))

        # Sort by confidence
        outputs.sort(key=lambda x: x.confidence, reverse=True)

        return outputs

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "model_id": "model_a",
            "version": "v1.2.0",
            "type": "technical",
            "features": ["momentum_12m", "rsi", "macd", "volatility"],
            "algorithm": "LightGBM",
            "trained_on": "2023-01-01 to 2024-01-01"
        }
```

### Model Registry

**Location:** `/app/features/models/registry/model_registry.py`

```python
class ModelRegistry:
    """Singleton registry for model plugins."""

    def register(self, model_id: str, plugin_class: Type[ModelPlugin]) -> None:
        """Register a new model plugin."""

    def get(self, model_id: str) -> Optional[ModelPlugin]:
        """Get model plugin by ID."""

    def get_enabled(self) -> List[ModelPlugin]:
        """Get all enabled models from config."""

    def get_ensemble_weights(self) -> Dict[str, float]:
        """Get dynamic ensemble weights from models.yaml."""
```

### Dynamic Ensemble Weighting

**Configuration:** `/app/features/models/config/models.yaml`

```yaml
ensemble:
  enabled: true
  conflict_strategy: weighted_majority
  min_agreement: 0.5
  min_confidence: 0.6

models:
  - model_id: model_a
    enabled: true
    weight: 0.60
    type: technical

  - model_id: model_b
    enabled: true
    weight: 0.40
    type: fundamental

  - model_id: model_c
    enabled: false  # Not yet deployed
    weight: 0.20
    type: sentiment
```

**Usage:**

```python
from app.features.models.registry import model_registry

# Get enabled models
enabled_models = model_registry.get_enabled()
# Returns: [ModelAPlugin, ModelBPlugin]

# Get weights
weights = model_registry.get_ensemble_weights()
# Returns: {"model_a": 0.60, "model_b": 0.40}

# Generate ensemble signals
for model in enabled_models:
    signals = await model.generate_signals(symbols, as_of)
    # Aggregate with weights...
```

---

## Feature Module Organization

Features are organized into self-contained modules under `/app/features/`.

### Standard Feature Structure

```
app/features/signals/
├── __init__.py
├── repositories/
│   ├── __init__.py
│   ├── signal_repository.py
│   └── __tests__/
│       └── test_signal_repository.py
├── services/
│   ├── __init__.py
│   ├── signal_service.py
│   └── __tests__/
│       └── test_signal_service.py
└── routes/
    ├── __init__.py
    └── signals.py
```

### Module Responsibilities

| Module | Responsibility | Example |
|--------|----------------|---------|
| `repositories/` | Data access layer | Database queries, persistence |
| `services/` | Business logic layer | Validation, orchestration, events |
| `routes/` | HTTP API layer | Request/response handling |
| `__tests__/` | Unit tests | TDD test files |

### Cross-Feature Communication

Features communicate via **events**, not direct imports:

**Bad (Tight Coupling):**
```python
# In portfolio_service.py
from app.features.signals.services import SignalService

signal_service = SignalService()
signals = signal_service.get_live_signals()  # Direct dependency!
```

**Good (Event-Driven):**
```python
# In portfolio_service.py
await self.publish_event(
    EventType.PORTFOLIO_CHANGED,
    {"portfolio_id": portfolio_id}
)

# In signal_handler.py (separate file)
async def handle_portfolio_changed(event: Event):
    portfolio_id = event.payload["portfolio_id"]
    # Update signals for portfolio holdings
```

---

## Testing Strategy

ASX Portfolio OS follows **Test-Driven Development (TDD)** with high test coverage requirements.

### TDD Methodology

**RED → GREEN → REFACTOR cycle:**

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass test
3. **REFACTOR**: Improve code quality

### Test Organization

```
app/features/signals/
├── repositories/
│   ├── signal_repository.py
│   └── __tests__/
│       └── test_signal_repository.py  # Unit tests
├── services/
│   ├── signal_service.py
│   └── __tests__/
│       └── test_signal_service.py     # Unit tests
└── __tests__/
    └── test_signals_integration.py     # Integration tests
```

### Repository Mocking

**Example: Testing SignalService without database**

```python
import pytest
from unittest.mock import Mock, patch

@pytest.fixture
def mock_signal_repository():
    """Mock SignalRepository for testing."""
    mock_repo = Mock(spec=SignalRepository)

    # Define return values
    mock_repo.get_live_signals.return_value = {
        "as_of": date(2024, 1, 15),
        "signals": [{"symbol": "BHP.AX", "rank": 1}],
        "count": 1
    }

    return mock_repo

def test_signal_service_get_live_signals(mock_signal_repository):
    """Test SignalService.get_live_signals() with mocked repository."""
    # Arrange
    service = SignalService(repository=mock_signal_repository)

    # Act
    result = await service.get_live_signals(model="model_a_ml", limit=20)

    # Assert
    assert result['status'] == 'ok'
    assert result['count'] == 1
    mock_signal_repository.get_live_signals.assert_called_once_with(
        model="model_a_ml",
        limit=20,
        as_of=None
    )
```

### Test Coverage Requirements

- **Target**: 85%+ code coverage
- **Critical paths**: 100% coverage (authentication, payments, data persistence)
- **Utilities**: 70%+ coverage

**Check coverage:**
```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

---

## Performance Considerations

### Connection Pooling

**Configuration:** `/app/core.py`

```python
import psycopg2.pool

connection_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=20,
    dsn=DATABASE_URL
)
```

### Query Optimization

1. **Use indexes** for frequently queried columns:
   ```sql
   CREATE INDEX idx_signals_model_asof ON model_a_ml_signals(model, as_of);
   ```

2. **Bulk operations** instead of loops:
   ```python
   # Use execute_values for bulk inserts
   execute_values(cursor, "INSERT INTO signals VALUES %s", rows)
   ```

3. **Avoid SELECT ***, query only needed columns:
   ```sql
   -- Good
   SELECT symbol, rank, score FROM signals WHERE model = 'model_a';

   -- Bad (retrieves unnecessary data)
   SELECT * FROM signals WHERE model = 'model_a';
   ```

### Caching Strategy

- **Redis** for frequently accessed data (signals, prices)
- **TTL**: 5 minutes for live data, 1 hour for historical data
- **Invalidation**: Event-driven cache invalidation

**Example:**
```python
@cache(ttl=300)  # 5 minutes
def get_latest_signals(model: str):
    return signal_repository.get_live_signals(model)
```

### Performance Benchmarks

See `/app/features/__tests__/test_performance.py` for detailed benchmarks:

| Operation | Target | Actual |
|-----------|--------|--------|
| Bulk insert (1000 records) | <2s | 1.2s |
| Query live signals | <500ms | 180ms |
| Portfolio upload (50 holdings) | <5s | 3.1s |
| Event publish latency | <10ms | 3ms |

---

## Summary

The ASX Portfolio OS backend follows a **modular, event-driven architecture** with:

✅ **Repository Pattern** for clean data access
✅ **Service Pattern** for business logic
✅ **Event Bus** for loose coupling
✅ **Plugin System** for extensible models
✅ **TDD** for high quality and confidence
✅ **Performance optimization** for production scale

This architecture enables rapid feature development while maintaining code quality, testability, and performance.

For adding new models, see: [`/docs/guides/ADDING_NEW_MODELS.md`](/docs/guides/ADDING_NEW_MODELS.md)
For TDD guidelines, see: [`/docs/testing/TDD_GUIDELINES.md`](/docs/testing/TDD_GUIDELINES.md)
