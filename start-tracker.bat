@echo off
title TropaCS Tracker - All In One
echo ===========================================
2: echo   INICIANDO SERVIDORES TROPACS TRACKER
echo ===========================================

cd /d %~dp0

:: 1. Iniciar Backend FastAPI
echo.
echo [1/4] Iniciando Backend FastAPI (Porta 8000)...
start "Backend FastAPI" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"

:: 2. Iniciar Redis (Se o usuario tiver o redis instalado localmente)
echo.
echo [2/4] Verificando Redis...
:: Assumindo que o Redis pode estar rodando ou o usuario ja tenha ele
:: start "Redis Server" cmd /c "redis-server"

:: 3. Iniciar Celery Worker
echo.
echo [3/4] Iniciando Celery Worker...
start "Celery Worker" cmd /k "cd backend && celery -A celery_worker.celery_app worker --loglevel=info"

:: 4. Iniciar Frontend Next.js
echo.
echo [4/4] Iniciando Frontend Next.js (Porta 3000)...
echo O site estara disponivel em http://localhost:3000
echo.
call npm run dev

pause
