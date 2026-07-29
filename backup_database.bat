@echo off
setlocal
TITLE Castaño - Backup de Supabase

if "%SUPABASE_DB_URL%"=="" (
  echo ERROR: configure SUPABASE_DB_URL con la cadena PostgreSQL del proyecto.
  exit /b 1
)

set "BACKUP_DIR=C:\Backups_Resto_Bar"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "datetime=%%I"
set "TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%"
set "BACKUP_FILE=%BACKUP_DIR%\castano_supabase_%TIMESTAMP%.sql"

call npx supabase db dump --db-url "%SUPABASE_DB_URL%" -f "%BACKUP_FILE%"
if errorlevel 1 (
  echo ERROR: no se pudo generar el backup.
  exit /b 1
)

echo Backup creado en %BACKUP_FILE%
endlocal
