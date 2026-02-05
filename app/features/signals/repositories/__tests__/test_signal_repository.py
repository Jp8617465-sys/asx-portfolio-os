"""
app/features/signals/repositories/__tests__/test_signal_repository.py
Comprehensive unit tests for SignalRepository following TDD best practices.
"""

import pytest
import json
from unittest.mock import Mock, MagicMock, patch, call
from datetime import date, datetime
from typing import Dict, Any, List

from app.features.signals.repositories.signal_repository import SignalRepository


@pytest.fixture
def mock_db_context():
    """Mock database context manager."""
    with patch('app.features.signals.repositories.signal_repository.db_context') as mock_ctx:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Setup context manager
        mock_ctx.return_value.__enter__.return_value = mock_conn
        mock_ctx.return_value.__exit__.return_value = None

        # Setup cursor
        mock_conn.cursor.return_value = mock_cursor

        yield {
            'context': mock_ctx,
            'conn': mock_conn,
            'cursor': mock_cursor
        }


@pytest.fixture
def mock_logger():
    """Mock logger."""
    with patch('app.features.signals.repositories.signal_repository.logger') as mock_log:
        yield mock_log


@pytest.fixture
def repository():
    """Create a SignalRepository instance."""
    return SignalRepository()


class TestSignalRepositoryInit:
    """Test SignalRepository initialization."""

    def test_init_sets_table_name(self, mock_logger):
        """Test that init sets the correct table name."""
        repo = SignalRepository()
        assert repo.table_name == 'model_a_ml_signals'

    def test_init_logs_initialization(self, mock_logger):
        """Test that init logs initialization."""
        repo = SignalRepository()
        mock_logger.debug.assert_called()


class TestGetLiveSignals:
    """Test get_live_signals method."""

    def test_get_live_signals_with_default_params(self, repository, mock_db_context, mock_logger):
        """Test getting live signals with default parameters."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 15)

        # First query returns max date
        mock_cursor.fetchone.side_effect = [
            {'max_date': test_date},  # MAX(as_of) query
        ]

        # Second query returns signals
        mock_cursor.fetchall.return_value = [
            {'symbol': 'BHP.AX', 'rank': 1, 'score': 0.95, 'ml_prob': 0.87, 'ml_expected_return': 0.15},
            {'symbol': 'CBA.AX', 'rank': 2, 'score': 0.92, 'ml_prob': 0.84, 'ml_expected_return': 0.12},
        ]

        # Execute
        result = repository.get_live_signals()

        # Verify
        assert result['as_of'] == test_date
        assert result['count'] == 2
        assert len(result['signals']) == 2
        assert result['signals'][0]['symbol'] == 'BHP.AX'
        assert result['signals'][0]['rank'] == 1

        # Verify SQL queries
        assert mock_cursor.execute.call_count == 2

    def test_get_live_signals_with_specific_date(self, repository, mock_db_context, mock_logger):
        """Test getting live signals for a specific date."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 10)

        mock_cursor.fetchall.return_value = [
            {'symbol': 'BHP.AX', 'rank': 1, 'score': 0.95, 'ml_prob': 0.87, 'ml_expected_return': 0.15},
        ]

        # Execute
        result = repository.get_live_signals(as_of=test_date)

        # Verify
        assert result['as_of'] == test_date
        # Should skip MAX(as_of) query
        assert mock_cursor.execute.call_count == 1

    def test_get_live_signals_with_limit(self, repository, mock_db_context, mock_logger):
        """Test getting live signals with custom limit."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 15)

        mock_cursor.fetchone.return_value = {'max_date': test_date}
        mock_cursor.fetchall.return_value = []

        # Execute
        repository.get_live_signals(limit=10)

        # Verify limit in SQL query
        call_args = mock_cursor.execute.call_args_list[1]
        assert call_args[0][1] == ('model_a_ml', test_date, 10)

    def test_get_live_signals_no_data_available(self, repository, mock_db_context, mock_logger):
        """Test getting live signals when no data is available."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = {'max_date': None}

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.get_live_signals()

        assert "No signals available" in str(exc_info.value)

    def test_get_live_signals_with_different_model(self, repository, mock_db_context, mock_logger):
        """Test getting live signals for different model."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 15)

        mock_cursor.fetchone.return_value = {'max_date': test_date}
        mock_cursor.fetchall.return_value = []

        # Execute
        repository.get_live_signals(model="model_b")

        # Verify model parameter
        call_args = mock_cursor.execute.call_args_list[0]
        assert 'model_b' in call_args[0][1]


class TestGetSignalByTicker:
    """Test get_signal_by_ticker method."""

    def test_get_signal_by_ticker_success(self, repository, mock_db_context, mock_logger):
        """Test getting signal for a ticker successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = {
            'as_of': date(2024, 1, 15),
            'signal_label': 'STRONG_BUY',
            'confidence': 0.85,
            'ml_prob': 0.87,
            'ml_expected_return': 0.15,
            'rank': 1
        }

        # Execute
        signal = repository.get_signal_by_ticker("BHP.AX")

        # Verify
        assert signal is not None
        assert signal['ticker'] == 'BHP.AX'
        assert signal['signal_label'] == 'STRONG_BUY'
        assert signal['confidence'] == 0.85
        assert signal['rank'] == 1

    def test_get_signal_by_ticker_adds_ax_suffix(self, repository, mock_db_context, mock_logger):
        """Test that ticker without .AX gets suffix added."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = None

        # Execute
        repository.get_signal_by_ticker("BHP")

        # Verify .AX was added
        call_args = mock_cursor.execute.call_args
        assert 'BHP.AX' in call_args[0][1]

    def test_get_signal_by_ticker_not_found(self, repository, mock_db_context, mock_logger):
        """Test getting signal for ticker that doesn't exist."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = None

        # Execute
        signal = repository.get_signal_by_ticker("INVALID.AX")

        # Verify
        assert signal is None

    def test_get_signal_by_ticker_with_as_of(self, repository, mock_db_context, mock_logger):
        """Test getting signal for specific date."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 10)
        mock_cursor.fetchone.return_value = {
            'as_of': test_date,
            'signal_label': 'BUY',
            'confidence': 0.75,
            'ml_prob': 0.77,
            'ml_expected_return': 0.10,
            'rank': 5
        }

        # Execute
        signal = repository.get_signal_by_ticker("BHP.AX", as_of=test_date)

        # Verify
        assert signal is not None
        # Verify as_of parameter in query
        call_args = mock_cursor.execute.call_args
        assert test_date in call_args[0][1]

    def test_get_signal_by_ticker_normalizes_ticker(self, repository, mock_db_context, mock_logger):
        """Test that ticker is normalized (uppercase, stripped)."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = None

        # Execute with lowercase and spaces
        repository.get_signal_by_ticker(" bhp ")

        # Verify normalized
        call_args = mock_cursor.execute.call_args
        assert 'BHP.AX' in call_args[0][1]


