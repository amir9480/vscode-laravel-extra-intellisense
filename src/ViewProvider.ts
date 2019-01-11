'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from './helpers';


export default class ViewProvider {
    private provider: any;
    views: Array<string> = [];

    constructor () {
        this.loadViews();
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
                        linePrefix.includes("view") ||
                        linePrefix.includes("->links") ||
                        linePrefix.includes("@extends") ||
                        linePrefix.includes("@component") ||
                        linePrefix.includes("@include") ||
                        linePrefix.includes("@each")
                    )) {
                        return undefined;
                    }

                    var out:Array<vscode.CompletionItem> = [];

                    for (var i in self.views) {
                        out.push(new vscode.CompletionItem(self.views[i], vscode.CompletionItemKind.File));
                    }
                    return out;
                }
            },
            '"',
            "'"
        );
    }

    loadViews (root?: string) {
        if (fs.existsSync(Helpers.projectPath("vendor/autoload.php")) && fs.existsSync(Helpers.projectPath("bootstrap/app.php"))) {
            try {
                var code = "echo json_encode(app('view')->getFinder()->getHints());";
                var viewPaths = JSON.parse(Helpers.runPhp(code.replace("getHints", "getPaths")));
                var viewNamespaces = JSON.parse(Helpers.runPhp(code));
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

    getProvider () {
        return this.provider;
    }
}
