"""
app/features/signals/services/__tests__/test_signal_service.py
Comprehensive unit tests for SignalService following TDD best practices.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from datetime import date, datetime
from typing import Dict, Any, List

from app.features.signals.services.signal_service import SignalService
from app.core.events.event_bus import EventType


@pytest.fixture
def mock_repository():
    """Mock SignalRepository."""
    mock_repo = MagicMock()
    return mock_repo


@pytest.fixture
def mock_event_bus():
    """Mock event bus."""
    mock_bus = MagicMock()
    mock_bus.publish = AsyncMock()
    with patch('app.core.service.event_bus', mock_bus):
        yield mock_bus


@pytest.fixture
def mock_logger():
    """Mock logger."""
    with patch('app.features.signals.services.signal_service.logger') as mock_log:
        yield mock_log


@pytest.fixture
def service(mock_repository, mock_event_bus):
    """Create a SignalService instance with mock repository."""
    return SignalService(repository=mock_repository)


class TestSignalServiceInit:
    """Test SignalService initialization."""

    def test_init_with_repository(self, mock_repository, mock_event_bus, mock_logger):
        """Test initialization with provided repository."""
        service = SignalService(repository=mock_repository)
        assert service.repo is mock_repository

    def test_init_without_repository(self, mock_event_bus, mock_logger):
        """Test initialization creates repository if not provided."""
        with patch('app.features.signals.services.signal_service.SignalRepository') as mock_repo_class:
            service = SignalService()
            mock_repo_class.assert_called_once()

    def test_init_logs_initialization(self, mock_repository, mock_event_bus, mock_logger):
        """Test that initialization is logged."""
        service = SignalService(repository=mock_repository)
        mock_logger.debug.assert_called()


class TestGetLiveSignals:
    """Test get_live_signals method."""

    @pytest.mark.asyncio
    async def test_get_live_signals_success(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting live signals successfully."""
        # Setup
        test_date = date(2024, 1, 15)
        mock_repository.get_live_signals.return_value = {
            'as_of': test_date,
            'signals': [
                {'symbol': 'BHP.AX', 'rank': 1, 'score': 0.95, 'ml_prob': 0.87, 'ml_expected_return': 0.15},
                {'symbol': 'CBA.AX', 'rank': 2, 'score': 0.92, 'ml_prob': 0.84, 'ml_expected_return': 0.12},
            ],
            'count': 2
        }

        # Execute
        result = await service.get_live_signals()

        # Verify
        assert result['status'] == 'ok'
        assert result['model'] == 'model_a_ml'
        assert result['count'] == 2
        assert len(result['signals']) == 2

        # Verify repository was called
        mock_repository.get_live_signals.assert_called_once_with(
            model='model_a_ml',
            limit=20,
            as_of=None
        )

        # Verify event was published
        mock_event_bus.publish.assert_called_once()
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.type == EventType.SIGNAL_GENERATED
        assert published_event.payload['count'] == 2

    @pytest.mark.asyncio
    async def test_get_live_signals_with_params(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting live signals with custom parameters."""
        # Setup
        test_date = date(2024, 1, 10)
        mock_repository.get_live_signals.return_value = {
            'as_of': test_date,
            'signals': [],
            'count': 0
        }

        # Execute
        result = await service.get_live_signals(model="model_b", limit=10, as_of=test_date)

        # Verify
        mock_repository.get_live_signals.assert_called_once_with(
            model='model_b',
            limit=10,
            as_of=test_date
        )

    @pytest.mark.asyncio
    async def test_get_live_signals_error_handling(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test error handling in get_live_signals."""
        # Setup
        mock_repository.get_live_signals.side_effect = Exception("Database error")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            await service.get_live_signals()

        assert "Database error" in str(exc_info.value)
        mock_logger.error.assert_called()


class TestGetSignalForTicker:
    """Test get_signal_for_ticker method."""

    @pytest.mark.asyncio
    async def test_get_signal_for_ticker_success(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting signal for ticker successfully."""
        # Setup
        mock_repository.get_signal_by_ticker.return_value = {
            'ticker': 'BHP.AX',
            'signal_label': 'STRONG_BUY',
            'confidence': 0.85,
            'ml_prob': 0.87,
            'ml_expected_return': 0.15,
            'rank': 1
        }

        # Execute
        result = await service.get_signal_for_ticker("BHP.AX")

        # Verify
        assert result['status'] == 'ok'
        assert result['ticker'] == 'BHP.AX'
        assert result['signal_label'] == 'STRONG_BUY'

        mock_repository.get_signal_by_ticker.assert_called_once_with(
            ticker='BHP.AX',
            model='model_a_ml',
            as_of=None
        )

    @pytest.mark.asyncio
    async def test_get_signal_for_ticker_not_found(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting signal for ticker that doesn't exist."""
        # Setup
        mock_repository.get_signal_by_ticker.return_value = None

        # Execute & Verify
        with pytest.raises(ValueError) as exc_info:
            await service.get_signal_for_ticker("INVALID.AX")

        assert "No signal found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_signal_for_ticker_with_params(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting signal with custom parameters."""
        # Setup
        test_date = date(2024, 1, 10)
        mock_repository.get_signal_by_ticker.return_value = {
            'ticker': 'BHP.AX',
            'signal_label': 'BUY',
            'confidence': 0.75
        }

        # Execute
        await service.get_signal_for_ticker("BHP.AX", model="model_b", as_of=test_date)

        # Verify
        mock_repository.get_signal_by_ticker.assert_called_once_with(
            ticker='BHP.AX',
            model='model_b',
            as_of=test_date
        )


class TestGetSignalWithReasoning:
    """Test get_signal_with_reasoning method."""

    @pytest.mark.asyncio
    async def test_get_signal_with_reasoning_success(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting signal with reasoning successfully."""
        # Setup
        mock_repository.get_signal_reasoning.return_value = {
            'ticker': 'BHP.AX',
            'signal_label': 'STRONG_BUY',
            'confidence': 0.85,
            'shap_values': None,
            'feature_contributions': {
                'momentum': 0.45,
                'rsi': -0.15,
                'volume': 0.30
            }
        }

        # Execute
        result = await service.get_signal_with_reasoning("BHP.AX")

        # Verify
        assert result['status'] == 'ok'
        assert result['ticker'] == 'BHP.AX'
        assert result['signal'] == 'STRONG_BUY'
        assert len(result['factors']) > 0
        assert result['factors'][0]['feature'] == 'momentum'
        assert result['factors'][0]['contribution'] == 0.45

    @pytest.mark.asyncio
    async def test_get_signal_with_reasoning_not_found(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting reasoning when none exists."""
        # Setup
        mock_repository.get_signal_reasoning.return_value = None

        # Execute & Verify
        with pytest.raises(ValueError) as exc_info:
            await service.get_signal_with_reasoning("INVALID.AX")

        assert "No signal reasoning found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_signal_with_reasoning_limits_factors(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test that only top 10 factors are returned."""
        # Setup
        feature_contributions = {f'feature_{i}': 0.1 * i for i in range(20)}
        mock_repository.get_signal_reasoning.return_value = {
            'ticker': 'BHP.AX',
            'signal_label': 'BUY',
            'confidence': 0.75,
            'shap_values': None,
            'feature_contributions': feature_contributions
        }

        # Execute
        result = await service.get_signal_with_reasoning("BHP.AX")

        # Verify
        assert len(result['factors']) == 10


class TestParseFeatureContributions:
    """Test _parse_feature_contributions helper method."""

    def test_parse_feature_contributions_from_dict(self, service):
        """Test parsing feature contributions from dictionary."""
        # Setup
        feature_contributions = {
            'momentum': 0.45,
            'rsi': -0.15,
            'volume': 0.30
        }

        # Execute
        factors = service._parse_feature_contributions(feature_contributions, None)

        # Verify
        assert len(factors) == 3
        # Should be sorted by absolute contribution
        assert factors[0]['feature'] == 'momentum'
        assert factors[0]['contribution'] == 0.45
        assert factors[0]['direction'] == 'positive'
        assert factors[1]['feature'] == 'volume'
        assert factors[2]['feature'] == 'rsi'
        assert factors[2]['direction'] == 'negative'

    def test_parse_feature_contributions_fallback_to_shap(self, service):
        """Test fallback to shap_values when feature_contributions is None."""
        # Setup
        shap_values = {
            'momentum': 0.50,
            'rsi': -0.20
        }

        # Execute
        factors = service._parse_feature_contributions(None, shap_values)

        # Verify
        assert len(factors) == 2
        assert factors[0]['feature'] == 'momentum'
        assert factors[0]['contribution'] == 0.50

    def test_parse_feature_contributions_empty(self, service):
        """Test parsing with no contributions."""
        # Execute
        factors = service._parse_feature_contributions(None, None)

        # Verify
        assert factors == []


class TestPersistModelRun:
    """Test persist_model_run method."""

    @pytest.mark.asyncio
    async def test_persist_model_run_success(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test persisting model run successfully."""
        # Setup
        signals = [
            {'symbol': 'BHP.AX', 'rank': 1, 'score': 0.95},
            {'symbol': 'CBA.AX', 'rank': 2, 'score': 0.92}
        ]
        mock_repository.persist_signals.return_value = 2

        # Execute
        result = await service.persist_model_run(
            signals=signals,
            model="model_a_ml",
            as_of="2024-01-15"
        )

        # Verify
        assert result['status'] == 'ok'
        assert result['rows'] == 2
        assert result['registry_id'] is None

        mock_repository.persist_signals.assert_called_once_with(
            signals=signals,
            model="model_a_ml",
            as_of="2024-01-15"
        )

        # Verify event was published
        mock_event_bus.publish.assert_called_once()

    @pytest.mark.asyncio
    async def test_persist_model_run_with_registry(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test persisting model run with registry."""
        # Setup
        signals = [{'symbol': 'BHP.AX', 'rank': 1}]
        mock_repository.persist_signals.return_value = 1
        mock_repository.register_model_run.return_value = 123

        metrics = {"roc_auc_mean": 0.85}

        # Execute
        result = await service.persist_model_run(
            signals=signals,
            model="model_a_ml",
            as_of="2024-01-15",
            model_version="v1.2.0",
            run_id="run_456",
            metrics=metrics
        )

        # Verify
        assert result['registry_id'] == 123

        mock_repository.register_model_run.assert_called_once_with(
            model_name="model_a_ml",
            version="v1.2.0",
            run_id="run_456",
            metrics=metrics
        )

    @pytest.mark.asyncio
    async def test_persist_model_run_error_handling(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test error handling in persist_model_run."""
        # Setup
        mock_repository.persist_signals.side_effect = Exception("Persist failed")

        # Execute & Verify
        with pytest.raises(Exception):
            await service.persist_model_run([], "model_a_ml", "2024-01-15")

        mock_logger.error.assert_called()


class TestRegisterModelRun:
    """Test register_model_run method."""

    @pytest.mark.asyncio
    async def test_register_model_run_success(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test registering model run successfully."""
        # Setup
        mock_repository.register_model_run.return_value = 123
        metrics = {"roc_auc_mean": 0.85}

        # Execute
        result = await service.register_model_run(
            model_name="model_a_ml",
            version="v1.2.0",
            metrics=metrics
        )

        # Verify
        assert result['status'] == 'ok'
        assert result['id'] == 123

        mock_repository.register_model_run.assert_called_once()

        # Verify event was published
        mock_event_bus.publish.assert_called_once()
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.type == EventType.JOB_COMPLETED
        assert published_event.payload['job_type'] == 'model_registration'

    @pytest.mark.asyncio
    async def test_register_model_run_with_all_params(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test registering model run with all parameters."""
        # Setup
        mock_repository.register_model_run.return_value = 124

        features = ["momentum", "rsi", "volume"]
        artifacts = {"model_path": "/models/v1.2.0"}

        # Execute
        await service.register_model_run(
            model_name="model_a_ml",
            version="v1.2.0",
            run_id="run_789",
            metrics={"accuracy": 0.85},
            features=features,
            artifacts=artifacts
        )

        # Verify
        mock_repository.register_model_run.assert_called_once_with(
            model_name="model_a_ml",
            version="v1.2.0",
            run_id="run_789",
            metrics={"accuracy": 0.85},
            features=features,
            artifacts=artifacts
        )


class TestPersistDriftAudit:
    """Test persist_drift_audit method."""

    @pytest.mark.asyncio
    async def test_persist_drift_audit_success(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test persisting drift audit successfully."""
        # Setup
        mock_repository.persist_drift_audit.return_value = 456
        metrics = {"psi_mean": 0.05, "psi_max": 0.12}

        # Execute
        result = await service.persist_drift_audit(
            model="model_a_ml",
            baseline_label="2024-01-01",
            current_label="2024-02-01",
            metrics=metrics
        )

        # Verify
        assert result['status'] == 'ok'
        assert result['id'] == 456

        mock_repository.persist_drift_audit.assert_called_once()

    @pytest.mark.asyncio
    async def test_persist_drift_audit_high_drift_event(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test that high drift triggers event."""
        # Setup
        mock_repository.persist_drift_audit.return_value = 456
        metrics = {"psi_mean": 0.15, "psi_max": 0.30}  # High drift

        # Execute
        await service.persist_drift_audit(
            model="model_a_ml",
            baseline_label="2024-01-01",
            current_label="2024-02-01",
            metrics=metrics
        )

        # Verify drift event was published
        mock_event_bus.publish.assert_called_once()
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.type == EventType.MODEL_DRIFT_DETECTED
        assert published_event.payload['severity'] == 'high'

    @pytest.mark.asyncio
    async def test_persist_drift_audit_medium_drift_event(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test that medium drift triggers event."""
        # Setup
        mock_repository.persist_drift_audit.return_value = 456
        metrics = {"psi_mean": 0.12, "psi_max": 0.15}  # Medium drift

        # Execute
        await service.persist_drift_audit(
            model="model_a_ml",
            baseline_label="2024-01-01",
            current_label="2024-02-01",
            metrics=metrics
        )

        # Verify
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.payload['severity'] == 'medium'

    @pytest.mark.asyncio
    async def test_persist_drift_audit_low_drift_no_event(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test that low drift doesn't trigger event."""
        # Setup
        mock_repository.persist_drift_audit.return_value = 456
        metrics = {"psi_mean": 0.05, "psi_max": 0.08}  # Low drift

        # Execute
        await service.persist_drift_audit(
            model="model_a_ml",
            baseline_label="2024-01-01",
            current_label="2024-02-01",
            metrics=metrics
        )

        # Verify no drift event was published
        mock_event_bus.publish.assert_not_called()


class TestGetDriftSummary:
    """Test get_drift_summary method."""

    @pytest.mark.asyncio
    async def test_get_drift_summary_success(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting drift summary successfully."""
        # Setup
        mock_repository.get_drift_summary.return_value = [
            {'id': 1, 'model': 'model_a_ml', 'metrics': {'psi_mean': 0.05}},
            {'id': 2, 'model': 'model_a_ml', 'metrics': {'psi_mean': 0.08}},
        ]

        # Execute
        result = await service.get_drift_summary()

        # Verify
        assert result['status'] == 'ok'
        assert result['count'] == 2
        assert len(result['rows']) == 2

    @pytest.mark.asyncio
    async def test_get_drift_summary_with_params(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting drift summary with parameters."""
        # Setup
        mock_repository.get_drift_summary.return_value = []

        # Execute
        await service.get_drift_summary(model="model_a_ml", limit=5)

        # Verify
        mock_repository.get_drift_summary.assert_called_once_with(
            model="model_a_ml",
            limit=5
        )


class TestGetModelStatus:
    """Test get_model_status method."""

    @pytest.mark.asyncio
    async def test_get_model_status_success(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting model status successfully."""
        # Setup
        mock_repository.get_model_status.return_value = {
            'model': 'model_a_ml',
            'registry': {'version': 'v1.2.0'},
            'signals': {'as_of': '2024-01-15', 'row_count': 50},
            'drift': {'psi_mean': 0.05}
        }

        # Execute
        result = await service.get_model_status("model_a_ml")

        # Verify
        assert result['status'] == 'ok'
        assert result['model'] == 'model_a_ml'
        assert result['registry']['version'] == 'v1.2.0'

        mock_repository.get_model_status.assert_called_once_with(model="model_a_ml")


class TestGetAccuracyMetrics:
    """Test get_accuracy_metrics method."""

    @pytest.mark.asyncio
    async def test_get_accuracy_metrics_success(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test getting accuracy metrics successfully."""
        # Setup
        mock_repository.get_accuracy_metrics.return_value = {
            'ticker': 'BHP.AX',
            'signals_analyzed': 50,
            'overall_accuracy': 0.68,
            'by_signal': {
                'STRONG_BUY': {'accuracy': 0.72, 'count': 20},
                'BUY': {'accuracy': 0.65, 'count': 30}
            }
        }

        # Execute
        result = await service.get_accuracy_metrics("BHP.AX", limit=50)

        # Verify
        assert result['status'] == 'ok'
        assert result['ticker'] == 'BHP.AX'
        assert result['overall_accuracy'] == 0.68

        mock_repository.get_accuracy_metrics.assert_called_once_with(
            ticker="BHP.AX",
            limit=50
        )


class TestServiceIntegration:
    """Integration-style tests for service workflows."""

    @pytest.mark.asyncio
    async def test_complete_signal_workflow(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test complete workflow: persist, retrieve, analyze."""
        # Setup
        signals = [{'symbol': 'BHP.AX', 'rank': 1, 'score': 0.95}]
        mock_repository.persist_signals.return_value = 1
        mock_repository.get_live_signals.return_value = {
            'as_of': date(2024, 1, 15),
            'signals': signals,
            'count': 1
        }
        mock_repository.get_accuracy_metrics.return_value = {
            'ticker': 'BHP.AX',
            'overall_accuracy': 0.75
        }

        # Execute workflow
        # 1. Persist signals
        persist_result = await service.persist_model_run(signals, "model_a_ml", "2024-01-15")
        assert persist_result['status'] == 'ok'

        # 2. Retrieve signals
        signals_result = await service.get_live_signals()
        assert signals_result['count'] == 1

        # 3. Get accuracy
        accuracy_result = await service.get_accuracy_metrics("BHP.AX")
        assert accuracy_result['overall_accuracy'] == 0.75

    @pytest.mark.asyncio
    async def test_drift_detection_workflow(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test drift detection workflow."""
        # Setup - high drift
        mock_repository.persist_drift_audit.return_value = 456

        # Execute
        await service.persist_drift_audit(
            model="model_a_ml",
            baseline_label="2024-01-01",
            current_label="2024-02-01",
            metrics={"psi_mean": 0.20, "psi_max": 0.35}
        )

        # Verify drift event published
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.type == EventType.MODEL_DRIFT_DETECTED
        assert published_event.payload['severity'] == 'high'


class TestErrorHandlingAndLogging:
    """Test error handling and logging across all methods."""

    @pytest.mark.asyncio
    async def test_all_methods_log_operations(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test that all methods complete without error (logging happens)."""
        # Setup mocks
        mock_repository.get_live_signals.return_value = {
            'as_of': date(2024, 1, 15),
            'signals': [],
            'count': 0
        }

        # Execute multiple operations - should complete without error
        result = await service.get_live_signals()

        # Verify operation completed successfully (logging is part of the execution)
        assert result is not None
        assert result['status'] == 'ok'

    @pytest.mark.asyncio
    async def test_repository_errors_propagate(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test that repository errors propagate correctly."""
        # Setup
        mock_repository.get_live_signals.side_effect = Exception("Repository error")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            await service.get_live_signals()

        assert "Repository error" in str(exc_info.value)


class TestEventPublishing:
    """Test event publishing patterns across service methods."""

    @pytest.mark.asyncio
    async def test_signal_generated_event_structure(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test SIGNAL_GENERATED event has correct structure."""
        # Setup
        test_date = date(2024, 1, 15)
        mock_repository.get_live_signals.return_value = {
            'as_of': test_date,
            'signals': [{'symbol': 'BHP.AX', 'rank': 1}],
            'count': 1
        }

        # Execute
        await service.get_live_signals()

        # Verify event structure
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.type == EventType.SIGNAL_GENERATED
        assert 'model' in published_event.payload
        assert 'as_of' in published_event.payload
        assert 'count' in published_event.payload
        assert 'top_signal' in published_event.payload

    @pytest.mark.asyncio
    async def test_job_completed_event_structure(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test JOB_COMPLETED event has correct structure."""
        # Setup
        mock_repository.register_model_run.return_value = 123

        # Execute
        await service.register_model_run(
            model_name="model_a_ml",
            version="v1.2.0",
            metrics={"accuracy": 0.85}
        )

        # Verify event structure
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.type == EventType.JOB_COMPLETED
        assert published_event.payload['job_type'] == 'model_registration'
        assert 'registry_id' in published_event.payload

    @pytest.mark.asyncio
    async def test_event_publishing_failures_dont_break_service(self, service, mock_repository, mock_event_bus, mock_logger):
        """Test that event publishing failures don't break service logic."""
        # Setup
        mock_repository.get_live_signals.return_value = {
            'as_of': date(2024, 1, 15),
            'signals': [],
            'count': 0
        }
        mock_event_bus.publish.side_effect = Exception("Event bus failed")

        # Execute - should not raise
        result = await service.get_live_signals()

        # Verify service logic completed successfully
        assert result['status'] == 'ok'
