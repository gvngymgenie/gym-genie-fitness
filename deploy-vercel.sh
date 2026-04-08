#!/bin/bash

# Gym Genie Vercel Deployment Script

echo "🚀 Starting Gym Genie Vercel Deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm install -g vercel"
    echo "   or visit: https://vercel.com/docs/cli"
    exit 1
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

echo "✅ Vercel CLI is installed and you're logged in"

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "🎉 Your Gym Genie application is now live on Vercel!"
echo ""
echo "Next steps:"
echo "1. Set up environment variables in Vercel dashboard if not already done"
echo "2. Configure your domain (optional)"
echo "3. Monitor the deployment in Vercel dashboard"
echo ""
echo "Environment variables needed:"
echo "- DATABASE_URL"
echo "- VITE_FIREBASE_API_KEY"
echo "- VITE_FIREBASE_AUTH_DOMAIN"
echo "- VITE_FIREBASE_PROJECT_ID"
echo "- VITE_FIREBASE_STORAGE_BUCKET"
echo "- VITE_FIREBASE_MESSAGING_SENDER_ID"
echo "- VITE_FIREBASE_APP_ID"
echo "- VITE_FIREBASE_VAPID_KEY"
echo "- FIREBASE_SERVICE_ACCOUNT"