class TestGetSignalReasoning:
    """Test get_signal_reasoning method."""

    def test_get_signal_reasoning_success(self, repository, mock_db_context, mock_logger):
        """Test getting signal reasoning successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = {
            'signal_label': 'STRONG_BUY',
            'confidence': 0.85,
            'shap_values': {'momentum': 0.45, 'rsi': -0.15},
            'feature_contributions': {'momentum': 0.45, 'volume': 0.30}
        }

        # Execute
        reasoning = repository.get_signal_reasoning("BHP.AX")

        # Verify
        assert reasoning is not None
        assert reasoning['ticker'] == 'BHP.AX'
        assert reasoning['signal_label'] == 'STRONG_BUY'
        assert reasoning['shap_values'] == {'momentum': 0.45, 'rsi': -0.15}
        assert 'factors' in reasoning

    def test_get_signal_reasoning_not_found(self, repository, mock_db_context, mock_logger):
        """Test getting reasoning when none exists."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = None

        # Execute
        reasoning = repository.get_signal_reasoning("INVALID.AX")

        # Verify
        assert reasoning is None


class TestPersistSignals:
    """Test persist_signals method."""

    def test_persist_signals_success(self, repository, mock_db_context, mock_logger):
        """Test persisting signals successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        signals = [
            {'symbol': 'BHP.AX', 'rank': 1, 'score': 0.95, 'ml_prob': 0.87, 'ml_expected_return': 0.15},
            {'symbol': 'CBA.AX', 'rank': 2, 'score': 0.92, 'ml_prob': 0.84, 'ml_expected_return': 0.12},
        ]

        # Execute
        with patch('app.features.signals.repositories.signal_repository.execute_values') as mock_execute_values:
            count = repository.persist_signals(signals, "model_a_ml", "2024-01-15")

            # Verify
            assert count == 2
            mock_execute_values.assert_called_once()

            # Verify SQL includes ON CONFLICT
            call_args = mock_execute_values.call_args
            assert 'ON CONFLICT' in call_args[0][1]

    def test_persist_signals_empty_list(self, repository, mock_db_context, mock_logger):
        """Test persisting empty signals list."""
        # Execute
        count = repository.persist_signals([], "model_a_ml", "2024-01-15")

        # Verify
        assert count == 0

    def test_persist_signals_with_optional_fields(self, repository, mock_db_context, mock_logger):
        """Test persisting signals with optional fields as None."""
        # Setup
        signals = [
            {'symbol': 'BHP.AX', 'rank': None, 'score': None, 'ml_prob': 0.87, 'ml_expected_return': None},
        ]

        # Execute
        with patch('app.features.signals.repositories.signal_repository.execute_values'):
            count = repository.persist_signals(signals, "model_a_ml", "2024-01-15")

            # Verify
            assert count == 1


class TestGetAccuracyMetrics:
    """Test get_accuracy_metrics method."""

    def test_get_accuracy_metrics_success(self, repository, mock_db_context, mock_logger):
        """Test calculating accuracy metrics successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = [
            {'signal_label': 'STRONG_BUY', 'confidence': 0.85, 'as_of': date(2024, 1, 1), 'was_correct': True},
            {'signal_label': 'STRONG_BUY', 'confidence': 0.82, 'as_of': date(2024, 1, 2), 'was_correct': True},
            {'signal_label': 'BUY', 'confidence': 0.70, 'as_of': date(2024, 1, 3), 'was_correct': False},
        ]

        # Execute
        metrics = repository.get_accuracy_metrics("BHP.AX", limit=50)

        # Verify
        assert metrics['ticker'] == 'BHP.AX'
        assert metrics['signals_analyzed'] == 3
        assert metrics['overall_accuracy'] == 0.67  # 2/3
        assert 'STRONG_BUY' in metrics['by_signal']
        assert metrics['by_signal']['STRONG_BUY']['accuracy'] == 1.0
        assert metrics['by_signal']['BUY']['accuracy'] == 0.0

    def test_get_accuracy_metrics_no_data(self, repository, mock_db_context, mock_logger):
        """Test accuracy metrics when no historical data available."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        metrics = repository.get_accuracy_metrics("BHP.AX")

        # Verify
        assert metrics['ticker'] == 'BHP.AX'
        assert metrics['signals_analyzed'] == 0
        assert metrics['overall_accuracy'] is None
        assert 'No historical signals' in metrics['message']

    def test_get_accuracy_metrics_adds_ax_suffix(self, repository, mock_db_context, mock_logger):
        """Test that ticker normalization works."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        repository.get_accuracy_metrics("BHP")

        # Verify
        call_args = mock_cursor.execute.call_args
        assert 'BHP.AX' in call_args[0][1]


