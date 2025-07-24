import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Cache interface for function definitions
interface FunctionCache {
    [functionName: string]: {
        filePath: string;
        line: number;
        timestamp: number;
    };
}

// Cache utility functions
function getCacheFilePath(): string {
    const cacheDir = '.vscode';
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        throw new Error('No workspace root found');
    }
    return path.join(workspaceRoot, cacheDir, 'function-cache.json');
}

function loadFunctionCache(): FunctionCache {
    try {
        const cachePath = getCacheFilePath();
        if (fs.existsSync(cachePath)) {
            const cacheData = fs.readFileSync(cachePath, 'utf8');
            return JSON.parse(cacheData);
        }
    } catch (error) {
        console.warn('Failed to load function cache:', error);
    }
    return {};
}

function saveFunctionCache(cache: FunctionCache): void {
    try {
        const cachePath = getCacheFilePath();
        const cacheDir = path.dirname(cachePath);
        
        // Ensure cache directory exists
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    } catch (error) {
        console.warn('Failed to save function cache:', error);
    }
}

// Utility function to find the line number of a function definition in text
function findFunctionDefinitionInText(functionName: string, text: string): number | null {
    const functionPattern = new RegExp(
        `^\\s*${functionName}\\[.*\\]\\s*:=`,
        'm'
    );
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        if (functionPattern.test(lines[i])) {
            return i;
        }
    }
    return null;
}

function getCachedFunction(functionName: string): { filePath: string; line: number } | null {
    const config = vscode.workspace.getConfiguration('jumpToFunction');
    const enableCache = config.get<boolean>('enableCache', true);
    
    if (!enableCache) {
        return null;
    }
    
    const cache = loadFunctionCache();
    const cached = cache[functionName];
    
    if (cached && fs.existsSync(cached.filePath)) {
        // Check if cache entry is stale
        const cacheInvalidationDays = config.get<number>('cacheInvalidationDays', 30);
        const cacheAge = Date.now() - cached.timestamp;
        const maxAge = cacheInvalidationDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
        
        if (cacheAge > maxAge) {
            // Remove stale entry
            delete cache[functionName];
            saveFunctionCache(cache);
            return null;
        }

        // Re-validate the line number in the file
        try {
            const document = fs.readFileSync(cached.filePath, 'utf8');
            const foundLine = findFunctionDefinitionInText(functionName, document);
            if (foundLine !== null) {
                // Update cache with new line number and timestamp
                cache[functionName] = {
                    filePath: cached.filePath,
                    line: foundLine,
                    timestamp: Date.now()
                };
                saveFunctionCache(cache);
                return {
                    filePath: cached.filePath,
                    line: foundLine
                };
            } else {
                // Function definition not found, remove cache entry
                delete cache[functionName];
                saveFunctionCache(cache);
                return null;
            }
        } catch (err) {
            // If file can't be read, treat as cache miss
            delete cache[functionName];
            saveFunctionCache(cache);
            return null;
        }
    }
    
    return null;
}

function updateFunctionCache(functionName: string, filePath: string, line: number): void {
    const config = vscode.workspace.getConfiguration('jumpToFunction');
    const enableCache = config.get<boolean>('enableCache', true);
    
    if (!enableCache) {
        return;
    }
    
    const cache = loadFunctionCache();
    cache[functionName] = {
        filePath,
        line,
        timestamp: Date.now()
    };
    saveFunctionCache(cache);
}

// Global cache instance
let functionCache: FunctionCache = {};

