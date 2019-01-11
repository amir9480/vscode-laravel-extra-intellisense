'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from './helpers';


export default class ConfigProvider {
    private provider: any;
    configs: Array<any> = [];

    constructor () {
        this.loadConfigs();
        var self = this;
        this.provider = vscode.languages.registerCompletionItemProvider(
            [
                { scheme: 'file', language: 'php' },
                { scheme: 'file', language: 'blade' }
            ],
            {
                provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

                    let linePrefix = document.lineAt(position).text.substr(0, position.character).toLowerCase().trim();
                    if (!(
                        linePrefix.includes("config")
                    )) {
                        return undefined;
                    }

                    var out:Array<vscode.CompletionItem> = [];

                    for (var i in self.configs) {
                        var completeItem = new vscode.CompletionItem(self.configs[i].name, vscode.CompletionItemKind.File);
                        if (self.configs[i].value instanceof String) {
                            completeItem.detail = self.configs[i].value.substr(25);
                        }
                        out.push(completeItem);
                    }
                    return out;
                }
            },
            '"',
            "'"
        );
    }

    loadConfigs (root?: string) {
        if (fs.existsSync(Helpers.projectPath("vendor/autoload.php")) && fs.existsSync(Helpers.projectPath("bootstrap/app.php"))) {
            try {
                var configs = JSON.parse(Helpers.runPhp("echo json_encode(config()->all());"));
                this.configs = this.getConfigs(configs);
                console.log(this.configs);

            } catch (exception) {
                console.error(exception);
            }
        }
    }

    getConfigs(conf: any): Array<any> {
        var out: Array<any> = [];
        for (var i in conf) {
            if (conf[i] instanceof Array) {
                out.push({name: i, value: conf[i]});
            } else if (conf[i] instanceof Object) {
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

    getProvider () {
        return this.provider;
    }
}
