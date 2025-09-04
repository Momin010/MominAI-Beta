@echo off
echo ============================================
echo    MominAI Hybrid Sandbox Launcher
echo    (Alternative Port: 3001)
echo ============================================
echo.
echo Starting on port 3001 to avoid conflicts...
echo.

REM Check if port 3001 is available
netstat -an | find "3001" >nul 2>&1
if %errorlevel%==0 (
    echo WARNING: Port 3001 also appears to be in use.
    echo Please choose a different port or free up ports.
    echo.
    pause
    exit /b 1
)

REM Check if local Node.js exists
if exist "node-v22.19.0-win-x64\node.exe" (
    echo ✓ Local Node.js found (v22.19.0)
    echo Starting development server on port 3001...
    echo.
    cd /d "%~dp0"
    "node-v22.19.0-win-x64\node.exe" "node-v22.19.0-win-x64\node_modules\npm\bin\npm-cli.js" run dev -- -p 3001
) else (
    echo ! Local Node.js not found, trying system npm...
    echo Make sure Node.js and npm are installed globally.
    echo.
    cd /d "%~dp0"
    npm run dev -- -p 3001
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to start the development server.
    echo Please check:
    echo - Node.js installation
    echo - npm packages (run: npm install)
    echo - Environment variables in .env.local
    echo - Port availability
    echo.
) else (
    echo.
    echo ✓ Server started successfully!
    echo Visit: http://localhost:3001
    echo.
)

echo Press any key to close this window...
pause >nul