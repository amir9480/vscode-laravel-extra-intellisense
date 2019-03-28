'use strict';

import * as vscode from 'vscode';
import Helpers from './helpers';


export default class RouteProvider {
    private routes: Array<any> = [];

    constructor () {
        this.loadRoutes();
    }

    getItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var pos = document.offsetAt(position);
        var func = Helpers.parseFunction(document.getText(), pos);
        var out:Array<vscode.CompletionItem> = [];
        if (func &&
            (context.triggerCharacter == '"' || context.triggerCharacter == "'" || func.parameters.length > 0) &&
            ((func.class && func.class == 'Route') || func.function.toLowerCase() == 'route')
        ) {
            if (func.paramIndex == 1) {
                // route parameters autocomplete
                for (var i in this.routes) {
                    if (this.routes[i].name == func.parameters[0]) {
                        for (var j in this.routes[i].parameters) {
                            var compeleteItem = new vscode.CompletionItem(this.routes[i].parameters[j], vscode.CompletionItemKind.Variable);
                            out.push(compeleteItem);
                        }
                        return out;
                    }
                }
            }

            // route name autocomplete
            for (var i in this.routes) {
                var compeleteItem2 = new vscode.CompletionItem(this.routes[i].name, vscode.CompletionItemKind.Enum);
                compeleteItem2.detail = this.routes[i].action +
                                        "\n\n" +
                                        this.routes[i].method +
                                        ":" +
                                        this.routes[i].uri;
                out.push(compeleteItem2);
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
            } catch (e) {
                console.error(e);
                setTimeout(() => this.loadRoutes(), 20000);
            }
        }
    }
}

