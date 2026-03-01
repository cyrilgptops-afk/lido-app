#!/bin/bash
# Lido Development Launcher
# Starts both API and Web servers in development mode

echo ""
echo "========================================"
echo "  Lido Development Environment"
echo "========================================"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
    echo ""
fi

if [ ! -d "apps/api/node_modules" ]; then
    echo "Installing API dependencies..."
    cd apps/api
    npm install
    cd ../..
    echo ""
fi

if [ ! -d "apps/web/node_modules" ]; then
    echo "Installing Web dependencies..."
    cd apps/web
    npm install
    cd ../..
    echo ""
fi

echo "Starting development servers..."
echo ""
echo "API Server will run on: http://localhost:3001"
echo "Web Server will run on: http://localhost:3000"
echo "API Docs available at: http://localhost:3001/api-docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start both servers concurrently
npm run dev
