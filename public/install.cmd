@echo off
setlocal
echo.
echo ========================================================
echo               AUI Engine CLI v1.0.0
echo      The safe adaptive UI layer for any website
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [-] Node.js is required. Please install Node.js from https://nodejs.org
    exit /b 1
)

set "INSTALL_DIR=%USERPROFILE%\.aui"
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"

echo [*] Downloading AUI CLI from GitHub...
git clone --depth 1 https://github.com/crossdagifx1/addaptive-ui.git "%INSTALL_DIR%"
cd /d "%INSTALL_DIR%"

echo [*] Installing and building...
call npm install --silent
call npm run build --silent

cd /d "%INSTALL_DIR%\packages\cli"
call npm link --silent

echo.
echo [OK] AUI CLI successfully installed!
echo Run "aui --help" to get started.
echo.
endlocal
