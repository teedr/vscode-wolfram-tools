# Mathematica Jump to Definition - VSCode Extension

A VSCode extension that allows quick navigation to Wolfram Language function definitions within your project's source files.

## Features

- **Smart Search Order**: Searches for function definitions in the following priority:
  1. Active file (currently open)
  2. Other open files in the editor
  3. Files in the same directory as the active file
  4. Cached function definitions (stored in `.vscode/`)
  5. Entire project search
- **Function Definition Caching**: Automatically caches found function definitions for faster subsequent searches
- **Configurable Settings**: Customize search patterns, cache behavior, and more

## Keyboard Shortcuts

- `Cmd+Shift+J` (Mac) or `Ctrl+Shift+J` (Windows/Linux): Open function search dialog
- `F10`: Jump to function definition under cursor
- `Cmd+Shift+C` (Mac) or `Ctrl+Shift+C` (Windows/Linux): Clear function definition cache

## Configuration

The extension can be configured through VS Code settings:

- `jumpToFunction.searchPattern`: Glob pattern for Wolfram Language files (default: `**/sources/**/*.{m,wls}`)
- `jumpToFunction.excludePattern`: Glob pattern for excluded directories (default: `{.history,.vscode,.idea,**/ProcedureDefinitions}/**`)
- `jumpToFunction.enableCache`: Enable/disable function definition caching (default: `true`)
- `jumpToFunction.cacheInvalidationDays`: Days after which cached entries are considered stale (default: `30`)

## Cache

Function definitions are automatically cached in:
- `.vscode/function-cache.json`

The cache includes:
- Function name
- File path
- Line number
- Timestamp

Cache entries are automatically invalidated after the configured number of days, or you can manually clear the cache using the keyboard shortcut.

## Local Installation

### Using Symlink (Development)

1. Clone this repository
2. Install dependencies: (`npm install`)
3. Run the extension: (`npm run compile`)
4. Symlink the extension: (`ln -s ~/Documents/github/vscode-wolfram-tools ~/.vscode/extensions/jump-to-function`)
5. Restart VSCode
