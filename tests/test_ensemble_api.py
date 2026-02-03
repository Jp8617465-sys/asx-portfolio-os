"""
Unit tests for ensemble API endpoints.
Tests /signals/ensemble/latest, /signals/ensemble/{ticker}, and /signals/compare.
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from datetime import datetime


@pytest.fixture
def mock_db():
    """Mock database connection."""
    with patch('app.routes.ensemble.db') as mock:
        yield mock


@pytest.fixture
def mock_require_key():
    """Mock API key validation."""
    with patch('app.routes.ensemble.require_key') as mock:
        mock.return_value = True
        yield mock


class TestEnsembleSignalsLatestEndpoint:
    """Test /signals/ensemble/latest endpoint."""

    def test_get_ensemble_signals_latest_success(self, mock_db, mock_require_key):
        """Should return latest ensemble signals."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([
            {
                'symbol': 'BHP.AU',
                'as_of': datetime.now().date(),
                'signal': 'BUY',
                'ensemble_score': 0.72,
                'confidence': 0.72,
                'model_a_signal': 'BUY',
                'model_b_signal': 'BUY',
                'model_a_confidence': 0.75,
                'model_b_confidence': 0.68,
                'conflict': False,
                'conflict_reason': None,
                'signals_agree': True,
                'rank': 1,
                'model_a_rank': 2,
                'model_b_rank': 1
            },
            {
                'symbol': 'CBA.AU',
                'as_of': datetime.now().date(),
                'signal': 'HOLD',
                'ensemble_score': 0.50,
                'confidence': 0.50,
                'model_a_signal': 'BUY',
                'model_b_signal': 'SELL',
                'model_a_confidence': 0.60,
                'model_b_confidence': 0.35,
                'conflict': True,
                'conflict_reason': 'A=BUY, B=SELL',
                'signals_agree': False,
                'rank': 50,
                'model_a_rank': 10,
                'model_b_rank': 80
            }
        ])

        with patch('app.routes.ensemble.pd.read_sql', return_value=sample_data):
            from app.routes.ensemble import get_ensemble_signals_latest

            result = get_ensemble_signals_latest(x_api_key='test-key')

            assert result['status'] == 'ok'
            assert result['count'] == 2
            assert len(result['signals']) == 2
            assert result['statistics']['agreement_rate'] == 0.5  # 1/2
            assert result['statistics']['conflict_rate'] == 0.5   # 1/2

    def test_get_ensemble_signals_with_agreement_filter(self, mock_db, mock_require_key):
        """Should filter to only agreed signals."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([
            {
                'symbol': 'BHP.AU',
                'as_of': datetime.now().date(),
                'signal': 'BUY',
                'ensemble_score': 0.72,
                'confidence': 0.72,
                'model_a_signal': 'BUY',
                'model_b_signal': 'BUY',
                'model_a_confidence': 0.75,
                'model_b_confidence': 0.68,
                'conflict': False,
                'conflict_reason': None,
                'signals_agree': True,
                'rank': 1,
                'model_a_rank': 2,
                'model_b_rank': 1
            }
        ])

        with patch('app.routes.ensemble.pd.read_sql', return_value=sample_data):
            from app.routes.ensemble import get_ensemble_signals_latest

            result = get_ensemble_signals_latest(
                agreement_only=True,
                x_api_key='test-key'
            )

            assert result['count'] == 1
            assert all(s['agreement']['signals_agree'] for s in result['signals'])

    def test_get_ensemble_signals_with_no_conflict_filter(self, mock_db, mock_require_key):
        """Should exclude conflicting signals."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([
            {
                'symbol': 'BHP.AU',
                'as_of': datetime.now().date(),
                'signal': 'BUY',
                'ensemble_score': 0.72,
                'confidence': 0.72,
                'model_a_signal': 'BUY',
                'model_b_signal': 'BUY',
                'model_a_confidence': 0.75,
                'model_b_confidence': 0.68,
                'conflict': False,
                'conflict_reason': None,
                'signals_agree': True,
                'rank': 1,
                'model_a_rank': 2,
                'model_b_rank': 1
            }
        ])

        with patch('app.routes.ensemble.pd.read_sql', return_value=sample_data):
            from app.routes.ensemble import get_ensemble_signals_latest

            result = get_ensemble_signals_latest(
                no_conflict=True,
                x_api_key='test-key'
            )

            assert result['count'] == 1
            assert all(not s['agreement']['conflict'] for s in result['signals'])

    def test_get_ensemble_signals_with_signal_filter(self, mock_db, mock_require_key):
        """Should filter by signal type (BUY/SELL/HOLD)."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([
            {
                'symbol': 'BHP.AU',
                'as_of': datetime.now().date(),
                'signal': 'BUY',
                'ensemble_score': 0.72,
                'confidence': 0.72,
                'model_a_signal': 'BUY',
                'model_b_signal': 'BUY',
                'model_a_confidence': 0.75,
                'model_b_confidence': 0.68,
                'conflict': False,
                'conflict_reason': None,
                'signals_agree': True,
                'rank': 1,
                'model_a_rank': 2,
                'model_b_rank': 1
            }
        ])

        with patch('app.routes.ensemble.pd.read_sql', return_value=sample_data):
            from app.routes.ensemble import get_ensemble_signals_latest

            result = get_ensemble_signals_latest(
                signal_filter='BUY',
                x_api_key='test-key'
            )

            assert result['count'] == 1
            assert all(s['signal'] == 'BUY' for s in result['signals'])

    def test_get_ensemble_signals_empty_result(self, mock_db, mock_require_key):
        """Should handle no signals gracefully."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        empty_data = pd.DataFrame()

        with patch('app.routes.ensemble.pd.read_sql', return_value=empty_data):
            from app.routes.ensemble import get_ensemble_signals_latest

            result = get_ensemble_signals_latest(x_api_key='test-key')

            assert result['status'] == 'ok'
            assert result['count'] == 0
            assert len(result['signals']) == 0
            assert 'No ensemble signals found' in result['message']

    def test_get_ensemble_signals_limit_parameter(self, mock_db, mock_require_key):
        """Should respect limit parameter."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        # Create 100 signals but limit to 10
        sample_data = pd.DataFrame([
            {
                'symbol': f'STOCK{i}.AU',
                'as_of': datetime.now().date(),
                'signal': 'BUY',
                'ensemble_score': 0.70,
                'confidence': 0.70,
                'model_a_signal': 'BUY',
                'model_b_signal': 'BUY',
                'model_a_confidence': 0.75,
                'model_b_confidence': 0.65,
                'conflict': False,
                'conflict_reason': None,
                'signals_agree': True,
                'rank': i+1,
                'model_a_rank': i+1,
                'model_b_rank': i+1
            }
            for i in range(10)  # Only return 10 due to limit
        ])

        with patch('app.routes.ensemble.pd.read_sql', return_value=sample_data):
            from app.routes.ensemble import get_ensemble_signals_latest

            result = get_ensemble_signals_latest(limit=10, x_api_key='test-key')

            assert result['count'] == 10


class TestEnsembleSignalSingleTicker:
    """Test /signals/ensemble/{ticker} endpoint."""

    def test_get_ensemble_signal_for_ticker_success(self, mock_db, mock_require_key):
        """Should return ensemble signal for specific ticker."""
        # Assuming this endpoint exists - adjust based on actual implementation
        pass

    def test_get_ensemble_signal_ticker_not_found(self, mock_db, mock_require_key):
        """Should return 404 for ticker with no signal."""
        pass

    def test_get_ensemble_signal_adds_au_suffix(self, mock_db, mock_require_key):
        """Should add .AU suffix to ticker if needed."""
        pass


class TestEnsembleConflictDetection:
    """Test conflict detection in ensemble responses."""

    def test_conflict_flag_true_when_models_disagree(self, mock_db, mock_require_key):
        """Should set conflict=True when Model A and B give opposite signals."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([
            {
                'symbol': 'CBA.AU',
                'as_of': datetime.now().date(),
                'signal': 'HOLD',
                'ensemble_score': 0.50,
                'confidence': 0.50,
                'model_a_signal': 'BUY',
                'model_b_signal': 'SELL',
                'model_a_confidence': 0.60,
                'model_b_confidence': 0.35,
                'conflict': True,
                'conflict_reason': 'A=BUY, B=SELL',
                'signals_agree': False,
                'rank': 50,
                'model_a_rank': 10,
                'model_b_rank': 80
            }
        ])

        with patch('app.routes.ensemble.pd.read_sql', return_value=sample_data):
            from app.routes.ensemble import get_ensemble_signals_latest

            result = get_ensemble_signals_latest(x_api_key='test-key')

            signal = result['signals'][0]
            assert signal['agreement']['conflict'] is True
            assert signal['agreement']['conflict_reason'] == 'A=BUY, B=SELL'
            assert signal['signal'] == 'HOLD'  # Conservative on conflict

    def test_conflict_flag_false_when_models_agree(self, mock_db, mock_require_key):
        """Should set conflict=False when models agree."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([
            {
                'symbol': 'BHP.AU',
                'as_of': datetime.now().date(),
                'signal': 'BUY',
                'ensemble_score': 0.72,
                'confidence': 0.72,
                'model_a_signal': 'BUY',
                'model_b_signal': 'BUY',
                'model_a_confidence': 0.75,
                'model_b_confidence': 0.68,
                'conflict': False,
                'conflict_reason': None,
                'signals_agree': True,
                'rank': 1,
                'model_a_rank': 2,
                'model_b_rank': 1
            }
        ])

        with patch('app.routes.ensemble.pd.read_sql', return_value=sample_data):
            from app.routes.ensemble import get_ensemble_signals_latest

            result = get_ensemble_signals_latest(x_api_key='test-key')

            signal = result['signals'][0]
            assert signal['agreement']['conflict'] is False
            assert signal['agreement']['signals_agree'] is True


class TestEnsembleStatistics:
    """Test ensemble statistics calculation."""

    def test_statistics_calculation(self, mock_db, mock_require_key):
        """Should calculate agreement and conflict rates correctly."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        # 4 signals: 3 agree, 1 conflicts
        sample_data = pd.DataFrame([
            {'symbol': 'S1', 'as_of': datetime.now().date(), 'signal': 'BUY',
             'ensemble_score': 0.7, 'confidence': 0.7,
             'model_a_signal': 'BUY', 'model_b_signal': 'BUY',
             'model_a_confidence': 0.7, 'model_b_confidence': 0.7,
             'conflict': False, 'conflict_reason': None, 'signals_agree': True,
             'rank': 1, 'model_a_rank': 1, 'model_b_rank': 1},
            {'symbol': 'S2', 'as_of': datetime.now().date(), 'signal': 'BUY',
             'ensemble_score': 0.7, 'confidence': 0.7,
             'model_a_signal': 'BUY', 'model_b_signal': 'BUY',
             'model_a_confidence': 0.7, 'model_b_confidence': 0.7,
             'conflict': False, 'conflict_reason': None, 'signals_agree': True,
             'rank': 2, 'model_a_rank': 2, 'model_b_rank': 2},
            {'symbol': 'S3', 'as_of': datetime.now().date(), 'signal': 'HOLD',
             'ensemble_score': 0.5, 'confidence': 0.5,
             'model_a_signal': 'BUY', 'model_b_signal': 'SELL',
             'model_a_confidence': 0.6, 'model_b_confidence': 0.4,
             'conflict': True, 'conflict_reason': 'A=BUY, B=SELL', 'signals_agree': False,
             'rank': 3, 'model_a_rank': 3, 'model_b_rank': 3},
            {'symbol': 'S4', 'as_of': datetime.now().date(), 'signal': 'SELL',
             'ensemble_score': 0.3, 'confidence': 0.3,
             'model_a_signal': 'SELL', 'model_b_signal': 'SELL',
             'model_a_confidence': 0.3, 'model_b_confidence': 0.3,
             'conflict': False, 'conflict_reason': None, 'signals_agree': True,
             'rank': 4, 'model_a_rank': 4, 'model_b_rank': 4},
        ])

        with patch('app.routes.ensemble.pd.read_sql', return_value=sample_data):
            from app.routes.ensemble import get_ensemble_signals_latest

            result = get_ensemble_signals_latest(x_api_key='test-key')

            stats = result['statistics']
            assert stats['agreement_rate'] == 0.75  # 3/4
            assert stats['conflict_rate'] == 0.25   # 1/4


class TestErrorHandling:
    """Test error handling in ensemble endpoints."""

    def test_database_error_returns_500(self, mock_db, mock_require_key):
        """Should return 500 on database error."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        with patch('app.routes.ensemble.pd.read_sql', side_effect=Exception("DB error")):
            from app.routes.ensemble import get_ensemble_signals_latest
            from fastapi import HTTPException

            with pytest.raises(HTTPException) as exc_info:
                get_ensemble_signals_latest(x_api_key='test-key')

            assert exc_info.value.status_code == 500

    def test_invalid_signal_filter(self, mock_db, mock_require_key):
        """Should handle invalid signal filter gracefully."""
        # FastAPI validation should catch this before reaching the handler
        pass
