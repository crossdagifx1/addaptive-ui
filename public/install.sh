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
    echo "Please install Node.js (v18+) from https://nodejs.org or via brew/apt."
    exit 1
fi

AUI_DIR="$HOME/.aui"
BIN_DIR="$AUI_DIR/bin"
mkdir -p "$BIN_DIR"

echo -e "\033[34m[*] Downloading AUI CLI binary (163 KB)...\033[0m"
curl -fsSL https://addaptive-ui.vercel.app/aui.mjs -o "$AUI_DIR/aui.mjs"

cat << 'EOF' > "$BIN_DIR/aui"
#!/usr/bin/env sh
exec node "$HOME/.aui/aui.mjs" "$@"
EOF
chmod +x "$BIN_DIR/aui"

SHELL_PROFILE="$HOME/.bashrc"
if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
fi

if ! grep -q "$BIN_DIR" "$SHELL_PROFILE" 2>/dev/null; then
    echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$SHELL_PROFILE"
fi

export PATH="$BIN_DIR:$PATH"

echo ""
echo -e "\033[32m✔ AUI CLI successfully installed to $BIN_DIR!\033[0m"
echo "  Run 'aui --help' or 'aui init' to start creating safe adaptive UI."
echo ""
