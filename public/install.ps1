# AUI Engine CLI Windows PowerShell Installer
$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║               AUI Engine CLI v1.0.0                  ║" -ForegroundColor Cyan
Write-Host "║      The safe adaptive UI layer for any website      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[-] Node.js is required but was not found on your PATH." -ForegroundColor Yellow
    Write-Host "[*] Attempting to install Node.js via winget..." -ForegroundColor Cyan
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "[!] Please install Node.js (v18+) from https://nodejs.org and re-run." -ForegroundColor Red
        exit 1
    }
}

$InstallDir = Join-Path $HOME ".aui"
if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue
}

Write-Host "[*] Downloading AUI Engine CLI from GitHub..." -ForegroundColor Cyan
git clone --depth 1 https://github.com/crossdagifx1/addaptive-ui.git $InstallDir

Set-Location $InstallDir
Write-Host "[*] Building dependencies..." -ForegroundColor Cyan
npm install --silent 2>$null
npm run build --silent 2>$null

Set-Location (Join-Path $InstallDir "packages\cli")
npm link --silent 2>$null

Write-Host ""
Write-Host "✔ AUI CLI successfully installed!" -ForegroundColor Green
Write-Host "  Run 'aui --help' or 'aui init' to start creating safe adaptive UI." -ForegroundColor White
Write-Host ""
