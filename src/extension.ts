import * as vscode from 'vscode';
import * as path from 'path';

async function searchForFunction(functionName: string) {
    // Extract the search logic into a reusable function
    const functionPattern = new RegExp(
        `^\\s*${functionName}\\[.*\\]\\s*:=`,
        'm'
    );

    // Get the search pattern from settings
    const config = vscode.workspace.getConfiguration('jumpToFunction');
    const searchPattern = config.get<string>('searchPattern') || '**/sources/**/*.m';

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Searching for "${functionName}"`,
        cancellable: true
    }, async (progress, token) => {
        try {
            // Get all matching files
            const files = await vscode.workspace.findFiles(
                searchPattern,
                null,
                100000
            );

            // Sort files by priority:
            // 1. Active file
            // 2. Files in same directory as active file
            // 3. All other files
            const activeEditor = vscode.window.activeTextEditor;
            let sortedFiles = files;
            
            if (activeEditor) {
                const activeFilePath = activeEditor.document.uri.fsPath;
                const activeFileDir = path.dirname(activeFilePath);
                const activeFileTopDir = activeFileDir.split('sources')[0] + 'sources';

                sortedFiles = [
                    // 1. Active file first
                    ...files.filter(f => f.fsPath === activeFilePath),
                    // 2. Files in same top-level sources directory
                    ...files.filter(f => {
                        const filePath = f.fsPath;
                        return filePath !== activeFilePath && 
                               filePath.startsWith(activeFileTopDir);
                    }),
                    // 3. All remaining files
                    ...files.filter(f => {
                        const filePath = f.fsPath;
                        return filePath !== activeFilePath && 
                               !filePath.startsWith(activeFileTopDir);
                    })
                ];
            }

            console.log('Searching files in order:', sortedFiles.map(f => f.fsPath));

            let filesSearched = 0;
            for (const file of sortedFiles) {
                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({
                    message: `Searching file ${filesSearched + 1} of ${sortedFiles.length}`,
                    increment: (1 / sortedFiles.length) * 100
                });

                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();
                const match = functionPattern.exec(text);

                if (match) {
                    // Find the start of actual content by skipping any newline and whitespace
                    const matchText = match[0];
                    const offset = matchText.search(/[^\s]/);
                    const position = document.positionAt(match.index + offset);
                    
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

    context.subscriptions.push(findFunction, findUnderCursor);
}

export function deactivate() {}