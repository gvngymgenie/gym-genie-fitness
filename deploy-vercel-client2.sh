#!/bin/bash

# Gym Genie - Client 2 (New) Vercel Deployment Script
# Deploys to: gym-genie-one.vercel.app
# Uses separate Supabase database

echo "🚀 Starting Gym Genie Client 2 (New) Deployment..."
echo "📦 Target: gym-genie-one.vercel.app"
echo "🗄️  Database: Separate Supabase (iccsgalboobhqueupjbc)"
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

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

# Deploy to Vercel Client 2 with environment variables
echo "🌐 Deploying to Vercel (Client 2 - New)..."
echo "📋 Loading environment variables from .env.production.client2"
echo ""

# Deploy with environment file
vercel --prod --env-file .env.production.client2

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "✅ Client 2 Deployment completed successfully!"
echo "🎉 Your Gym Genie application is now live on: gym-genie-one.vercel.app"
