#!/bin/bash

# Gym Genie - Dual Vercel Deployment Script
# Deploys to BOTH clients simultaneously:
#   - Client 1: gym-genie-lime-fitness.vercel.app (Original)
#   - Client 2: gym-genie-one.vercel.app (New, separate database)

echo "============================================"
echo "🚀 Gym Genie - Dual Client Deployment"
echo "============================================"
echo "📦 Client 1: gym-genie-lime-fitness.vercel.app"
echo "📦 Client 2: gym-genie-one.vercel.app"
echo "🗄️  Client 2 uses separate Supabase database"
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
    echo "❌ .env.production.client2 not found. Please create it with Client 2 credentials."
    exit 1
fi

echo "✅ Vercel CLI is installed and you're logged in"
echo "✅ Client 2 environment file found"
echo ""

# Build the project ONCE
echo "🔨 Building project (shared codebase)..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

# Deploy to Client 1
echo "============================================"
echo "📤 DEPLOYING TO CLIENT 1 (Original)"
echo "============================================"
vercel --prod

if [ $? -ne 0 ]; then
    echo "❌ Client 1 deployment failed!"
    echo "⚠️  Client 2 deployment skipped due to Client 1 failure."
    exit 1
fi

echo "✅ Client 1 deployment successful!"
echo ""

# Deploy to Client 2
echo "============================================"
echo "📤 DEPLOYING TO CLIENT 2 (New)"
echo "============================================"
echo "📋 Loading environment variables from .env.production.client2"
vercel --prod --env-file .env.production.client2

if [ $? -ne 0 ]; then
    echo "❌ Client 2 deployment failed!"
    echo "⚠️  Client 1 was already deployed successfully."
    exit 1
fi

echo "✅ Client 2 deployment successful!"
echo ""
echo "============================================"
echo "✅ DUAL DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "============================================"
echo "🎉 Client 1: gym-genie-lime-fitness.vercel.app"
echo "🎉 Client 2: gym-genie-one.vercel.app"
echo "============================================"
