'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import Helpers from './helpers';

export default class ViteProvider implements vscode.CompletionItemProvider {
    private viteAssets: Array<string> = [];

    constructor() {
        this.loadViteManifest();
        setInterval(() => this.loadViteManifest(), 60000);
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Array<vscode.CompletionItem> {
        const completions: Array<vscode.CompletionItem> = [];
        const func = Helpers.parseDocumentFunction(document, position);

        if (func === null) {
            return completions;
        }

        if (func && (Helpers.tags.vite.functions.some((fn: string) => func.function.includes(fn)))) {
            for (const asset of this.viteAssets) {
                const item = new vscode.CompletionItem(asset, vscode.CompletionItemKind.Value);
                item.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                completions.push(item);
            }
        }

        return completions;
    }

    private loadViteManifest() {
        try {
            const manifestPath = Helpers.projectPath('public/build/manifest.json');
            if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                this.viteAssets = Object.keys(manifest);
            }
        } catch (exception) {
            console.error(exception);
        }
    }
}