class TestRegisterModelRun:
    """Test register_model_run method."""

    def test_register_model_run_success(self, repository, mock_db_context, mock_logger):
        """Test registering model run successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = [123]

        metrics = {"roc_auc_mean": 0.85, "rmse_mean": 0.12}
        features = ["momentum", "rsi", "volume"]
        artifacts = {"model_path": "/models/v1.2.0"}

        # Execute
        reg_id = repository.register_model_run(
            model_name="model_a_ml",
            version="v1.2.0",
            run_id="run_456",
            metrics=metrics,
            features=features,
            artifacts=artifacts
        )

        # Verify
        assert reg_id == 123
        mock_cursor.execute.assert_called_once()

        # Verify SQL
        call_args = mock_cursor.execute.call_args
        assert 'INSERT INTO model_registry' in call_args[0][0]

    def test_register_model_run_minimal_params(self, repository, mock_db_context, mock_logger):
        """Test registering model run with minimal parameters."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = [124]

        # Execute
        reg_id = repository.register_model_run(model_name="model_a_ml")

        # Verify
        assert reg_id == 124


class TestPersistDriftAudit:
    """Test persist_drift_audit method."""

    def test_persist_drift_audit_success(self, repository, mock_db_context, mock_logger):
        """Test persisting drift audit successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = [456]

        metrics = {"psi_mean": 0.05, "psi_max": 0.12, "drift_score": 0.08}

        # Execute
        audit_id = repository.persist_drift_audit(
            model="model_a_ml",
            baseline_label="2024-01-01",
            current_label="2024-02-01",
            metrics=metrics
        )

        # Verify
        assert audit_id == 456
        mock_cursor.execute.assert_called_once()

        # Verify SQL
        call_args = mock_cursor.execute.call_args
        assert 'INSERT INTO model_a_drift_audit' in call_args[0][0]
        assert json.dumps(metrics) in call_args[0][1]


class TestGetDriftSummary:
    """Test get_drift_summary method."""

    def test_get_drift_summary_all_models(self, repository, mock_db_context, mock_logger):
        """Test getting drift summary for all models."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = [
            {
                'id': 1,
                'model': 'model_a_ml',
                'baseline_label': '2024-01-01',
                'current_label': '2024-02-01',
                'metrics': {'psi_mean': 0.05},
                'created_at': datetime(2024, 2, 1, 10, 0, 0)
            },
        ]

        # Execute
        results = repository.get_drift_summary()

        # Verify
        assert len(results) == 1
        assert results[0]['model'] == 'model_a_ml'
        assert results[0]['id'] == 1

    def test_get_drift_summary_specific_model(self, repository, mock_db_context, mock_logger):
        """Test getting drift summary for specific model."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        repository.get_drift_summary(model="model_a_ml", limit=5)

        # Verify
        call_args = mock_cursor.execute.call_args
        assert 'model_a_ml' in call_args[0][1]
        assert 5 in call_args[0][1]

    def test_get_drift_summary_empty_results(self, repository, mock_db_context, mock_logger):
        """Test drift summary with no results."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        results = repository.get_drift_summary()

        # Verify
        assert results == []


