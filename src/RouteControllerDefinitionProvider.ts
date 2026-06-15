'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Provides go-to-definition for string method names inside Route::controller()->group() blocks.
 *
 * Handles:
 *   Route::controller(FooController::class)->group(function () {
 *       Route::get('/path', 'methodName');  // ctrl+click on 'methodName' → FooController::methodName
 *   });
 *
 * Also handles chained fluent calls:
 *   Route::prefix('admin')->controller(FooController::class)->middleware('auth')->group(function () { ... });
 */
export default class RouteControllerDefinitionProvider implements vscode.DefinitionProvider {

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | null> {
        const methodName = this.getRouteActionAtCursor(document, position);
        if (!methodName) {
            return null;
        }

        const controllerClass = this.findEnclosingControllerClass(document, position);
        if (!controllerClass) {
            return null;
        }

        return this.resolveControllerMethod(controllerClass, methodName);
    }

    /**
     * Returns the method name if the cursor sits on the action string argument
     * of a Route::get/post/put/patch/delete/options/any/match() call.
     * Returns null otherwise.
     */
    private getRouteActionAtCursor(document: vscode.TextDocument, position: vscode.Position): string | null {
        const line = document.lineAt(position).text;

        // Cursor must be inside a quoted identifier (no slashes, no dots — those are URIs or FQNs)
        const wordRange = document.getWordRangeAtPosition(position, /['"][a-zA-Z_][a-zA-Z0-9_]*['"]/);
        if (!wordRange) {
            return null;
        }

        const methodName = document.getText(wordRange).slice(1, -1); // strip surrounding quotes

        // The line must be a Route HTTP verb call
        if (!/Route\s*::\s*(get|post|put|patch|delete|options|any|match)\s*\(/.test(line)) {
            return null;
        }

        // Cursor must be after the first comma — i.e., on the action arg, not the URI
        const firstCommaIdx = line.indexOf(',');
        if (firstCommaIdx === -1 || position.character <= firstCommaIdx) {
            return null;
        }

        return methodName;
    }

    /**
     * Scans the full document for Route::controller(X::class)->group({...}) blocks
     * and returns the short class name X for the innermost block that contains the cursor.
     */
    private findEnclosingControllerClass(document: vscode.TextDocument, position: vscode.Position): string | null {
        const text = document.getText();
        const offset = document.offsetAt(position);

        // Matches both:
        //   Route::controller(X::class)->group(... {
        //   ->controller(X::class)->group(... {       (chained)
        // Captures class name and finds the opening { of the group callback.
        const pattern = /(?:->|::)controller\s*\(\s*([\\A-Za-z0-9_]+)::class\s*\)\s*(?:->[^{]+)?\{/g;

        interface Candidate {
            controllerClass: string;
            blockStart: number;
            blockEnd: number;
        }

        const candidates: Candidate[] = [];
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(text)) !== null) {
            // blockStart is the index of the `{` that opens the group callback
            const blockStart = match.index + match[0].length - 1;
            const blockEnd = this.findMatchingBrace(text, blockStart);

            if (blockEnd !== -1) {
                candidates.push({
                    controllerClass: match[1],
                    blockStart,
                    blockEnd,
                });
            }
        }

        // Keep only blocks that contain the cursor; return the innermost (latest blockStart)
        const containing = candidates.filter(c => offset > c.blockStart && offset < c.blockEnd);
        if (containing.length === 0) {
            return null;
        }

        return containing.reduce((a, b) => (a.blockStart > b.blockStart ? a : b)).controllerClass;
    }

    /**
     * Given the index of `{`, walks forward and returns the index of its matching `}`.
     * Returns -1 if no match found (malformed/incomplete file).
     */
    private findMatchingBrace(text: string, openPos: number): number {
        let depth = 1;
        for (let i = openPos + 1; i < text.length; i++) {
            if (text[i] === '{') {
                depth++;
            } else if (text[i] === '}') {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    /**
     * Finds the PHP file for the given controller class (by short name) and
     * returns a Location pointing at the method definition line.
     */
    private async resolveControllerMethod(controllerClass: string, methodName: string): Promise<vscode.Location | null> {
        // Handle FQN: App\Http\Controllers\FooController → FooController
        const shortName = controllerClass.split('\\').pop() ?? controllerClass;

        const files = await vscode.workspace.findFiles(
            `**/${shortName}.php`,
            '{**/vendor/**,**/node_modules/**}',
            10
        );

        for (const fileUri of files) {
            const content = fs.readFileSync(fileUri.fsPath, 'utf8');

            // Confirm this file actually defines the class (not just references it)
            if (!new RegExp(`class\\s+${shortName}\\b`).test(content)) {
                continue;
            }

            const lines = content.split('\n');
            for (let lineNum = 0; lineNum < lines.length; lineNum++) {
                if (new RegExp(`function\\s+${methodName}\\s*\\(`).test(lines[lineNum])) {
                    return new vscode.Location(fileUri, new vscode.Position(lineNum, 0));
                }
            }
        }

        return null;
    }
}
