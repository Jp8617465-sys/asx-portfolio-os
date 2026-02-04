"""
jobs/portfolio_fusion_job.py
Unified portfolio analytics across equities, property, and loans.

Computes:
- Total net worth
- Asset allocation by class
- Debt service ratios
- Portfolio-level risk metrics
"""

from psycopg2.extras import RealDictCursor

from services.job_tracker import track_job
from jobs.db_utils import get_raw_connection


def fetch_portfolio_volatility(cursor):
    """
    Compute portfolio volatility from historical returns in portfolio_performance.

    Returns:
        float: Annualized volatility as percentage, or None if insufficient data
    """
    cursor.execute("""
        SELECT portfolio_return
        FROM portfolio_performance
        WHERE portfolio_return IS NOT NULL
        ORDER BY as_of DESC
        LIMIT 252
    """)
    rows = cursor.fetchall()

    if len(rows) < 2:
        return None

    returns = [r['portfolio_return'] for r in rows]
    import statistics
    try:
        # Daily volatility * sqrt(252) for annualized
        daily_std = statistics.stdev(returns)
        annualized_vol = daily_std * (252 ** 0.5)
        return round(annualized_vol * 100, 2)  # As percentage
    except Exception:
        return None


def fetch_max_drawdown(cursor):
    """
    Compute maximum drawdown from portfolio_performance table.

    Returns:
        float: Maximum drawdown as percentage, or None if insufficient data
    """
    cursor.execute("""
        SELECT as_of, portfolio_return
        FROM portfolio_performance
        WHERE portfolio_return IS NOT NULL
        ORDER BY as_of ASC
        LIMIT 252
    """)
    rows = cursor.fetchall()

    if len(rows) < 2:
        return None

    # Compute cumulative returns and drawdowns
    returns = [r['portfolio_return'] for r in rows]
    cumulative = [1.0]
    for ret in returns:
        cumulative.append(cumulative[-1] * (1 + ret / 100))

    # Calculate running maximum and drawdown
    running_max = cumulative[0]
    max_drawdown = 0.0
    for value in cumulative[1:]:
        if value > running_max:
            running_max = value
        drawdown = (running_max - value) / running_max * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    return round(max_drawdown, 2)


