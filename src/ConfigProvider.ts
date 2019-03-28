'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from './helpers';


export default class ConfigProvider {
    private provider: any;
    configs: Array<any> = [];

    constructor () {
        this.loadConfigs();
    }

    getItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var pos = document.offsetAt(position);
        var func = Helpers.parseFunction(document.getText(), pos);
        var out:Array<vscode.CompletionItem> = [];
        if (func &&
            (context.triggerCharacter == '"' || context.triggerCharacter == "'" || func.parameters.length > 0) &&
            ((func.class && func.class == 'Config') || func.function.toLowerCase() == 'config')
        ) {
            for (var i in this.configs) {
                var completeItem = new vscode.CompletionItem(this.configs[i].name, vscode.CompletionItemKind.Value);
                if (this.configs[i].value) {
                    completeItem.detail = this.configs[i].value.toString();
                }
                out.push(completeItem);
            }
        }
        return out;
    }

    loadConfigs (root?: string) {
        if (fs.existsSync(Helpers.projectPath("vendor/autoload.php")) && fs.existsSync(Helpers.projectPath("bootstrap/app.php"))) {
            try {
                var configs = JSON.parse(Helpers.runLaravel("echo json_encode(config()->all());"));
                this.configs = this.getConfigs(configs);
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

    getProvider () {
        return this.provider;
    }
}
