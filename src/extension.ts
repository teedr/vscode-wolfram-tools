import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('jump-to-function.findFunction', async () => {
        // Show input box to get function name
        const functionName = await vscode.window.showInputBox({
            placeHolder: 'Enter function name to find',
            prompt: 'Search for function definition'
        });

        if (!functionName) {
            return;
        }

        // Create regex pattern for Wolfram Language function declarations
        const functionPattern = new RegExp(
            `\\b${functionName}\\[.*\\]\\s*:=`  // Matches: functionName[...] :=
        );

        // Show progress indicator while searching
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Searching for function "${functionName}"...`,
            cancellable: true
        }, async (progress, token) => {
            try {
                // Search only in .m files within 'sources' directories
                const files = await vscode.workspace.findFiles(
                    '**/sources/**/*.m',  // Only search in paths containing 'sources'
                    null,
                    100000
                );

                console.log('Found files:', files.map(f => f.fsPath));  // Debug line to see found files

                let filesSearched = 0;
                for (const file of files) {
                    if (token.isCancellationRequested) {
                        return;
                    }

                    // Update progress
                    progress.report({
                        message: `Searching file ${filesSearched + 1} of ${files.length}`,
                        increment: (1 / files.length) * 100
                    });

                    const document = await vscode.workspace.openTextDocument(file);
                    const text = document.getText();
                    const match = functionPattern.exec(text);

                    if (match) {
                        const position = document.positionAt(match.index);
                        
                        // Open the document and reveal the function
                        await vscode.window.showTextDocument(document, {
                            selection: new vscode.Selection(position, position),
                            preserveFocus: false
                        });

                        // Highlight the line
                        const range = document.lineAt(position.line).range;
                        const decoration = vscode.window.createTextEditorDecorationType({
                            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground')
                        });
                        
                        vscode.window.activeTextEditor?.setDecorations(decoration, [range]);

                        // Remove highlight after a delay
                        setTimeout(() => {
                            decoration.dispose();
                        }, 3000);

                        return;
                    }
                    filesSearched++;
                }

                vscode.window.showInformationMessage(`Function '${functionName}' not found.`);
            } catch (error) {
                vscode.window.showErrorMessage(`Error searching for function: ${error}`);
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}