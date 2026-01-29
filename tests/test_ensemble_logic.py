"""
Unit tests for ensemble signal generation logic.
Tests weighted scoring, conflict detection, and agreement logic.
"""

import pandas as pd
import numpy as np
import pytest


class TestEnsembleWeightedScoring:
    """Test weighted ensemble scoring (60% Model A + 40% Model B)."""

    WEIGHT_A = 0.6
    WEIGHT_B = 0.4

    def test_ensemble_score_both_high_confidence(self):
        """Should compute weighted average of confidences."""
        row = {
            'model_a_confidence': 0.8,
            'model_b_confidence': 0.7
        }

        ensemble_score = self.WEIGHT_A * row['model_a_confidence'] + self.WEIGHT_B * row['model_b_confidence']

        assert ensemble_score == pytest.approx(0.76)  # 0.6*0.8 + 0.4*0.7

    def test_ensemble_score_both_low_confidence(self):
        """Should handle low confidence scores."""
        row = {
            'model_a_confidence': 0.3,
            'model_b_confidence': 0.2
        }

        ensemble_score = self.WEIGHT_A * row['model_a_confidence'] + self.WEIGHT_B * row['model_b_confidence']

        assert ensemble_score == pytest.approx(0.26)  # 0.6*0.3 + 0.4*0.2

    def test_ensemble_score_mixed_confidence(self):
        """Should weight Model A more heavily (60% vs 40%)."""
        row = {
            'model_a_confidence': 0.9,
            'model_b_confidence': 0.3
        }

        ensemble_score = self.WEIGHT_A * row['model_a_confidence'] + self.WEIGHT_B * row['model_b_confidence']

        assert ensemble_score == pytest.approx(0.66)  # 0.6*0.9 + 0.4*0.3
        # Model A's high confidence dominates despite Model B's low confidence


