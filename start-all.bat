@echo off
title TropaCS - Iniciar Website + Bot Steam
echo ========================================
echo   INICIANDO SERVIDORES TropaCS
echo ========================================
setlocal
cd /d %~dp0

echo.
if not exist ".env" (
    echo [ERROR] Arquivo .env nao encontrado! 
    pause
    exit /b 1
)

echo [1/3] Iniciando Bot Steam em nova janela...
start "TropaCS Bot Steam" cmd /c "npm run bot"

echo.
echo [2/3] Verificando Prisma...
call npx.cmd prisma generate

echo.
echo [3/3] Iniciando Servidor Next.js...
echo O site estara disponivel em http://localhost:3000
echo.
call npm run dev

pause
