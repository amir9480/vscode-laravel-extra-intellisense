'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import Helpers from './helpers';


export default class EnvProvider implements vscode.CompletionItemProvider {
    private enviroments: { [key: string]: string } = {};
    private timer: any = null;
    private watcher: any = null;

    constructor () {
        this.loadEnv();
        if (vscode.workspace.workspaceFolders !== undefined) {
            this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], ".env"));
            this.watcher.onDidChange((e: vscode.Uri) => this.onChange());
            this.watcher.onDidCreate((e: vscode.Uri) => this.onChange());
            this.watcher.onDidDelete((e: vscode.Uri) => this.onChange());
        }
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var out:Array<vscode.CompletionItem> = [];
        var func = Helpers.parseDocumentFunction(document, position);
        if (func === null) {
            return out;
        }

        if (func && (Helpers.tags.env.functions.some((fn:string) => func.function.includes(fn)))) {
            for (var i in this.enviroments) {
                var completeItem = new vscode.CompletionItem(i, vscode.CompletionItemKind.Constant);
                completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                completeItem.detail = this.enviroments[i];
                out.push(completeItem);
            }
        }
        return out;
    }

    onChange() {
        var self = this;
        if (self.timer !== null) {
            clearTimeout(self.timer);
        }
        self.timer = setTimeout(function () {
            self.loadEnv();
            self.timer = null;
        }, 5000);
    }

    loadEnv() {
        try {
            if (fs.existsSync(Helpers.projectPath(".env"))) {
                let enviroments: any = {};
                let envs = fs.readFileSync(Helpers.projectPath('.env'), 'utf8').split("\n");
                for (let i in envs) {
                    let envKeyValue = envs[i].split('=');
                    if (envKeyValue.length == 2) {
                        enviroments[envKeyValue[0]] = envKeyValue[1];
                    }
                }
                this.enviroments = enviroments;
            }
        } catch (exception) {
            console.error(exception);
        }
    }
}