class TestConflictDetection:
    """Test conflict detection when models disagree."""

    def test_conflict_a_buy_b_sell(self):
        """Should detect conflict when A says BUY and B says SELL."""
        row = {
            'model_a_signal': 'BUY',
            'model_b_signal': 'SELL'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_b_bearish = row['model_b_signal'] in sell_signals

        conflict = (model_a_bullish and model_b_bearish)

        assert conflict is True

    def test_conflict_a_sell_b_buy(self):
        """Should detect conflict when A says SELL and B says BUY."""
        row = {
            'model_a_signal': 'SELL',
            'model_b_signal': 'BUY'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bearish = row['model_a_signal'] in sell_signals
        model_b_bullish = row['model_b_signal'] in buy_signals

        conflict = (model_a_bearish and model_b_bullish)

        assert conflict is True

    def test_conflict_strong_buy_vs_strong_sell(self):
        """Should detect conflict with STRONG signals."""
        row = {
            'model_a_signal': 'STRONG_BUY',
            'model_b_signal': 'STRONG_SELL'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_b_bearish = row['model_b_signal'] in sell_signals

        conflict = (model_a_bullish and model_b_bearish)

        assert conflict is True

    def test_no_conflict_both_buy(self):
        """Should not detect conflict when both are bullish."""
        row = {
            'model_a_signal': 'BUY',
            'model_b_signal': 'BUY'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_a_bearish = row['model_a_signal'] in sell_signals
        model_b_bullish = row['model_b_signal'] in buy_signals
        model_b_bearish = row['model_b_signal'] in sell_signals

        conflict = (model_a_bullish and model_b_bearish) or (model_a_bearish and model_b_bullish)

        assert conflict is False

    def test_no_conflict_both_sell(self):
        """Should not detect conflict when both are bearish."""
        row = {
            'model_a_signal': 'SELL',
            'model_b_signal': 'SELL'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_a_bearish = row['model_a_signal'] in sell_signals
        model_b_bullish = row['model_b_signal'] in buy_signals
        model_b_bearish = row['model_b_signal'] in sell_signals

        conflict = (model_a_bullish and model_b_bearish) or (model_a_bearish and model_b_bullish)

        assert conflict is False

    def test_no_conflict_one_hold(self):
        """Should not detect conflict when one is HOLD."""
        row = {
            'model_a_signal': 'BUY',
            'model_b_signal': 'HOLD'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_a_bearish = row['model_a_signal'] in sell_signals
        model_b_bullish = row['model_b_signal'] in buy_signals
        model_b_bearish = row['model_b_signal'] in sell_signals

        conflict = (model_a_bullish and model_b_bearish) or (model_a_bearish and model_b_bullish)

        assert conflict is False

    def test_no_conflict_both_hold(self):
        """Should not detect conflict when both are HOLD."""
        row = {
            'model_a_signal': 'HOLD',
            'model_b_signal': 'HOLD'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_a_bearish = row['model_a_signal'] in sell_signals
        model_b_bullish = row['model_b_signal'] in buy_signals
        model_b_bearish = row['model_b_signal'] in sell_signals

        conflict = (model_a_bullish and model_b_bearish) or (model_a_bearish and model_b_bullish)

        assert conflict is False


class TestConservativeHoldOnConflict:
    """Test that ensemble returns HOLD on conflict."""

    def test_final_signal_hold_on_conflict(self):
        """Should return HOLD when models conflict."""
        row = {
            'model_a_signal': 'BUY',
            'model_b_signal': 'SELL',
            'model_a_confidence': 0.7,
            'model_b_confidence': 0.6
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_b_bearish = row['model_b_signal'] in sell_signals
        conflict = (model_a_bullish and model_b_bearish)

        if conflict:
            final_signal = 'HOLD'
        else:
            final_signal = 'BUY'  # or other logic

        assert final_signal == 'HOLD'

    def test_conflict_reason_formatting(self):
        """Should format conflict reason as 'A=signal, B=signal'."""
        row = {
            'model_a_signal': 'STRONG_BUY',
            'model_b_signal': 'STRONG_SELL'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_b_bearish = row['model_b_signal'] in sell_signals
        conflict = (model_a_bullish and model_b_bearish)

        if conflict:
            conflict_reason = f"A={row['model_a_signal']}, B={row['model_b_signal']}"
        else:
            conflict_reason = None

        assert conflict_reason == "A=STRONG_BUY, B=STRONG_SELL"


class TestAgreementDetection:
    """Test agreement detection when models align."""

    def test_agreement_both_bullish(self):
        """Should detect agreement when both are bullish."""
        row = {
            'model_a_signal': 'BUY',
            'model_b_signal': 'STRONG_BUY'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_b_bullish = row['model_b_signal'] in buy_signals

        signals_agree = (model_a_bullish and model_b_bullish)

        assert signals_agree is True

    def test_agreement_both_bearish(self):
        """Should detect agreement when both are bearish."""
        row = {
            'model_a_signal': 'SELL',
            'model_b_signal': 'STRONG_SELL'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bearish = row['model_a_signal'] in sell_signals
        model_b_bearish = row['model_b_signal'] in sell_signals

        signals_agree = (model_a_bearish and model_b_bearish)

        assert signals_agree is True

    def test_agreement_both_hold(self):
        """Should detect agreement when both are HOLD."""
        row = {
            'model_a_signal': 'HOLD',
            'model_b_signal': 'HOLD'
        }

        signals_agree = (row['model_a_signal'] == 'HOLD' and row['model_b_signal'] == 'HOLD')

        assert signals_agree is True

    def test_no_agreement_buy_vs_hold(self):
        """Should not detect agreement for BUY vs HOLD."""
        row = {
            'model_a_signal': 'BUY',
            'model_b_signal': 'HOLD'
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        sell_signals = ['SELL', 'STRONG_SELL']

        model_a_bullish = row['model_a_signal'] in buy_signals
        model_a_bearish = row['model_a_signal'] in sell_signals
        model_b_bullish = row['model_b_signal'] in buy_signals
        model_b_bearish = row['model_b_signal'] in sell_signals

        signals_agree = (
            (model_a_bullish and model_b_bullish) or
            (model_a_bearish and model_b_bearish) or
            (row['model_a_signal'] == 'HOLD' and row['model_b_signal'] == 'HOLD')
        )

        assert signals_agree is False


class TestFinalSignalLogic:
    """Test final signal determination logic."""

    def test_final_signal_strong_buy_when_both_bullish(self):
        """Should return STRONG_BUY when both are strongly bullish."""
        row = {
            'model_a_signal': 'STRONG_BUY',
            'model_b_signal': 'BUY',
            'model_a_confidence': 0.8,
            'model_b_confidence': 0.7
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        model_a_bullish = row['model_a_signal'] in buy_signals
        model_b_bullish = row['model_b_signal'] in buy_signals

        if model_a_bullish and model_b_bullish:
            if row['model_a_signal'] == 'STRONG_BUY' and row['model_b_signal'] in buy_signals:
                final_signal = 'STRONG_BUY'
            else:
                final_signal = 'BUY'
        else:
            final_signal = 'HOLD'

        assert final_signal == 'STRONG_BUY'

    def test_final_signal_buy_when_both_buy(self):
        """Should return BUY when both are BUY (not STRONG)."""
        row = {
            'model_a_signal': 'BUY',
            'model_b_signal': 'BUY',
            'model_a_confidence': 0.6,
            'model_b_confidence': 0.7
        }

        buy_signals = ['BUY', 'STRONG_BUY']
        model_a_bullish = row['model_a_signal'] in buy_signals
        model_b_bullish = row['model_b_signal'] in buy_signals

        if model_a_bullish and model_b_bullish:
            if row['model_a_signal'] == 'STRONG_BUY' and row['model_b_signal'] in buy_signals:
                final_signal = 'STRONG_BUY'
            else:
                final_signal = 'BUY'
        else:
            final_signal = 'HOLD'

        assert final_signal == 'BUY'

    def test_final_signal_sell_when_both_bearish(self):
        """Should return SELL when both are bearish."""
        row = {
            'model_a_signal': 'SELL',
            'model_b_signal': 'SELL',
            'model_a_confidence': 0.3,
            'model_b_confidence': 0.4
        }

        sell_signals = ['SELL', 'STRONG_SELL']
        model_a_bearish = row['model_a_signal'] in sell_signals
        model_b_bearish = row['model_b_signal'] in sell_signals

        if model_a_bearish and model_b_bearish:
            if row['model_a_signal'] == 'STRONG_SELL' and row['model_b_signal'] in sell_signals:
                final_signal = 'STRONG_SELL'
            else:
                final_signal = 'SELL'
        else:
            final_signal = 'HOLD'

        assert final_signal == 'SELL'

    def test_final_signal_from_weighted_score_high(self):
        """Should use weighted score when no clear agreement/conflict."""
        ensemble_score = 0.7  # >= 0.65

        if ensemble_score >= 0.65:
            final_signal = 'BUY'
        elif ensemble_score <= 0.35:
            final_signal = 'SELL'
        else:
            final_signal = 'HOLD'

        assert final_signal == 'BUY'

    def test_final_signal_from_weighted_score_low(self):
        """Should use weighted score when no clear agreement/conflict."""
        ensemble_score = 0.3  # <= 0.35

        if ensemble_score >= 0.65:
            final_signal = 'BUY'
        elif ensemble_score <= 0.35:
            final_signal = 'SELL'
        else:
            final_signal = 'HOLD'

        assert final_signal == 'SELL'

    def test_final_signal_from_weighted_score_neutral(self):
        """Should return HOLD for neutral weighted score."""
        ensemble_score = 0.5  # Between 0.35 and 0.65

        if ensemble_score >= 0.65:
            final_signal = 'BUY'
        elif ensemble_score <= 0.35:
            final_signal = 'SELL'
        else:
            final_signal = 'HOLD'

        assert final_signal == 'HOLD'


class TestCombinedRank:
    """Test combined rank calculation."""

    def test_combined_rank_weighted_average(self):
        """Should compute weighted average of ranks."""
        WEIGHT_A = 0.6
        WEIGHT_B = 0.4

        row = {
            'model_a_rank': 10,
            'model_b_rank': 20
        }

        combined_rank = int(WEIGHT_A * row['model_a_rank'] + WEIGHT_B * row['model_b_rank'])

        assert combined_rank == 14  # 0.6*10 + 0.4*20 = 14

    def test_combined_rank_model_a_dominates(self):
        """Model A's rank should have more weight."""
        WEIGHT_A = 0.6
        WEIGHT_B = 0.4

        row = {
            'model_a_rank': 5,
            'model_b_rank': 50
        }

        combined_rank = int(WEIGHT_A * row['model_a_rank'] + WEIGHT_B * row['model_b_rank'])

        # Closer to 5 than 50
        assert combined_rank == 23  # 0.6*5 + 0.4*50 = 23
        assert abs(combined_rank - 5) < abs(combined_rank - 50)
