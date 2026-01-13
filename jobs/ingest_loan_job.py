"""
jobs/ingest_loan_job.py
Ingest loan data into loan_accounts from CSV or env sample values.
"""

import csv
import os
from typing import List, Dict, Any, Optional

import psycopg2
from dotenv import load_dotenv

from jobs.loan_simulator import loan_amortization

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DEFAULT_LOAN_PATH = "data/loan_accounts.csv"


def _parse_float(value: str, default: Optional[float] = None) -> Optional[float]:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_int(value: str, default: Optional[int] = None) -> Optional[int]:
    if value is None:
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _load_rows_from_csv(path: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with open(path, newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(row)
    return rows


def _default_sample_rows() -> List[Dict[str, Any]]:
    return [
        {
            "principal": os.getenv("LOAN_SAMPLE_PRINCIPAL", "600000"),
            "annual_rate": os.getenv("LOAN_SAMPLE_RATE", "0.065"),
            "years": os.getenv("LOAN_SAMPLE_YEARS", "25"),
            "extra_payment": os.getenv("LOAN_SAMPLE_EXTRA", "0"),
        }
    ]


def _insert_loan(cur, principal: float, annual_rate: float, years: int, extra_payment: Optional[float]):
    schedule = loan_amortization(principal, annual_rate, years, extra_payment or 0.0)
    monthly_payment = float(schedule["principal_paid"].iloc[0] + schedule["interest"].iloc[0])
    total_interest = float(schedule["interest"].sum())

    cur.execute(
        """
        insert into loan_accounts (
            principal, annual_rate, years, extra_payment, monthly_payment, total_interest
        ) values (%s, %s, %s, %s, %s, %s)
        """,
        (principal, annual_rate, years, extra_payment, monthly_payment, total_interest),
    )


def main() -> None:
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL not set. Aborting.")

    input_path = os.getenv("LOAN_INPUT_PATH", DEFAULT_LOAN_PATH)
    if os.path.exists(input_path):
        raw_rows = _load_rows_from_csv(input_path)
        source = input_path
    else:
        raw_rows = _default_sample_rows()
        source = "env-sample"

    if not raw_rows:
        print("No loan rows found. Provide data/loan_accounts.csv or LOAN_INPUT_PATH.")
        return

    inserted = 0
    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        for row in raw_rows:
            principal = _parse_float(row.get("principal"))
            annual_rate = _parse_float(row.get("annual_rate"))
            years = _parse_int(row.get("years"))
            extra_payment = _parse_float(row.get("extra_payment"), 0.0)

            if principal is None or annual_rate is None or years is None:
                continue

            _insert_loan(cur, principal, annual_rate, years, extra_payment)
            inserted += 1

        con.commit()

    print(f"✅ Loan ingestion complete ({inserted} rows from {source}).")


if __name__ == "__main__":
    main()
