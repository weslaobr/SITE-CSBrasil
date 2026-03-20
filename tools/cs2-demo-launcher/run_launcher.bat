@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

echo ========================================
echo   CS2 Demo Launcher - Setup ^& Launch
echo ========================================

:: Check for python
set PY_CMD=python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    set PY_CMD=py
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERRO] Python nao encontrado! Instale o Python 3.10+ em python.org
        pause
        exit /b 1
    )
)

:: Virtual environment check
if not exist venv (
    echo [INFO] Criando ambiente virtual...
    !PY_CMD! -m venv venv
    if !errorlevel! neq 0 (
        echo [ERRO] Falha ao criar o venv.
        pause
        exit /b 1
    )
)

:: Install requirements
echo [INFO] Verificando dependencias...
venv\Scripts\python.exe -m pip install -r requirements.txt >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Algumas dependencias falharam na instalacao rapida.
    echo [INFO] Tentando instalacao completa ^(isso pode demorar^)...
    venv\Scripts\python.exe -m pip install -r requirements.txt
)

echo [OK] Pronto! Iniciando o Launcher...
echo.

venv\Scripts\python.exe main.py
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O Launcher fechou com erro ^(code: %errorlevel%^).
    pause
)

endlocal
