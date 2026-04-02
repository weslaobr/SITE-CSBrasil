@echo off
title TropaCS - Iniciar Website + Bot Steam + Tracker
echo ========================================================
echo   INICIANDO SERVIDORES TropaCS COMPLETOS
echo ========================================================
setlocal
cd /d %~dp0

if not exist ".env" (
    echo [ERROR] Arquivo .env nao encontrado! 
    pause
    exit /b 1
)

echo [1/4] Iniciando Bot Steam (Porta 3005)...
start "TropaCS Bot Steam" cmd /c "npm run bot"

echo [2/4] Iniciando Backend Tracker (Porta 8000)...
start "Backend Python" cmd /c "cd backend && py -m uvicorn app.main:app --reload --port 8000"

echo [3/4] Iniciando Celery Worker...
start "Celery Worker" cmd /c "cd backend && py -m celery -A celery_worker.celery_app worker --loglevel=info"

echo [4/4] Iniciando Servidor Next.js (Porta 3000)...
echo O site estara disponivel em http://localhost:3000
echo.
call npm run dev

pause
