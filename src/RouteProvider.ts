'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import Helpers from './helpers';


export default class RouteProvider implements vscode.CompletionItemProvider {
    private timer: any = null;
    private routes: Array<any> = [];
    private controllers: Array<any> = [];

    constructor () {
        var self = this;
        self.loadRoutes();
        self.loadControllers();
        vscode.workspace.onDidSaveTextDocument(function(event: vscode.TextDocument) {
            if (event.fileName.toLowerCase().includes("php") &&
                (event.fileName.toLowerCase().includes("route") || event.fileName.toLowerCase().includes("controllers"))
            ) {
                if (self.timer != null) {
                    clearTimeout(self.timer);
                }
                self.timer = setTimeout(function () {
                    self.loadRoutes();
                    self.loadControllers();
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

            if (func.class == 'Route' && ['get', 'post', 'put', 'patch', 'delete', 'options', 'any', 'match'].some((fc:string) => func.function.includes(fc))) {
                if ((func.function == 'match' && func.paramIndex == 2) || (func.function != 'match' && func.paramIndex == 1)) {
                    // Route action autocomplete.
                    for (var i in this.controllers) {
                        if (typeof this.controllers[i] === "string" && this.controllers[i].length > 0) {
                            var compeleteItem2 = new vscode.CompletionItem(this.controllers[i], vscode.CompletionItemKind.Enum);
                            compeleteItem2.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                            out.push(compeleteItem2);
                        }
                    }
                }
            } else {
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

                // Route name autocomplete
                for (var i in this.routes) {
                    if (typeof this.routes[i].name === "string" && this.routes[i].name.length > 0) {
                        var compeleteItem3 = new vscode.CompletionItem(this.routes[i].name, vscode.CompletionItemKind.Enum);
                        compeleteItem3.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                        compeleteItem3.detail = this.routes[i].action +
                                                "\n\n" +
                                                this.routes[i].method +
                                                ":" +
                                                this.routes[i].uri;
                        out.push(compeleteItem3);
                    }
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

    loadControllers() {
        try {
            this.controllers = this.getControllers(Helpers.projectPath("app/Http/Controllers")).map((contoller) => contoller.replace(/@__invoke/, ''));
        } catch (exception) {
            console.error(exception);
            setTimeout(() => this.loadControllers(), 20000);
        }
    }

    getControllers(path: string): Array<string> {
        var self = this;
        var controllers: Array<string> = [];
        if (path.substr(-1) != '/' && path.substr(-1) != '\\') {
            path += "/";
        }
        if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
            fs.readdirSync(path).forEach(function (file) {
                if (fs.lstatSync(path+file).isDirectory()) {
                    controllers = controllers.concat(self.getControllers(path + file + "/"));
                } else {
                    if (file.includes(".php")) {
                        var controllerContent = fs.readFileSync(path + file, 'utf8');
                        var match = ((/class\s+([A-Za-z0-9_]+)\s+extends\s+.+/g).exec(controllerContent));
                        var matchNamespace = ((/namespace .+\\Http\\Controllers\\([A-Za-z0-9_]*)/g).exec(controllerContent));
                        var functionRegex = /public\s+function\s+([A-Za-z0-9_]+)\(.*\)/g;
                        if (match != null && matchNamespace) {
                            var className = match[1];
                            var namespace = matchNamespace[1];
                            while ((match = functionRegex.exec(controllerContent)) != null && match[1] != '__construct') {
                                controllers.push(namespace + '\\' + className + '@' + match[1]);
                            }
                        }
                    }
                }
            });
        }
        return controllers;
    }
}

