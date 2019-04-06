'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from './helpers';


export default class TranslationProvider implements vscode.CompletionItemProvider {
    private timer: any = null;
    private translations: Array<any> = [];

    constructor () {
        var self = this;
        setTimeout(() => self.loadTranslations(), 15000);
        vscode.workspace.onDidSaveTextDocument(function(event: vscode.TextDocument) {
            if (self.timer === null && (event.fileName.toLowerCase().includes("lang") || event.fileName.toLowerCase().includes("trans") || event.fileName.toLowerCase().includes("localization"))) {
                self.timer = setTimeout(function () {
                    self.loadTranslations();
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

        if (func && ((func.class && Helpers.tags.trans.classes.some((cls:string) => func.class.includes(cls))) || Helpers.tags.trans.functions.some((fn:string) => func.function.includes(fn)))) {
            if (func.paramIndex == 1) {
                // parameters autocomplete
                var paramRegex = /\:([A-Za-z0-9_]+)/g;
                var match = null;

                for (var i in this.translations) {
                    if (this.translations[i].name == func.parameters[0]) {
                        while ((match = paramRegex.exec(this.translations[i].value)) !== null) {
                            var compeleteItem = new vscode.CompletionItem(match[1], vscode.CompletionItemKind.Variable);
                            compeleteItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                            out.push(compeleteItem);
                        }
                        return out;
                    }
                }
                return out;
            }

            for (var i in this.translations) {
                var completeItem = new vscode.CompletionItem(this.translations[i].name, vscode.CompletionItemKind.Value);
                completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                if (this.translations[i].value) {
                    completeItem.detail = this.translations[i].value.toString();
                }
                out.push(completeItem);
            }
        }
        return out;
    }

    loadTranslations () {
        var translations:Array<any> = [];
        try {
            var tranlationNamespaces = JSON.parse(Helpers.runLaravel("echo json_encode(app('translator')->getLoader()->namespaces());"));
            for (var i in tranlationNamespaces) {
                tranlationNamespaces[i + '::'] = tranlationNamespaces[i];
                delete tranlationNamespaces[i];
            }
            tranlationNamespaces[''] = Helpers.projectPath('resources/lang');
            var translationGroups:any = [];
            for (var i in tranlationNamespaces) {
                if (fs.existsSync(tranlationNamespaces[i]) && fs.lstatSync(tranlationNamespaces[i]).isDirectory()) {
                    fs.readdirSync(tranlationNamespaces[i]).forEach(function (langDir) {
                        var path:any = tranlationNamespaces[i] + '/' + langDir;
                        if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
                            fs.readdirSync(path).forEach(function (file) {
                                if (fs.lstatSync(path + '/' + file).isFile()) {
                                    translationGroups.push(i + file.replace(/\.php/, ''));
                                }
                            });
                        }
                    });
                }
            }
            translationGroups = translationGroups.filter(function(item:any, index:any, array:any){ return array.indexOf(item) === index; });
            translationGroups = JSON.parse(Helpers.runLaravel("echo json_encode([" + translationGroups.map((transGroup: string) => "'" + transGroup + "' => __('" + transGroup + "')").join(",") + "]);"))
            for(var i in translationGroups) {
                translations = translations.concat(this.getTranslations(translationGroups[i], i));
            }
            this.translations = translations;
        } catch (exception) {
            console.error(exception);
            setTimeout(() => this.loadTranslations(), 20000);
        }
    }

    getTranslations(translations: Array<any>, prefix: string): Array<any> {
        var out: Array<any> = [];
        for (var i in translations) {
            if (translations[i] instanceof Object) {
                out.push({name: prefix + '.' + i, value: "array(...)"});
                out = out.concat(this.getTranslations(translations[i], prefix + '.' + i));
            } else {
                out.push({name: prefix + '.' + i, value: translations[i]});
            }
        }
        return out;
    }
}
