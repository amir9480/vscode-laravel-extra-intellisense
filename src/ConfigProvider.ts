'use strict';

import * as vscode from 'vscode';
import Helpers from './helpers';


export default class ConfigProvider implements vscode.CompletionItemProvider {
    private timer: any = null;
    private configs: Array<any> = [];

    constructor () {
        var self = this;
        self.loadConfigs();
        vscode.workspace.onDidSaveTextDocument(function(event: vscode.TextDocument) {
            if (event.fileName.toLowerCase().includes("config") && event.fileName.toLowerCase().includes("php")) {
                if (self.timer != null) {
                    clearTimeout(self.timer);
                }
                self.timer = setTimeout(function () {
                    self.loadConfigs();
                    self.timer = null;
                }, 2000);
            }
        });
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var out:Array<vscode.CompletionItem> = [];
        var func = Helpers.parseDocumentFunction(document, position);
        if (func === null) {
            return out;
        }

        if (func && ((func.class && Helpers.tags.config.classes.some((cls:string) => func.class.includes(cls))) || Helpers.tags.config.functions.some((fn:string) => func.function.includes(fn)))) {
            for (var i in this.configs) {
                var completeItem = new vscode.CompletionItem(this.configs[i].name, vscode.CompletionItemKind.Value);
                completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                if (this.configs[i].value) {
                    completeItem.detail = this.configs[i].value.toString();
                }
                out.push(completeItem);
            }
        }
        return out;
    }

    loadConfigs () {
        try {
            var configs = JSON.parse(Helpers.runLaravel("echo json_encode(config()->all());"));
            this.configs = this.getConfigs(configs);
        } catch (exception) {
            console.error(exception);
            setTimeout(() => this.loadConfigs(), 20000);
        }
    }

    getConfigs(conf: any): Array<any> {
        var out: Array<any> = [];
        for (var i in conf) {
            if (conf[i] instanceof Array) {
                out.push({name: i, value: 'array(...)'});
            } else if (conf[i] instanceof Object) {
                out.push({name: i, value: 'array(...)'});
                out = out.concat(this.getConfigs(conf[i]).map(function (c) {
                    c.name = i + "." + c.name;
                    return c;
                }));
            } else {
                out.push({name: i, value: conf[i]});
            }
        }
        return out;
    }
}