def fetch_equity_metrics(cursor):
    """Fetch equity portfolio metrics from model_a_ml_signals."""
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT ticker) as equity_count,
            SUM(CASE WHEN action = 'BUY' THEN 1 ELSE 0 END) as active_positions,
            AVG(confidence) as avg_confidence
        FROM model_a_ml_signals
        WHERE created_at > NOW() - INTERVAL '7 days'
    """)
    
    result = cursor.fetchone()
    
    # Estimate equity value (placeholder logic - replace with actual holdings)
    # In production, this would query actual portfolio positions
    equity_value = (result['active_positions'] or 0) * 10000  # Assume $10k per position
    
    return {
        'equity_value': equity_value,
        'equity_count': result['equity_count'] or 0,
        'equity_sharpe': None,  # Compute from portfolio_performance if available
        'equity_allocation_pct': 0.0
    }


def fetch_property_metrics(cursor):
    """Fetch property portfolio metrics from property_assets."""
    cursor.execute("""
        SELECT 
            COUNT(*) as property_count,
            SUM(avg_price * sample_count) as total_value,
            AVG(avg_yield) as avg_yield
        FROM property_assets
    """)
    
    result = cursor.fetchone()
    
    return {
        'property_value': result['total_value'] or 0.0,
        'property_count': result['property_count'] or 0,
        'property_yield_avg': result['avg_yield'] or 0.0,
        'property_allocation_pct': 0.0
    }


def fetch_loan_metrics(cursor):
    """Fetch loan obligation metrics from loan_accounts."""
    cursor.execute("""
        SELECT 
            COUNT(*) as loan_count,
            SUM(principal) as total_principal,
            SUM(monthly_payment) as total_monthly_payment
        FROM loan_accounts
    """)
    
    result = cursor.fetchone()
    
    return {
        'loan_balance': result['total_principal'] or 0.0,
        'loan_count': result['loan_count'] or 0,
        'loan_monthly_payment': result['total_monthly_payment'] or 0.0,
        'loan_allocation_pct': 0.0
    }


def compute_portfolio_fusion():
    """Compute unified portfolio metrics."""
    with track_job("portfolio_fusion", "fusion") as tracker:
        with get_raw_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            try:
                # Fetch metrics from each asset class
                equity = fetch_equity_metrics(cursor)
                property_data = fetch_property_metrics(cursor)
                loans = fetch_loan_metrics(cursor)
                
                # Compute volatility and max drawdown from historical returns
                portfolio_volatility = fetch_portfolio_volatility(cursor)
                max_drawdown = fetch_max_drawdown(cursor)
                
                # Compute aggregates
                total_assets = equity['equity_value'] + property_data['property_value']
                total_liabilities = loans['loan_balance']
                net_worth = total_assets - total_liabilities
                
                # Compute allocation percentages
                if total_assets > 0:
                    equity['equity_allocation_pct'] = (equity['equity_value'] / total_assets) * 100
                    property_data['property_allocation_pct'] = (property_data['property_value'] / total_assets) * 100
                
                if net_worth > 0:
                    loans['loan_allocation_pct'] = (loans['loan_balance'] / net_worth) * 100
                
                # Debt service ratio (monthly payment / monthly income assumption)
                # In production, pull actual income from user profile
                assumed_monthly_income = 10000  # Placeholder
                debt_service_ratio = (loans['loan_monthly_payment'] / assumed_monthly_income) * 100 if assumed_monthly_income > 0 else 0
                
                # Risk score (0-100, higher = riskier)
                # Simple heuristic: leverage + volatility proxy
                risk_score = min(100, debt_service_ratio + (loans['loan_allocation_pct'] / 2))
                
                # Insert fusion record
                cursor.execute("""
                    INSERT INTO portfolio_fusion (
                        equity_value, equity_count, equity_sharpe, equity_allocation_pct,
                        property_value, property_count, property_yield_avg, property_allocation_pct,
                        loan_balance, loan_count, loan_monthly_payment, loan_allocation_pct,
                        total_assets, total_liabilities, net_worth, debt_service_ratio,
                        portfolio_volatility, max_drawdown, risk_score,
                        data_freshness_hours, confidence_score
                    ) VALUES (
                        %(equity_value)s, %(equity_count)s, %(equity_sharpe)s, %(equity_allocation_pct)s,
                        %(property_value)s, %(property_count)s, %(property_yield_avg)s, %(property_allocation_pct)s,
                        %(loan_balance)s, %(loan_count)s, %(loan_monthly_payment)s, %(loan_allocation_pct)s,
                        %(total_assets)s, %(total_liabilities)s, %(net_worth)s, %(debt_service_ratio)s,
                        %(portfolio_volatility)s, %(max_drawdown)s, %(risk_score)s,
                        %(data_freshness_hours)s, %(confidence_score)s
                    )
                """, {
                    **equity,
                    **property_data,
                    **loans,
                    'total_assets': total_assets,
                    'total_liabilities': total_liabilities,
                    'net_worth': net_worth,
                    'debt_service_ratio': debt_service_ratio,
                    'portfolio_volatility': portfolio_volatility,
                    'max_drawdown': max_drawdown,
                    'risk_score': risk_score,
                    'data_freshness_hours': 0.0,
                    'confidence_score': 85.0
                })
                
                # Track job metrics
                tracker.set_records_processed(1)
                tracker.set_output_summary({
                    'total_assets': total_assets,
                    'total_liabilities': total_liabilities,
                    'net_worth': net_worth,
                    'debt_service_ratio': debt_service_ratio,
                    'risk_score': risk_score
                })
                
                print(f"✅ Portfolio fusion computed: Net Worth ${net_worth:,.2f}")
                return {
                    'total_assets': total_assets,
                    'total_liabilities': total_liabilities,
                    'net_worth': net_worth,
                    'debt_service_ratio': debt_service_ratio,
                    'risk_score': risk_score
                }
                
            finally:
                cursor.close()


if __name__ == "__main__":
    compute_portfolio_fusion()
