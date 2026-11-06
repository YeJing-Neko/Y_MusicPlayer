@echo off
setlocal
cd /d "%~dp0"
set "ELECTRON_RUN_AS_NODE="
if not exist "node_modules\electron\dist\electron.exe" (
  echo.
  echo   Electron runtime was not found.
  echo   Please run "npm install" in this folder once, then try again.
  echo.
  pause
  exit /b 1
)
start "Y_Music" /D "%~dp0" "%~dp0node_modules\electron\dist\electron.exe" .
exit /b 0