async function searchForFunction(functionName: string) {
    // Extract the search logic into a reusable function
    const functionPattern = new RegExp(
        `^\\s*${functionName}\\[.*\\]\\s*:=`,
        'm'
    );

    // Get both search and exclude patterns from settings
    const config = vscode.workspace.getConfiguration('jumpToFunction');
    const searchPattern = config.get<string>('searchPattern') || '**/sources/**/*.{m,wls}';
    const excludePattern = config.get<string>('excludePattern') || '{.history,.vscode,.idea,**/ProcedureDefinitions}/**';

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Searching for "${functionName}"`,
        cancellable: true
    }, async (progress, token) => {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            const activeFilePath = activeEditor?.document.uri.fsPath;

            // Phase 1: Search active file
            if (activeEditor) {
                progress.report({ message: 'Phase 1: Searching active file...' });
                const document = activeEditor.document;
                const text = document.getText();
                const foundLine = findFunctionDefinitionInText(functionName, text);

                if (foundLine !== null) {
                    const position = new vscode.Position(foundLine, 0);
                    
                    await vscode.window.showTextDocument(document, {
                        selection: new vscode.Selection(position, position),
                        preserveFocus: false
                    });

                    const range = document.lineAt(position.line).range;
                    const decoration = vscode.window.createTextEditorDecorationType({
                        backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground')
                    });
                    
                    vscode.window.activeTextEditor?.setDecorations(decoration, [range]);

                    setTimeout(() => {
                        decoration.dispose();
                    }, 3000);

                    // Update cache
                    updateFunctionCache(functionName, document.uri.fsPath, position.line);
                    return true;
                }
            }

            // Phase 2: Search other open files
            progress.report({ message: 'Phase 2: Searching open files...' });
            const openDocuments = vscode.workspace.textDocuments;
            for (const document of openDocuments) {
                if (token.isCancellationRequested) {
                    return;
                }

                // Skip active file (already searched)
                if (document.uri.fsPath === activeFilePath) {
                    continue;
                }

                const text = document.getText();
                const foundLine = findFunctionDefinitionInText(functionName, text);

                if (foundLine !== null) {
                    const position = new vscode.Position(foundLine, 0);
                    
                    await vscode.window.showTextDocument(document, {
                        selection: new vscode.Selection(position, position),
                        preserveFocus: false
                    });

                    const range = document.lineAt(position.line).range;
                    const decoration = vscode.window.createTextEditorDecorationType({
                        backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground')
                    });
                    
                    vscode.window.activeTextEditor?.setDecorations(decoration, [range]);

                    setTimeout(() => {
                        decoration.dispose();
                    }, 3000);

                    // Update cache
                    updateFunctionCache(functionName, document.uri.fsPath, position.line);
                    return true;
                }
            }

            // Phase 3: Search files in same directory as active file
            if (activeEditor) {
                progress.report({ message: 'Phase 3: Searching files in same directory...' });
                const activeFileDir = path.dirname(activeFilePath!);
                const activeFileTopDir = activeFileDir.split('sources')[0] + 'sources';

                const files = await vscode.workspace.findFiles(
                    searchPattern,
                    excludePattern,
                    100000
                );

                const sameDirFiles = files.filter(f => {
                    const filePath = f.fsPath;
                    return filePath !== activeFilePath && 
                           filePath.startsWith(activeFileTopDir);
                });

                for (const file of sameDirFiles) {
                    if (token.isCancellationRequested) {
                        return;
                    }

                    const document = await vscode.workspace.openTextDocument(file);
                    const text = document.getText();
                    const foundLine = findFunctionDefinitionInText(functionName, text);

                    if (foundLine !== null) {
                        const position = new vscode.Position(foundLine, 0);
                        
                        await vscode.window.showTextDocument(document, {
                            selection: new vscode.Selection(position, position),
                            preserveFocus: false
                        });

                        const range = document.lineAt(position.line).range;
                        const decoration = vscode.window.createTextEditorDecorationType({
                            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground')
                        });
                        
                        vscode.window.activeTextEditor?.setDecorations(decoration, [range]);

                        setTimeout(() => {
                            decoration.dispose();
                        }, 3000);

                        // Update cache
                        updateFunctionCache(functionName, document.uri.fsPath, position.line);
                        return true;
                    }
                }
            }

            // Phase 4: Check cache
            progress.report({ message: 'Phase 4: Checking cache...' });
            const cached = getCachedFunction(functionName);
            if (cached) {
                const document = await vscode.workspace.openTextDocument(cached.filePath);
                const position = new vscode.Position(cached.line, 0);
                
                await vscode.window.showTextDocument(document, {
                    selection: new vscode.Selection(position, position),
                    preserveFocus: false
                });

                const range = document.lineAt(position.line).range;
                const decoration = vscode.window.createTextEditorDecorationType({
                    backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground')
                });
                
                vscode.window.activeTextEditor?.setDecorations(decoration, [range]);

                setTimeout(() => {
                    decoration.dispose();
                }, 3000);

                return true;
            }

            // Phase 5: Search entire project
            progress.report({ message: 'Phase 5: Searching entire project...' });
            const allFiles = await vscode.workspace.findFiles(
                searchPattern,
                excludePattern,
                100000
            );

            let filesSearched = 0;
            for (const file of allFiles) {
                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({
                    message: `Searching file ${filesSearched + 1} of ${allFiles.length}`,
                    increment: (1 / allFiles.length) * 100
                });

                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();
                const foundLine = findFunctionDefinitionInText(functionName, text);

                if (foundLine !== null) {
                    const position = new vscode.Position(foundLine, 0);
                    
                    await vscode.window.showTextDocument(document, {
                        selection: new vscode.Selection(position, position),
                        preserveFocus: false
                    });

                    const range = document.lineAt(position.line).range;
                    const decoration = vscode.window.createTextEditorDecorationType({
                        backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground')
                    });
                    
                    vscode.window.activeTextEditor?.setDecorations(decoration, [range]);

                    setTimeout(() => {
                        decoration.dispose();
                    }, 3000);

                    // Update cache
                    updateFunctionCache(functionName, document.uri.fsPath, position.line);
                    return true;
                }
                filesSearched++;
            }

            vscode.window.showInformationMessage(`Function '${functionName}' not found.`);
            return false;
        } catch (error) {
            vscode.window.showErrorMessage(`Error searching for function: ${error}`);
            return false;
        }
    });
}

export function activate(context: vscode.ExtensionContext) {
    // Load cache on activation
    functionCache = loadFunctionCache();

    // Original command
    let findFunction = vscode.commands.registerCommand('jump-to-function.findFunction', async () => {
        const functionName = await vscode.window.showInputBox({
            placeHolder: 'Enter function name to find',
            prompt: 'Search for function definition'
        });

        if (functionName) {
            await searchForFunction(functionName);
        }
    });

    // New command for finding function under cursor
    let findUnderCursor = vscode.commands.registerCommand('jump-to-function.findUnderCursor', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const position = editor.selection.active;
        
        // Get the word range at the current cursor position
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return;
        }

        // Get the word under the cursor
        const functionName = document.getText(wordRange);
        if (functionName) {
            await searchForFunction(functionName);
        }
    });

    // Command to clear function cache
    let clearCache = vscode.commands.registerCommand('jump-to-function.clearCache', async () => {
        try {
            const cachePath = getCacheFilePath();
            if (fs.existsSync(cachePath)) {
                fs.unlinkSync(cachePath);
            }
            // Clear both file and memory cache
            functionCache = {};
            vscode.window.showInformationMessage('Function cache cleared successfully.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to clear cache: ${error}`);
        }
    });

    context.subscriptions.push(findFunction, findUnderCursor, clearCache);
}

export function deactivate() {}