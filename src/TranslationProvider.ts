'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from './helpers';


export default class TranslationProvider {
    translations: Array<any> = [];

    constructor () {
        this.loadTranslations();
    }

    getItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var pos = document.offsetAt(position);
        var func = Helpers.parseFunction(document.getText(), pos);
        var out:Array<vscode.CompletionItem> = [];
        if (func &&
            (context.triggerCharacter == '"' || context.triggerCharacter == "'" || func.parameters.length > 0) &&
            ((func.class && func.class == 'Lang') || ['__', 'trans', '@lang'].some(fn => func.function.includes(fn)))
        ) {
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
            translations = [];
            var self = this;
            for (var i in tranlationNamespaces) {
                if (fs.existsSync(tranlationNamespaces[i]) && fs.lstatSync(tranlationNamespaces[i]).isDirectory()) {
                    fs.readdirSync(tranlationNamespaces[i]).forEach(function (langDir) {
                        var path:any = tranlationNamespaces[i] + '/' + langDir;
                        if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
                            fs.readdirSync(path).forEach(function (file) {
                                if (fs.lstatSync(path + '/' + file).isFile()) {
                                    translations = translations.concat(self.getTranslations(JSON.parse(Helpers.runLaravel("echo json_encode(__('" + i + file.replace(/\.php/, '') + "'));")), i + file.replace(/\.php/, '')));
                                }
                            });
                        }
                    });
                }
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
