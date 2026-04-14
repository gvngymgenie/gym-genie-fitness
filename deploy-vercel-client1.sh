#!/bin/bash

# Gym Genie - Client 1 (Original) Vercel Deployment Script
# Deploys to: gym-genie-lime-fitness.vercel.app

echo "🚀 Starting Gym Genie Client 1 (Original) Deployment..."
echo "📦 Target: gym-genie-lime-fitness.vercel.app"
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

echo "✅ Vercel CLI is installed and you're logged in"
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

# Deploy to Vercel Client 1
echo "🌐 Deploying to Vercel (Client 1 - Original)..."
vercel --prod

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "✅ Client 1 Deployment completed successfully!"
echo "🎉 Your Gym Genie application is now live on: gym-genie-lime-fitness.vercel.app"
