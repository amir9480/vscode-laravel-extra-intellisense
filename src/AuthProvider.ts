'use strict';

import * as vscode from 'vscode';
import Helpers from './helpers';


export default class AuthProvider implements vscode.CompletionItemProvider {
    private abilities: Array<any> = [];
    private models: Array<any> = [];

    constructor () {
        var self = this;
        self.loadAbilities();
        setInterval(function () {
            self.loadAbilities();
        }, 60000);
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var out:Array<vscode.CompletionItem> = [];
        var func = Helpers.parseDocumentFunction(document, position);
        if (func === null) {
            return out;
        }

        if (func && ((func.class && Helpers.tags.auth.classes.some((cls:string) => func.class.includes(cls))) || Helpers.tags.auth.functions.some((fn:string) => func.function.includes(fn)))) {
            if (func.paramIndex === 1) {
                for (let i in this.models) {
                    let completeItem = new vscode.CompletionItem(this.models[i].replace(/\\/, '\\\\'), vscode.CompletionItemKind.Value);
                    completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                    out.push(completeItem);
                }
            } else {
                for (let i in this.abilities) {
                    let completeItem = new vscode.CompletionItem(this.abilities[i], vscode.CompletionItemKind.Value);
                    completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                    out.push(completeItem);
                }
            }
        }
        return out;
    }

    loadAbilities() {
        try {
            var self = this;
            Helpers.getModels().then((models) => self.models = models);
            Helpers.runLaravel(`
                echo json_encode(
                    array_merge(
                        array_keys(Illuminate\\Support\\Facades\\Gate::abilities()),
                        array_values(
                            array_filter(
                                array_unique(
                                    Illuminate\\Support\\Arr::flatten(
                                        array_map(
                                            function ($val, $key) {
                                                return array_map(
                                                    function ($rm) {
                                                        return $rm->getName();
                                                    },
                                                    (new ReflectionClass($val))->getMethods()
                                                );
                                            },
                                            Illuminate\\Support\\Facades\\Gate::policies(),
                                            array_keys(Illuminate\\Support\\Facades\\Gate::policies())
                                        )
                                    )
                                ),
                                function ($an) {return !in_array($an, ['allow', 'deny']);}
                            )
                        )
                    )
                );
               `
                ).then(function (result) {
                    var abilities = JSON.parse(result);
                    self.abilities = abilities;
                });
        } catch (exception) {
            console.error(exception);
        }
    }
}
