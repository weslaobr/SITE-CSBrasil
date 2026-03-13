@echo off
setlocal
cd /d %~dp0

echo ==========================================
echo Starting SITE-CSBrasil Local Development
echo ==========================================

echo.
echo [0/3] Cleaning up lingering processes...
:: Find process on port 3000 and kill it
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo [INFO] Found process %%a on port 3000. Terminating...
    taskkill /F /PID %%a 2>nul
)

:: Clear Next.js lock if it exists
if exist ".next\dev\lock" (
    echo [INFO] Removing Next.js lock file...
    del /f /q ".next\dev\lock" 2>nul
)

echo.
echo [1/4] Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Prisma generation failed. This might be due to file locking.
    echo If the site was already running, this is normal.
)

echo.
echo [2/4] Updating skin prices from market.csgo.com...
call npx tsx scripts/update-prices.ts
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Price update failed. Existing cached prices will be used.
)

echo.
echo [3/4] Starting Next.js Development Server...
echo The site will be available at http://localhost:3000
echo.
call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server encountered an issue. 
    echo Please make sure no other terminal is running the site.
)

echo.
echo Press any key to exit...
pause > nul
