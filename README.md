# Mathematica Jump to Function - VSCode Extension

A VSCode extension that allows quick navigation to Wolfram Language function definitions within your project's source files.

## Features

- Quick function search across Wolfram Language (`.m`) files in `sources` directories
- Jump directly to function definitions
- Keyboard shortcut: `Cmd+Shift+J` (Mac) or `Ctrl+Shift+J` (Windows/Linux)
- Progress indicator during search
- Highlights the found function definition

## Local Installation

### Method 1: Symlink (Development)

1. Clone this repository
2. Install dependencies: (`npm install`)
3. Run the extension: (`npm run compile`)
4. Symlink the extension: (`ln -s /Users/teedrm/Documents/github/vscode-wolfram-tools ~/.vscode/extensions/jump-to-function` or `ln -s /Users/teedrm/Documents/github/vscode-wolfram-tools ~/.cursor/extensions/jump-to-function`)
5. Restart VSCode or Cursor
