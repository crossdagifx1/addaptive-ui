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

set "AUI_DIR=%USERPROFILE%\.aui"
set "BIN_DIR=%AUI_DIR%\bin"

if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

echo [*] Downloading AUI CLI binary (163 KB)...
curl -fsSL https://addaptive-ui.vercel.app/aui.mjs -o "%AUI_DIR%\aui.mjs"

echo @echo off > "%BIN_DIR%\aui.cmd"
echo node "%%~dp0\..\aui.mjs" %%* >> "%BIN_DIR%\aui.cmd"

echo [*] Adding to PATH...
setx PATH "%BIN_DIR%;%PATH%" >nul 2>nul
set "PATH=%BIN_DIR%;%PATH%"

echo.
echo [OK] AUI CLI successfully installed to %BIN_DIR%!
echo Run "aui --help" to get started.
echo.
endlocal
