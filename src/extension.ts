import * as vscode from 'vscode';
import * as path from 'path';

async function searchForFunction(functionName: string) {
    // Extract the search logic into a reusable function
    const functionPattern = new RegExp(
        `\\b${functionName}\\[.*\\]\\s*:=`
    );

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Searching for function "${functionName}"...`,
        cancellable: true
    }, async (progress, token) => {
        try {
            const files = await vscode.workspace.findFiles(
                '**/sources/**/*.m',
                null,
                100000
            );

            console.log('Found files:', files.map(f => f.fsPath));

            let filesSearched = 0;
            for (const file of files) {
                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({
                    message: `Searching file ${filesSearched + 1} of ${files.length}`,
                    increment: (1 / files.length) * 100
                });

                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();
                const match = functionPattern.exec(text);

                if (match) {
                    const position = document.positionAt(match.index);
                    
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