#!/bin/bash
# ==============================================================================
# Apply Portfolio Management Schema to Database
# ==============================================================================
# This script applies the user_portfolios schema to create tables for
# portfolio management features.
#
# Usage:
#   ./scripts/apply_portfolio_schema.sh
#
# Or on Render/production:
#   psql $DATABASE_URL -f schemas/user_portfolios.sql
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_FILE="$PROJECT_ROOT/schemas/user_portfolios.sql"

echo "🗄️  Applying Portfolio Management Schema"
echo "======================================================================"

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "❌ Schema file not found: $SCHEMA_FILE"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable not set"
  echo "💡 Set it with: export DATABASE_URL='postgresql://user:pass@host:port/db'"
  exit 1
fi

echo "📁 Schema file: $SCHEMA_FILE"
echo "🔗 Database: $DATABASE_URL"
echo ""
echo "Applying schema..."

psql "$DATABASE_URL" -f "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Successfully applied portfolio management schema!"
  echo ""
  echo "Created tables:"
  echo "  - user_portfolios"
  echo "  - user_holdings"
  echo "  - portfolio_rebalancing_suggestions"
  echo "  - portfolio_risk_metrics"
  echo ""
  echo "Created view:"
  echo "  - vw_portfolio_summary"
  echo ""
  echo "Created functions:"
  echo "  - update_portfolio_totals()"
  echo "  - sync_holding_prices()"
  echo "  - trigger_update_portfolio_totals()"
  echo ""
  echo "🎉 Portfolio management features are now ready!"
else
  echo ""
  echo "❌ Failed to apply schema"
  exit 1
fi
