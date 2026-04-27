@echo off
title CS2 Demo Processor - CSBrasil

:: Verifica a versao do Python de forma mais simples
set PYTHON_CMD=python
py --version >nul 2>&1
if %errorlevel% equ 0 set PYTHON_CMD=py

echo [INFO] Python CMD: %PYTHON_CMD%

:: Cria o venv se nao existir
if not exist "venv\" (
    echo [INFO] Criando ambiente virtual Python...
    %PYTHON_CMD% -m venv venv
)

:: Ativa o venv
call venv\Scripts\activate.bat

:: Instala/atualiza dependencias (garante demoparser2>=0.41.2 para AnimGraph 2)
echo [INFO] Instalando/atualizando dependencias...
pip install -q --upgrade -r requirements.txt
echo [INFO] Versao do demoparser2:
pip show demoparser2 | findstr Version

:: Roda o aplicativo (chama python explicitamente de dentro do venv)
echo [INFO] Iniciando processador de demos...
echo.
python process_demo.py

pause
