'use strict';

import * as vscode from 'vscode';
import Helpers from './helpers';


export default class MiddlewareProvider implements vscode.CompletionItemProvider {
    private timer: any = null;
    private middlewares: Array<any> = [];
    private watcher: any = null;


    constructor () {
        var self = this;
        self.loadMiddlewares();
        if (vscode.workspace.workspaceFolders !== undefined) {
            this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], "app/Http/Kernel.php"));
            this.watcher.onDidChange((e: vscode.Uri) => this.onChange());
        }
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var out:Array<vscode.CompletionItem> = [];
        var func = Helpers.parseDocumentFunction(document, position);
        if (func === null) {
            return out;
        }

        if (func.function.includes("middleware")) {
            for (let i in this.middlewares) {
                var compeleteItem = new vscode.CompletionItem(i, vscode.CompletionItemKind.Enum);
                compeleteItem.detail = this.middlewares[i];
                compeleteItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                out.push(compeleteItem);
            }
        }
        return out;
    }

    onChange() {
        var self = this;
        if (self.timer !== null) {
            clearTimeout(self.timer);
        }
        self.timer = setTimeout(function () {
            self.loadMiddlewares();
            self.timer = null;
        }, 5000);
    }

    loadMiddlewares() {
        if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
            try {
                var self = this;
                // array_map(function ($rh) {return $rh->getName();}, array_filter((new ReflectionMethod('App\Http\Middleware\Authenticate', 'handle'))->getParameters(), function ($rc) {return $rc->getName() != 'request' && $rc->getName() != 'next';}))
                Helpers.runLaravel(
                        "$middlewares = array_merge(app('Illuminate\\Contracts\\Http\\Kernel')->getMiddlewareGroups(), app('Illuminate\\Contracts\\Http\\Kernel')->getRouteMiddleware());" +
                        "foreach ($middlewares as $key => &$value) {" +
                        "    if (is_array($value)) {" +
                        "        $value = null;" +
                        "    } else {" +
                        "        $parameters = array_filter((new ReflectionMethod($value, 'handle'))->getParameters(), function ($rc) {" +
                        "            return $rc->getName() != 'request' && $rc->getName() != 'next';" +
                        "        });" +
                        "        $value = implode(',', array_map(function ($rh) {" +
                        "            return $rh->getName() . ($rh->isVariadic() ? '...' : '');" +
                        "        }, $parameters));" +
                        "        if (empty($value)) {" +
                        "            $value = null;" +
                        "        }" +
                        "    };" +
                        "}" +
                        "echo json_encode($middlewares);",
                        "Middlewares"
                    )
                    .then(function (result) {
                        let middlewares = JSON.parse(result);
                        self.middlewares = middlewares;
                    });
            } catch (exception) {
                console.error(exception);
            }
        }
    }
}

