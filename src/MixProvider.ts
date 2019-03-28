'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import Helpers from './helpers';


export default class MixProvider {
    mixes: Array<any> = [];

    constructor () {
        this.loadMix();
        setInterval(() => this.loadMix(), 60000);
    }

    getItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var pos = document.offsetAt(position);
        var func = Helpers.parseFunction(document.getText(), pos);
        var out:Array<vscode.CompletionItem> = [];
        if (func &&
            (context.triggerCharacter == '"' || context.triggerCharacter == "'" || func.parameters.length > 0) &&
            (func.function.toLowerCase() == 'mix')
        ) {
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
            if (fs.existsSync(Helpers.projectPath("public/mix-manifest.json")) && fs.existsSync(Helpers.projectPath("public/mix-manifest.json"))) {
                var mixes = JSON.parse(fs.readFileSync(Helpers.projectPath('public/mix-manifest.json'), 'utf8'));
                this.mixes = Object.keys(mixes).map((mixFile) => mixFile.replace(/^\//g, ''));
            }
        } catch (exception) {
            console.error(exception);
        }
    }
}
