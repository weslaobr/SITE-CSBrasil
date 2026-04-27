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

:: Install/upgrade requirements (garante demoparser2>=0.41.2 para AnimGraph 2)
echo [INFO] Verificando/atualizando dependencias...
venv\Scripts\python.exe -m pip install --upgrade -r requirements.txt >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Instalacao silenciosa falhou, tentando modo verboso...
    venv\Scripts\python.exe -m pip install --upgrade -r requirements.txt
)
echo [INFO] demoparser2 version:
venv\Scripts\python.exe -m pip show demoparser2 | findstr Version

echo [OK] Pronto! Iniciando o Launcher...
echo.

venv\Scripts\python.exe main.py
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O Launcher fechou com erro ^(code: %errorlevel%^).
    pause
)

endlocal
