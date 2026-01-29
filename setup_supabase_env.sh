#!/bin/bash
# ASX Portfolio OS - Supabase Environment Setup

echo "========================================="
echo "ASX Portfolio OS - Supabase Configuration"
echo "========================================="
echo ""

# Prompt for Supabase password
read -sp "Enter your Supabase database password: " SUPABASE_PASSWORD
echo ""

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:${SUPABASE_PASSWORD}@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres"

# Generate secure keys
echo "Generating secure keys..."
export JWT_SECRET_KEY=$(openssl rand -hex 32)
export OS_API_KEY=$(openssl rand -hex 32)

# Prompt for EODHD API key
echo ""
read -p "Enter your EODHD API key (or press Enter to skip): " EODHD_KEY
if [ -n "$EODHD_KEY" ]; then
    export EODHD_API_KEY="$EODHD_KEY"
fi

# Optional: OpenAI API key for assistant
echo ""
read -p "Enter your OpenAI API key (or press Enter to skip): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
    export OPENAI_API_KEY="$OPENAI_KEY"
fi

# Create .env file
echo ""
echo "Creating .env file..."
cat > .env << ENVEOF
# Database
DATABASE_URL=${DATABASE_URL}

# Security Keys
JWT_SECRET_KEY=${JWT_SECRET_KEY}
OS_API_KEY=${OS_API_KEY}

# External APIs
EODHD_API_KEY=${EODHD_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}

# Optional
ENABLE_ASSISTANT=${OPENAI_API_KEY:+true}
SENTRY_DSN=
ENVEOF

echo ""
echo "✅ Environment file created: .env"
echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo "1. Test database connection:"
echo "   psql \"\$DATABASE_URL\" -c \"SELECT version();\""
echo ""
echo "2. Apply database schemas:"
echo "   bash setup_database.sh"
echo ""
echo "3. Install dependencies:"
echo "   pip install -r requirements.txt"
echo "   cd frontend && npm install"
echo ""
echo "4. Run verification:"
echo "   bash scripts/verify_production_ready.sh"
echo ""
echo "========================================="
