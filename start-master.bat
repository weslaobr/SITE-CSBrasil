@echo off
title TropaCS Ultimate - Iniciar Tudo (Site + Bot + Tracker)
echo =============================================================
echo               INICIANDO SISTEMA TropaCS COMPLETAR
echo =============================================================
setlocal
cd /d %~dp0

if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado! 
    pause
    exit /b 1
)

:: 1. Iniciar Redis (Opcional, se o usuario tiver instalado)
echo.
echo [1/5] Verificando Redis...
:: Se voce tem o redis-server.exe em algum lugar do PATH, descomente abaixo
:: start "Redis Server" cmd /c "redis-server"

:: 2. Iniciar Bot Steam (Porta 3005)
echo.
echo [2/5] Iniciando Bot Steam em nova janela...
start "TropaCS Bot Steam" cmd /c "npm run bot"

:: 3. Iniciar Backend FastAPI (Porta 8000)
echo.
echo [3/5] Iniciando Analisador de Demos (Python/FastAPI)...
start "TropaCS Tracker Backend" cmd /c "cd backend && py -m uvicorn app.main:app --reload --port 8000"

:: 4. Iniciar Celery Worker (Fila de Processamento)
echo.
echo [4/5] Iniciando Celery Worker...
start "TropaCS Celery Worker" cmd /c "cd backend && py -m celery -A celery_worker.celery_app worker --loglevel=info"

:: 5. Iniciar Frontend Next.js (Porta 3000)
echo.
echo [5/5] Iniciando Frontend Next.js...
echo O site estara disponivel em http://localhost:3000
echo.
call npm run dev

pause
