@echo off
echo ==========================================
echo Starting SITE-CSBrasil Local Development
echo ==========================================
echo.
echo [1/2] Generating Prisma Client...
call npx prisma generate
echo.
echo [2/2] Starting Next.js Development Server...
echo The site will be available at http://localhost:3000
echo.
npm run dev
pause
