#!/bin/bash
# Train Model A on Render with hyperparameter tuning
# Run this script on Render shell

set -e

echo "============================================================"
echo "🚀 Training Model A with Hyperparameter Tuning"
echo "============================================================"
echo ""

# Verify environment
echo "📋 Verifying environment..."
python -c "import lightgbm, pandas, psycopg2, optuna; print('✅ All dependencies available')" || {
    echo "❌ Missing dependencies!"
    exit 1
}

# Check database connection
echo "🔗 Checking database connection..."
python -c "import os, psycopg2; conn = psycopg2.connect(os.getenv('DATABASE_URL')); cursor = conn.cursor(); cursor.execute('SELECT COUNT(*) FROM prices'); print(f'✅ Database connected ({cursor.fetchone()[0]} prices)')" || {
    echo "❌ Database connection failed!"
    exit 1
}

echo ""
echo "============================================================"
echo "🎯 Starting Model A Training (30 trials, ~25-35 minutes)"
echo "============================================================"
echo ""

# Run training with hyperparameter tuning
python scripts/train_production_models.py --tune-hyperparams --n-trials 30

echo ""
echo "============================================================"
echo "✅ Training Complete!"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Check model performance in logs above"
echo "2. Validate deployment: python scripts/validate_deployment.py"
echo "3. View model status: curl https://asx-portfolio-os.onrender.com/model/status/summary"
