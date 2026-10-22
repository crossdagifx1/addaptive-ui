# AUI Engine CLI Windows PowerShell Installer
$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================================' -ForegroundColor Cyan
Write-Host '               AUI Engine CLI v1.0.0                    ' -ForegroundColor Cyan
Write-Host '      The safe adaptive UI layer for any website        ' -ForegroundColor Cyan
Write-Host '========================================================' -ForegroundColor Cyan
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host '[-] Node.js is required but was not found on your PATH.' -ForegroundColor Yellow
    Write-Host '[*] Attempting to install Node.js via winget...' -ForegroundColor Cyan
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host '[!] Please install Node.js (v18+) from https://nodejs.org and re-run.' -ForegroundColor Red
        exit 1
    }
}

$AuiHome = Join-Path $HOME '.aui'
$BinDir = Join-Path $AuiHome 'bin'
if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
}

Write-Host '[*] Downloading AUI Engine CLI standalone bundle...' -ForegroundColor Cyan
$AuiMjs = Join-Path $AuiHome 'aui.mjs'
Invoke-WebRequest -Uri 'https://addaptive-ui.vercel.app/aui.mjs' -OutFile $AuiMjs -UseBasicParsing

# Create aui.cmd wrapper
$CmdContent = '@echo off' + [System.Environment]::NewLine + 'node "%~dp0\..\aui.mjs" %*'
Set-Content -Path (Join-Path $BinDir 'aui.cmd') -Value $CmdContent -Encoding ASCII

# Create aui.ps1 wrapper
$Ps1Content = 'node "' + $AuiMjs + '" $args'
Set-Content -Path (Join-Path $BinDir 'aui.ps1') -Value $Ps1Content -Encoding ASCII

# Update User PATH permanently
$UserPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
if ($UserPath) {
    if ($UserPath -notlike ('*' + $BinDir + '*')) {
        [System.Environment]::SetEnvironmentVariable('Path', ($BinDir + ';' + $UserPath), 'User')
    }
} else {
    [System.Environment]::SetEnvironmentVariable('Path', $BinDir, 'User')
}

# Update session PATH immediately
if ($env:Path -notlike ('*' + $BinDir + '*')) {
    $env:Path = $BinDir + ';' + $env:Path
}

Write-Host ''
Write-Host '[OK] AUI CLI v1.0.0 successfully installed!' -ForegroundColor Green
Write-Host '  Run "aui --help" or "aui init" to start creating safe adaptive UI.' -ForegroundColor White
Write-Host ''
