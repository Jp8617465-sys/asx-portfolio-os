"""
jobs/loan_simulator.py
Loan amortization, refinancing, and repayment optimization engine.
"""

import math
from datetime import datetime
import pandas as pd

def loan_amortization(principal, annual_rate, years, extra_payment=0.0):
    rate = annual_rate / 12
    months = years * 12
    monthly_payment = principal * (rate / (1 - (1 + rate) ** -months))
    schedule = []
    balance = principal
    for m in range(1, months + 1):
        interest = balance * rate
        principal_paid = monthly_payment - interest + extra_payment
        balance -= principal_paid
        schedule.append({
            "month": m,
            "interest": interest,
            "principal_paid": principal_paid,
            "balance": max(balance, 0)
        })
        if balance <= 0:
            break
    df = pd.DataFrame(schedule)
    total_interest = df["interest"].sum()
    print(f"🏦 Loan fully repaid in {len(df)} months, total interest: ${total_interest:,.2f}")
    return df

def compare_refinancing(principal, current_rate, new_rate, years_left):
    cur_payment = principal * ((current_rate / 12) / (1 - (1 + current_rate / 12) ** -(years_left * 12)))
    new_payment = principal * ((new_rate / 12) / (1 - (1 + new_rate / 12) ** -(years_left * 12)))
    diff = cur_payment - new_payment
    print(f"💰 Refinancing from {current_rate*100:.2f}% to {new_rate*100:.2f}% saves ${diff:,.2f}/mo.")
    return diff

def simulate_scenarios():
    print("🔍 Example simulation:")
    df = loan_amortization(600000, 0.065, 25, extra_payment=200)
    compare_refinancing(600000, 0.065, 0.045, 25)
    df.to_csv("outputs/loan_schedule.csv", index=False)
    print("✅ Loan schedule saved.")

if __name__ == "__main__":
    simulate_scenarios()
