'use strict';

import * as vscode from 'vscode';
import Helpers from './helpers';


export default class RouteProvider implements vscode.CompletionItemProvider {
    private timer: any = null;
    private routes: Array<any> = [];

    constructor () {
        var self = this;
        self.loadRoutes();
        vscode.workspace.onDidSaveTextDocument(function(event: vscode.TextDocument) {
            if (self.timer === null && event.fileName.toLowerCase().includes("route") && event.fileName.toLowerCase().includes("php")) {
                self.timer = setTimeout(function () {
                    self.loadRoutes();
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

        if (func && ((func.class && Helpers.tags.route.classes.some((cls:string) => func.class.includes(cls))) || Helpers.tags.route.functions.some((fn:string) => func.function.includes(fn)))) {
            if (func.paramIndex == 1) {
                // route parameters autocomplete
                for (var i in this.routes) {
                    if (this.routes[i].name == func.parameters[0]) {
                        for (var j in this.routes[i].parameters) {
                            var compeleteItem = new vscode.CompletionItem(this.routes[i].parameters[j], vscode.CompletionItemKind.Variable);
                            compeleteItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                            out.push(compeleteItem);
                        }
                        return out;
                    }
                }
            }

            // route name autocomplete
            for (var i in this.routes) {
                if (typeof this.routes[i].name === "string" && this.routes[i].name.length > 0) {
                    var compeleteItem2 = new vscode.CompletionItem(this.routes[i].name, vscode.CompletionItemKind.Enum);
                    compeleteItem2.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                    compeleteItem2.detail = this.routes[i].action +
                                            "\n\n" +
                                            this.routes[i].method +
                                            ":" +
                                            this.routes[i].uri;
                    out.push(compeleteItem2);
                }
            }
        }
        return out;
    }

    loadRoutes() {
        if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
            try {
                var routes = JSON.parse(Helpers.runLaravel("echo json_encode(array_map(function ($route) {return ['method' => implode('|', array_filter($route->methods(), function ($method) {return $method != 'HEAD';})), 'uri' => $route->uri(), 'name' => $route->getName(), 'action' => str_replace('App\\\\Http\\\\Controllers\\\\', '', $route->getActionName()), 'parameters' => $route->parameterNames()];}, app('router')->getRoutes()->getRoutes()));"));
                routes = routes.filter((route: any) => route != 'null');
                this.routes = routes;
            } catch (exception) {
                console.error(exception);
                setTimeout(() => this.loadRoutes(), 20000);
            }
        }
    }
}

