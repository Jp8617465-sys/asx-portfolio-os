# Core Module Tests

Comprehensive unit tests for the core infrastructure components following TDD best practices.

## Test Files

### test_repository.py
Tests for `BaseRepository` - Generic CRUD repository pattern

**Coverage**: 100% (131/131 statements)

**Test Classes**:
- `TestBaseRepositoryInit`: Repository initialization
- `TestFindById`: Finding records by ID (success, not found, errors)
- `TestFindAll`: Retrieving multiple records with pagination and ordering
- `TestInsert`: Single record insertion with validation
- `TestBulkInsert`: Efficient bulk insertion with execute_values
- `TestUpdate`: Record updates with existence checking
- `TestDelete`: Record deletion operations
- `TestCount`: Counting records with optional WHERE clauses
- `TestExists`: Checking record existence
- `TestIntegrationScenarios`: Complete CRUD workflows

**Total Tests**: 32

### test_service.py
Tests for `BaseService` - Event-driven service base class

**Coverage**: 100% (30/30 statements)

**Test Classes**:
- `TestBaseServiceInit`: Service initialization with event bus
- `TestPublishEvent`: Event publishing with different parameters
- `TestPublishEventErrorHandling`: Error resilience in event publishing
- `TestLogOperation`: Structured logging helper method
- `TestEventPublishingResilience`: Multi-event and concurrent scenarios
- `TestServiceIntegration`: Service workflows with events
- `TestConcurrentEventPublishing`: Async event publishing patterns

**Total Tests**: 26

## Running Tests

Run all core tests:
```bash
python -m pytest app/core/__tests__/ -v
```

Run with coverage:
```bash
python -m pytest app/core/__tests__/ --cov=app/core --cov-report=term-missing
```

Run specific test class:
```bash
python -m pytest app/core/__tests__/test_repository.py::TestFindById -v
```

## Test Patterns

### Mocking
- Database connections mocked using `unittest.mock.patch`
- Event bus mocked for service tests
- Logger mocked to verify logging behavior

### Fixtures
- `mock_db_context`: Mocked database context manager with cursor
- `mock_event_bus`: Mocked event bus for async event publishing
- `mock_logger`: Mocked logger for log verification
- `repository`/`service`: Test instances with mocked dependencies

### Assertions
- SQL query structure verification
- Parameter validation
- Error handling and logging
- Event payload structure
- Async operation completion

## Key Test Principles

1. **Isolation**: Each test is independent and uses mocked dependencies
2. **Repeatability**: Tests can run in any order without side effects
3. **Coverage**: All methods and error paths tested
4. **TDD Patterns**: Red-Green-Refactor methodology
5. **Async Support**: pytest-asyncio for async/await testing
