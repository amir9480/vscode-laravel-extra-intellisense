'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from './helpers';

export default class ViewProvider implements vscode.CompletionItemProvider {
    private timer: any = null;
    private views: {[key:string]: string} = {};
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
            if (func.paramIndex == 0) {
                for (var i in this.views) {
                    var compeleteItem = new vscode.CompletionItem(i, vscode.CompletionItemKind.Constant);
                    compeleteItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                    out.push(compeleteItem);
                }
            } else if (typeof this.views[func.parameters[0]] !== 'undefined') {
                var viewContent = fs.readFileSync(this.views[func.parameters[0]], 'utf8');
                var variableRegex = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
                var r:any = [];
                var variableNames = [];
                while (r = variableRegex.exec(viewContent)) {
                    variableNames.push(r[1]);
                }
                variableNames = variableNames.filter((v, i, a) => a.indexOf(v) === i);
                for (var i in variableNames) {
                    var compeleteItem = new vscode.CompletionItem(variableNames[i], vscode.CompletionItemKind.Constant);
                    compeleteItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                    out.push(compeleteItem);
                }
            }
        } else if (func && func.function == '@section') {
            var extendsRegex = /@extends\s*\([\'\"](.+)[\'\"]\)/g;
            var regexResult:any = [];
            if (regexResult = extendsRegex.exec(document.getText())) {
                if (typeof this.views[regexResult[1]] !== 'undefined') {
                    var parentContent = fs.readFileSync(this.views[regexResult[1]], 'utf8');
                    var yieldRegex = /@yield\s*\([\'\"]([A-Za-z0-9_\-\.]+)[\'\"](,.*)?\)/g;
                    var yeildNames = [];
                    while (regexResult = yieldRegex.exec(parentContent)) {
                        yeildNames.push(regexResult[1]);
                    }
                    for (var i in yeildNames) {
                        var compeleteItem = new vscode.CompletionItem(yeildNames[i], vscode.CompletionItemKind.Constant);
                        compeleteItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                        out.push(compeleteItem);
                    }
                }
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
            this.views = {};
            for (var i in viewPaths) {
                this.views = Object.assign(this.views, this.getViews(viewPaths[i]));
            }
            for (var i in viewNamespaces) {
                for (var j in viewNamespaces[i]) {
                    var viewsInNamespace = this.getViews(viewNamespaces[i][j]);
                    for (var k in viewsInNamespace) {
                        this.views[i + "::" + k] = viewNamespaces[k];
                    }
                }
            }
        } catch (exception) {
            console.error(exception);
        }
    }

    getViews(path: string): {[key:string]: string} {
        if (path.substr(-1) != '/' && path.substr(-1) != '\\') {
            path += "/";
        }
        var out: {[key:string]: string} = {};
        var self = this;
        if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
            fs.readdirSync(path).forEach(function (file) {
                if (fs.lstatSync(path+file).isDirectory()) {
                    var viewsInDirectory = self.getViews(path + file + "/");
                    for (var i in viewsInDirectory) {
                        out[file + "." + i] = viewsInDirectory[i];
                    }
                } else {
                    if (file.includes("blade.php")) {
                        out[file.replace(".blade.php", "")] = path + file;
                    }
                }
            });
        }
        return out;
    }
}
