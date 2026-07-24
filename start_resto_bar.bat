@echo off
TITLE Resto Bar Del Teatro - Servidor Local On-Premise
COLOR 0A
cls
echo ====================================================================
echo   RESTO BAR DEL TEATRO - CONSTITUCION 944, RIO CUARTO
echo   Iniciando Servidor Local POS / ERP Gastronomico
echo ====================================================================
echo.

echo [1/3] Verificando Docker Desktop...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Docker no esta instalado o no se encuentra iniciado.
    echo Por favor inicie Docker Desktop y vuelva a ejecutar este instalador.
    pause
    exit /b
)

echo [2/3] Compilando e Iniciando Contenedores (Web, Postgres, Redis)...
docker-compose up -d --build

echo.
echo [3/3] Servidor Iniciado con Exito!
echo.
echo ====================================================================
echo   Acceda a la aplicacion desde cualquier navegador en la red LAN:
echo   - Local:    http://localhost
echo   - IP Red:   http://192.168.1.100 (Reemplazar por IP de este equipo)
echo ====================================================================
echo.
pause