class TestGetModelStatus:
    """Test get_model_status method."""

    def test_get_model_status_complete(self, repository, mock_db_context, mock_logger):
        """Test getting complete model status."""
        # Setup
        mock_cursor = mock_db_context['cursor']

        # Mock three queries: registry, signals, drift
        mock_cursor.fetchone.side_effect = [
            # Registry query
            {
                'id': 1,
                'model_name': 'model_a_ml',
                'version': 'v1.2.0',
                'metrics': {'roc_auc': 0.85},
                'features': ['momentum', 'rsi'],
                'artifacts': {'path': '/models/v1.2.0'},
                'created_at': datetime(2024, 1, 15, 10, 0, 0)
            },
            # Signals query
            {
                'as_of': date(2024, 1, 15),
                'signal_count': 50
            },
            # Drift query
            {
                'id': 1,
                'baseline_label': '2024-01-01',
                'current_label': '2024-02-01',
                'metrics': {'psi_mean': 0.05},
                'created_at': datetime(2024, 2, 1, 10, 0, 0)
            }
        ]

        # Execute
        status = repository.get_model_status("model_a_ml")

        # Verify
        assert status['model'] == 'model_a_ml'
        assert status['registry'] is not None
        assert status['registry']['version'] == 'v1.2.0'
        assert status['signals'] is not None
        assert status['signals']['row_count'] == 50
        assert status['drift'] is not None

    def test_get_model_status_partial(self, repository, mock_db_context, mock_logger):
        """Test getting model status with missing data."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.side_effect = [None, None, None]  # All queries return None

        # Execute
        status = repository.get_model_status("model_a_ml")

        # Verify
        assert status['model'] == 'model_a_ml'
        assert status['registry'] is None
        assert status['signals'] is None
        assert status['drift'] is None


class TestErrorHandling:
    """Test error handling across all methods."""

    def test_get_live_signals_error(self, repository, mock_db_context, mock_logger):
        """Test error handling in get_live_signals."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Database error")

        # Execute & Verify
        with pytest.raises(Exception):
            repository.get_live_signals()

        mock_logger.error.assert_called()

    def test_persist_signals_error(self, repository, mock_db_context, mock_logger):
        """Test error handling in persist_signals."""
        # Setup
        signals = [{'symbol': 'BHP.AX', 'rank': 1}]

        with patch('app.features.signals.repositories.signal_repository.execute_values') as mock_execute_values:
            mock_execute_values.side_effect = Exception("Insert failed")

            # Execute & Verify
            with pytest.raises(Exception):
                repository.persist_signals(signals, "model_a_ml", "2024-01-15")

            mock_logger.error.assert_called()

    def test_register_model_run_error(self, repository, mock_db_context, mock_logger):
        """Test error handling in register_model_run."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Registry insert failed")

        # Execute & Verify
        with pytest.raises(Exception):
            repository.register_model_run("model_a_ml")

        mock_logger.error.assert_called()


class TestSQLQueryCorrectness:
    """Test SQL query correctness."""

    def test_get_live_signals_sql_structure(self, repository, mock_db_context, mock_logger):
        """Test that get_live_signals generates correct SQL."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 15)
        mock_cursor.fetchone.return_value = {'max_date': test_date}
        mock_cursor.fetchall.return_value = []

        # Execute
        repository.get_live_signals()

        # Verify SQL structure
        calls = mock_cursor.execute.call_args_list
        # First call: MAX(as_of)
        assert 'MAX(as_of)' in calls[0][0][0]
        # Second call: SELECT with ORDER BY rank
        assert 'ORDER BY rank ASC' in calls[1][0][0]

    def test_persist_signals_uses_execute_values(self, repository, mock_db_context, mock_logger):
        """Test that persist_signals uses execute_values for efficiency."""
        # Setup
        signals = [{'symbol': 'BHP.AX', 'rank': 1, 'score': 0.95, 'ml_prob': 0.87, 'ml_expected_return': 0.15}]

        # Execute
        with patch('app.features.signals.repositories.signal_repository.execute_values') as mock_execute_values:
            repository.persist_signals(signals, "model_a_ml", "2024-01-15")

            # Verify execute_values was used
            mock_execute_values.assert_called_once()
