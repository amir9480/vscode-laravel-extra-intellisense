'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from './helpers';


export default class TranslationProvider implements vscode.CompletionItemProvider {
    private timer: any = null;
    private translations: Array<any> = [];
    private watcher: any = null;

    constructor () {
        var self = this;
        self.loadTranslations();
        if (vscode.workspace.workspaceFolders !== undefined) {
            this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], "{,**/}{lang,localization,localizations,trans,translation,translations}/{*,**/*}"));
            this.watcher.onDidChange((e: vscode.Uri) => this.onChange());
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

        if (func && ((func.class && Helpers.tags.trans.classes.some((cls:string) => func.class.includes(cls))) || Helpers.tags.trans.functions.some((fn:string) => func.function.includes(fn)))) {
            if (func.paramIndex === 1) {
                // parameters autocomplete
                var paramRegex = /\:([A-Za-z0-9_]+)/g;
                var match = null;

                for (let i in this.translations) {
                    if (this.translations[i].name === func.parameters[0]) {
                        while ((match = paramRegex.exec(this.translations[i].value)) !== null) {
                            var completeItem = new vscode.CompletionItem(match[1], vscode.CompletionItemKind.Variable);
                            completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                            out.push(completeItem);
                        }
                        return out;
                    }
                }
                return out;
            }

            for (let i in this.translations) {
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

    onChange() {
        var self = this;
        if (self.timer) {
            clearTimeout(self.timer);
        }
        self.timer = setTimeout(function () {
            self.loadTranslations();
            self.timer = null;
        }, 5000);
    }

    loadTranslations () {
        var translations:Array<any> = [];
        try {
            var self = this;
            Helpers.runLaravel("echo json_encode(app('translator')->getLoader()->namespaces());", "Translation namespaces")
                .then(async function (result) {
                    var tranlationNamespaces = JSON.parse(result);
                    for (let i in tranlationNamespaces) {
                        tranlationNamespaces[i + '::'] = tranlationNamespaces[i];
                        delete tranlationNamespaces[i];
                    }
                    let langPath = JSON.parse(await Helpers.runLaravel('echo json_encode(app()->langPath());', "Translation Path"));
                    tranlationNamespaces[''] = langPath;
                    var nestedTranslationGroups = function (basePath:string, relativePath: string = '') : Array<string> {
                        let path = basePath + '/' + relativePath;
                        let out: Array<string> = [];
                        if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
                            fs.readdirSync(path).forEach(function (file) {
                                if (fs.lstatSync(path + '/' + file).isFile()) {
                                    out.push(relativePath + '/' + file.replace(/\.php/, ''));
                                } else if (fs.lstatSync(path + '/' + file).isDirectory()) {
                                    let nestedOut = nestedTranslationGroups(basePath, (relativePath.length > 0 ? relativePath + '/' : '') + file);
                                    for (let nested of nestedOut) {
                                        out.push(nested);
                                    }
                                }
                            });
                        }
                        return out;
                    }
                    var translationGroups:any = [];
                    fs.readdirSync(langPath).forEach(function (langDir) {
                        var path:any = langPath + '/' + langDir;
                        if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
                            fs.readdirSync(path).forEach(function (subDirectory) {
                                let subDirectoryPath = path + '/' + subDirectory;
                                if (fs.existsSync(subDirectoryPath) && fs.lstatSync(subDirectoryPath).isDirectory()) {
                                    let nestedDirectories = nestedTranslationGroups(path, subDirectory);
                                    for (let nestedDirectory of nestedDirectories) {
                                        translationGroups.push(nestedDirectory);
                                    }
                                }
                            });
                        }
                    });
                    for (let i in tranlationNamespaces) {
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
                    Helpers.runLaravel("echo json_encode([" + translationGroups.map((transGroup: string) => "'" + transGroup + "' => __('" + transGroup + "')").join(",") + "]);", "Translations inside namespaces")
                        .then(function (translationGroupsResult) {
                            translationGroups = JSON.parse(translationGroupsResult);
                            for(var i in translationGroups) {
                                translations = translations.concat(self.getTranslations(translationGroups[i], i));
                            }
                            self.translations = translations;
                            Helpers.runLaravel("echo json_encode(__('*'));", "Default path Translations")
                                .then(function (jsontransResult) {
                                    translations = translations.concat(self.getTranslations(JSON.parse(jsontransResult), '').map(function (transInfo) {
                                        transInfo.name = transInfo.name.replace(/^\./, '');
                                        return transInfo;
                                    }));
                                    self.translations = translations;
                                });
                        });
                });
        } catch (exception) {
            console.error(exception);
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
