'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import Helpers from './helpers';


export default class MixProvider implements vscode.CompletionItemProvider {
    private mixes: Array<any> = [];

    constructor () {
        this.loadMix();
        setInterval(() => this.loadMix(), 60000);
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var out:Array<vscode.CompletionItem> = [];
        var func = Helpers.parseDocumentFunction(document, position);
        if (func === null) {
            return out;
        }

        if (func && (Helpers.tags.mix.functions.some((fn:string) => func.function.includes(fn)))) {
            for (var i in this.mixes) {
                var completeItem = new vscode.CompletionItem(this.mixes[i], vscode.CompletionItemKind.Value);
                completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                out.push(completeItem);
            }
        }
        return out;
    }

    loadMix() {
        try {
            if (fs.existsSync(Helpers.projectPath("public/mix-manifest.json"))) {
                var mixes = JSON.parse(fs.readFileSync(Helpers.projectPath('public/mix-manifest.json'), 'utf8'));
                this.mixes = Object.keys(mixes).map((mixFile) => mixFile.replace(/^\//g, ''));
            }
        } catch (exception) {
            console.error(exception);
        }
    }
}
