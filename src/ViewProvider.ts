'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from './helpers';


export default class ViewProvider {
    views: Array<string> = [];

    constructor () {
        this.loadViews();
    }

    getItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var pos = document.offsetAt(position);
        var func = Helpers.parseFunction(document.getText(), pos);
        var out:Array<vscode.CompletionItem> = [];
        if (func &&
            (context.triggerCharacter == '"' || context.triggerCharacter == "'" || func.parameters.length > 0) &&
            ((func.class && func.class == 'View') || ['view', 'links', '@extends', '@component', '@include', '@each'].some(fn => func.function.includes(fn)))
        ) {
            for (var i in this.views) {
                out.push(new vscode.CompletionItem(this.views[i], vscode.CompletionItemKind.Constant));
            }
        }
        return out;
    }

    loadViews (root?: string) {
        if (fs.existsSync(Helpers.projectPath("vendor/autoload.php")) && fs.existsSync(Helpers.projectPath("bootstrap/app.php"))) {
            try {
                var code = "echo json_encode(app('view')->getFinder()->getHints());";
                var viewPaths = JSON.parse(Helpers.runLaravel(code.replace("getHints", "getPaths")));
                var viewNamespaces = JSON.parse(Helpers.runLaravel(code));
                this.views = [];
                for (var i in viewPaths) {
                    this.views = this.views.concat(this.getViews(viewPaths[i]));
                }
                for (var i in viewNamespaces) {
                    for (var j in viewNamespaces[i]) {
                        this.views = this.views.concat(this.getViews(viewNamespaces[i][j]).map((view) => i + "::" + view));
                    }
                }
            } catch (exception) {
                console.error(exception);
                this.views = this.getViews(Helpers.projectPath("resources/views"));
            }
        } else {
            this.views = this.getViews(Helpers.projectPath("resources/views"));
        }
    }

    getViews(path: string): Array<string> {
        if (path.substr(-1) != '/' && path.substr(-1) != '\\') {
            path += "/";
        }
        var out: Array<string> = [];
        var self = this;
        if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
            fs.readdirSync(path).forEach(function (file) {
                if (fs.lstatSync(path+file).isDirectory()) {
                    out = out.concat(self.getViews(path + file + "/").map((fn) => file + "." + fn));
                } else {
                    if (file.includes("blade.php")) {
                        out.push(file.replace(".blade.php", ""));
                    }
                }
            });
        }
        return out;
    }
}
