@echo off
TITLE Resto Bar Del Teatro - Backup Diario de Base de Datos
COLOR 0B
echo ====================================================================
echo   RESPALDO AUTOMATICO DE BASE DE DATOS Y STOCK
echo ====================================================================
echo.

set BACKUP_DIR=C:\Backups_Resto_Bar
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%

echo Generando copia de seguridad: resto_bar_backup_%TIMESTAMP%.sql ...
docker exec -t resto_bar_db pg_dump -U resto_bar_user resto_bar_db > "%BACKUP_DIR%\resto_bar_backup_%TIMESTAMP%.sql"

if %errorlevel% equ 0 (
    echo ✅ Copia de seguridad creada con exito en: %BACKUP_DIR%\resto_bar_backup_%TIMESTAMP%.sql
) else (
    echo ❌ ERROR al generar la copia de seguridad.
)

pause
