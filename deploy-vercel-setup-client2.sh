#!/bin/bash

# Gym Genie - Client 2 Initial Setup Script
# Creates Vercel project and configures environment variables

echo "============================================"
echo "🔧 Gym Genie Client 2 - Initial Setup"
echo "============================================"
echo "📦 Project: gym-genie-one.vercel.app"
echo "🗄️  Database: Separate Supabase"
echo "============================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm install -g vercel"
    exit 1
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

# Check if client2 env file exists
if [ ! -f .env.production.client2 ]; then
    echo "❌ .env.production.client2 not found!"
    exit 1
fi

echo "✅ Vercel CLI is installed"
echo "✅ Logged in to Vercel"
echo "✅ Environment file found"
echo ""

# Parse environment variables
export $(grep -v '^#' .env.production.client2 | xargs)

echo "============================================"
echo "🔑 Setting Environment Variables in Vercel"
echo "============================================"
echo ""

# Helper function to set env var
set_vercel_env() {
    local var_name=$1
    local var_value=$2
    
    echo "📝 Setting $var_name..."
    echo "$var_value" | vercel env add "$var_name" production 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ $var_name set successfully"
    else
        echo "⚠️  $var_name may already exist or failed to set"
    fi
    echo ""
}

# Set each environment variable
set_vercel_env "DATABASE_URL" "$DATABASE_URL"
set_vercel_env "NODE_ENV" "$NODE_ENV"
set_vercel_env "PORT" "$PORT"
set_vercel_env "STATIC_SERVER_URL" "$STATIC_SERVER_URL"
set_vercel_env "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
set_vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
set_vercel_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
set_vercel_env "VITE_FIREBASE_API_KEY" "$VITE_FIREBASE_API_KEY"
set_vercel_env "VITE_FIREBASE_AUTH_DOMAIN" "$VITE_FIREBASE_AUTH_DOMAIN"
set_vercel_env "VITE_FIREBASE_PROJECT_ID" "$VITE_FIREBASE_PROJECT_ID"
set_vercel_env "VITE_FIREBASE_STORAGE_BUCKET" "$VITE_FIREBASE_STORAGE_BUCKET"
set_vercel_env "VITE_FIREBASE_MESSAGING_SENDER_ID" "$VITE_FIREBASE_MESSAGING_SENDER_ID"
set_vercel_env "VITE_FIREBASE_APP_ID" "$VITE_FIREBASE_APP_ID"
set_vercel_env "VITE_FIREBASE_VAPID_KEY" "$VITE_FIREBASE_VAPID_KEY"

echo "============================================"
echo "✅ Environment Variables Configured!"
echo "============================================"
echo ""
echo "🎉 Client 2 project is ready for deployment!"
echo "📦 URL: gym-genie-one.vercel.app"
echo ""
echo "Next steps:"
echo "  • Run 'npm run deploy:client2' to deploy to Client 2"
echo "  • Or run 'npm run deploy:both' to deploy both clients"
echo ""
