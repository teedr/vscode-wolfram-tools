# Mathematica Jump to Definition - VSCode Extension

A VSCode extension that allows quick navigation to Wolfram Language function definitions within your project's source files.

## Features

- Function definition search across Wolfram Language (`.m`) files in `sources` directories
- Keyboard shortcuts:
    - `Cmd+Shift+J` (Mac) or `Ctrl+Shift+J` (Windows/Linux)
    - `F10` while the cursor is on the symbol

## Local Installation

### Method 1: Symlink (Development)

1. Clone this repository
2. Install dependencies: (`npm install`)
3. Run the extension: (`npm run compile`)
4. Symlink the extension: (`ln -s /Users/teedrm/Documents/github/vscode-wolfram-tools ~/.vscode/extensions/jump-to-function` or `ln -s /Users/teedrm/Documents/github/vscode-wolfram-tools ~/.cursor/extensions/jump-to-function`)
5. Restart VSCode or Cursor
