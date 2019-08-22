'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from './helpers';


export default class ViewProvider implements vscode.CompletionItemProvider {
    private timer: any = null;
    private views: Array<string> = [];
    private watcher: any = null;

    constructor () {
        var self = this;
        self.loadViews();

        if (vscode.workspace.workspaceFolders !== undefined) {
            this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], "{,**/}{view,views}/{*,**/*}"));
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

        if (func && ((func.class && Helpers.tags.view.classes.some((cls:string) => func.class.includes(cls))) || Helpers.tags.view.functions.some((fn:string) => func.function.includes(fn)))) {
            for (var i in this.views) {
                var compeleteItem = new vscode.CompletionItem(this.views[i], vscode.CompletionItemKind.Constant);
                compeleteItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                out.push(compeleteItem);
            }
        }
        return out;
    }

    onChange() {
        var self = this;
        if (self.timer) {
            clearTimeout(self.timer);
        }
        self.timer = setTimeout(function () {
            self.loadViews();
            self.timer = null;
        }, 2000);
    }

    loadViews () {
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
            this.onChange();
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
