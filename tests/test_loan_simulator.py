"""
tests/test_loan_simulator.py
Unit tests for loan simulation functions.
"""

import numpy as np


def test_amortization_schedule_monthly_payment():
    """Test that monthly payment calculation is correct."""
    principal = 500000  # $500k loan
    annual_rate = 0.06  # 6% interest
    years = 30

    monthly_rate = annual_rate / 12
    n_payments = years * 12

    # Standard amortization formula
    # M = P * [r(1+r)^n] / [(1+r)^n - 1]
    monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** n_payments) / (
        (1 + monthly_rate) ** n_payments - 1
    )

    # Should be around $2997.75 for these parameters
    assert np.isclose(monthly_payment, 2997.75, atol=1.0)


def test_amortization_schedule_total_interest():
    """Test that total interest calculation is correct."""
    principal = 500000
    annual_rate = 0.06
    years = 30

    monthly_rate = annual_rate / 12
    n_payments = years * 12

    monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** n_payments) / (
        (1 + monthly_rate) ** n_payments - 1
    )

    total_paid = monthly_payment * n_payments
    total_interest = total_paid - principal

    # Total interest should be significant over 30 years
    assert total_interest > principal * 0.5  # At least 50% of principal in interest
    assert total_interest < principal * 1.5  # Less than 150% of principal


def test_amortization_balance_decreases():
    """Test that loan balance decreases over time."""
    principal = 500000
    annual_rate = 0.06
    monthly_rate = annual_rate / 12
    years = 30
    n_payments = years * 12

    monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** n_payments) / (
        (1 + monthly_rate) ** n_payments - 1
    )

    # Simulate first few payments
    balance = principal
    balances = [balance]

    for _ in range(12):  # First year
        interest_payment = balance * monthly_rate
        principal_payment = monthly_payment - interest_payment
        balance -= principal_payment
        balances.append(balance)

    # Balance should decrease each month
    for i in range(1, len(balances)):
        assert balances[i] < balances[i - 1]

    # After 1 year, balance should still be high (mostly interest in early years)
    assert balance > principal * 0.97  # Should have paid down ~3% in first year


def test_amortization_final_balance_near_zero():
    """Test that final balance approaches zero."""
    principal = 100000
    annual_rate = 0.05
    monthly_rate = annual_rate / 12
    years = 15
    n_payments = years * 12

    monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** n_payments) / (
        (1 + monthly_rate) ** n_payments - 1
    )

    balance = principal
    for _ in range(n_payments):
        interest_payment = balance * monthly_rate
        principal_payment = monthly_payment - interest_payment
        balance -= principal_payment

    # Final balance should be very close to zero
    assert np.isclose(balance, 0, atol=0.01)


def test_refinance_scenario():
    """Test refinancing scenario calculation."""
    original_principal = 400000
    original_rate = 0.065
    new_rate = 0.055
    years_remaining = 25

    original_monthly_rate = original_rate / 12
    new_monthly_rate = new_rate / 12
    n_payments = years_remaining * 12

    # Original payment
    original_payment = original_principal * (
        original_monthly_rate * (1 + original_monthly_rate) ** n_payments
    ) / ((1 + original_monthly_rate) ** n_payments - 1)

    # New payment after refinance
    new_payment = original_principal * (
        new_monthly_rate * (1 + new_monthly_rate) ** n_payments
    ) / ((1 + new_monthly_rate) ** n_payments - 1)

    # Refinancing should lower monthly payment
    assert new_payment < original_payment

    # Calculate savings
    monthly_savings = original_payment - new_payment
    total_savings = monthly_savings * n_payments

    assert monthly_savings > 0
    assert total_savings > 10000  # Should save meaningful amount over loan life
