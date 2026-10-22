#!/usr/bin/env bash
set -e

echo ""
echo -e "\033[36m╔══════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[36m║               AUI Engine CLI v1.0.0                  ║\033[0m"
echo -e "\033[36m║      The safe adaptive UI layer for any website      ║\033[0m"
echo -e "\033[36m╚══════════════════════════════════════════════════════╝\033[0m"
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[31m[-] Node.js is required but was not found.\033[0m"
    echo "Please install Node.js (v18+) from https://nodejs.org or via your package manager."
    exit 1
fi

INSTALL_DIR="$HOME/.aui"
rm -rf "$INSTALL_DIR"

echo -e "\033[34m[*] Downloading AUI Engine CLI...\033[0m"
git clone --depth 1 https://github.com/crossdagifx1/addaptive-ui.git "$INSTALL_DIR"

cd "$INSTALL_DIR"
echo -e "\033[34m[*] Installing dependencies...\033[0m"
npm install --silent
npm run build --silent

cd "$INSTALL_DIR/packages/cli"
sudo npm link --silent || npm link --silent

echo ""
echo -e "\033[32m✔ AUI CLI successfully installed!\033[0m"
echo "  Run 'aui --help' or 'aui init' to start creating safe adaptive UI."
echo ""
