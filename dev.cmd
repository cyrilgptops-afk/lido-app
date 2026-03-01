@echo off
REM Lido Development Launcher
REM Starts both API and Web servers in development mode

echo.
echo ========================================
echo   Lido Development Environment
echo ========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo Installing root dependencies...
    call npm install
    echo.
)

if not exist "apps\api\node_modules\" (
    echo Installing API dependencies...
    cd apps\api
    call npm install
    cd ..\..
    echo.
)

if not exist "apps\web\node_modules\" (
    echo Installing Web dependencies...
    cd apps\web
    call npm install
    cd ..\..
    echo.
)

echo Starting development servers...
echo.
echo API Server will run on: http://localhost:3001
echo Web Server will run on: http://localhost:3000
echo API Docs available at: http://localhost:3001/api-docs
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Start both servers concurrently
npm run dev
