'use strict';

import * as vscode from 'vscode';
import * as cp from "child_process";
import Helpers from './helpers';


export default class RouteProvider {
    private provider: any;
    private routes: Array<any> = [];

    constructor () {
        this.loadRoutes();
        var self = this;
        this.provider = vscode.languages.registerCompletionItemProvider(
            [
                { scheme: 'file', language: 'php' },
                { scheme: 'file', language: 'blade' }
            ],
            {
                provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

                    let linePrefix = document.lineAt(position).text.substr(0, position.character).toLowerCase().trim();
                    if (! linePrefix.includes("route")) {
                        return undefined;
                    }

                    var out:Array<vscode.CompletionItem> = [];

                    if (linePrefix.substr(linePrefix.indexOf("route") + 5).includes(",")) {
                        // route parameters autocomplete
                        var currentRoute = (/\(('|")([A-Za-z0-9_-]+)('|")/g).exec(linePrefix);
                        if (currentRoute != null && currentRoute[2].length > 0) {
                            for (var i in self.routes) {
                                if (self.routes[i].route == currentRoute[2]) {
                                    var routeParamRegex = (/\{([A-Za-z0-9_]+)(\?|)\}/g);
                                    var currentRouteParameters:any = routeParamRegex.exec(self.routes[i].uri);
                                    while (currentRouteParameters != null) {
                                        if (currentRouteParameters != null && currentRouteParameters[1].length > 0) {
                                            var compeleteItem = new vscode.CompletionItem(currentRouteParameters[1], vscode.CompletionItemKind.Variable);
                                            compeleteItem.detail = currentRouteParameters[2] == "?" ? "Optional" : "Required";
                                            out.push(compeleteItem);
                                        }
                                        currentRouteParameters = routeParamRegex.exec(self.routes[i].uri);
                                    }
                                    return out;
                                }
                            }
                        }
                    }

                    // route name autocomplete
                    for (var i in self.routes) {
                        var compeleteItem2 = new vscode.CompletionItem(self.routes[i].route, vscode.CompletionItemKind.Enum);
                        compeleteItem2.detail = self.routes[i].action.replace(/App\\Http\\Controllers\\/g, '') +
                                                "\n\n" +
                                                self.routes[i].method.replace(/\|HEAD|HEAD\|/g, '') + ":" + self.routes[i].uri;
                        out.push(compeleteItem2);
                    }
                    return out;
                }
            },
            '"',
            "'"
        );
    }

    loadRoutes() {
        if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
            try {
                let routeList = cp.execSync("php "+Helpers.projectPath("artisan")+" route:list").toString();

                var lines = routeList.split("\n").filter(function (line) {
                    return line.length > 0 && line[0] === '|';
                }).splice(1);

                this.routes = [];
                for (var i in lines) {
                    var line = lines[i].split(" | ");
                    if (line.length >= 3) {
                        for (i in line) {
                            line[i] = line[i].trim();
                        }
                        if (line[3].length > 0) {
                            this.routes.push({method: line[1], uri: line[2], route: line[3], action: line[4]});
                        }
                    }
                }
                // make results unique
                this.routes = this.routes.filter((route, index, array) => array.map((r) => r.route).indexOf(route.route) === index);
            } catch (e) {
                console.error(e);
            }
        }
    }

    getProvider() {
        return this.provider;
    }
}

