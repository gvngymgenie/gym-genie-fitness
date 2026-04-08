#!/bin/bash

# Gym-Genie Development Startup Script
# This script starts both the backend API server and frontend development server

echo "🚀 Starting Gym-Genie Development Environment..."

# Function to handle cleanup on exit
cleanup() {
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start backend API server
echo "🔧 Starting backend API server on port 5000..."
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 3

# Start frontend development server
echo "🎨 Starting frontend development server on port 3000..."
npm run dev:client &
FRONTEND_PID=$!

echo ""
echo "✅ Development environment started!"
echo "   Backend API:  http://localhost:5000"
echo "   Frontend App: http://localhost:3000"
echo "   API Docs:     http://localhost:5000/api-docs"
echo ""
echo "📝 Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID