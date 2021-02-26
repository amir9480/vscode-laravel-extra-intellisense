'use strict';

import * as vscode from 'vscode';
import Helpers from './helpers';


export default class EloquentProvider implements vscode.CompletionItemProvider {
    private timer: any = null;
    private models: {[key:string]: any} = {};
    private watchers: Array<any> = [];

    constructor () {
        var self = this;
        if (vscode.workspace.workspaceFolders !== undefined) {
            for (let modelsPath of vscode.workspace.getConfiguration("LaravelExtraIntellisense").get<Array<string>>('modelsPaths', ['app', 'app/Models']).concat(['database/migrations'])) {
                let watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], modelsPath + '/*.php'));
                watcher.onDidChange((e: vscode.Uri) => self.onChange());
                watcher.onDidCreate((e: vscode.Uri) => self.onChange());
                watcher.onDidDelete((e: vscode.Uri) => self.onChange());
                this.watchers.push(watcher);
            }
        }
        self.loadModels();
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Array<vscode.CompletionItem> {
        var out:Array<vscode.CompletionItem> = [];
        var func = Helpers.parseDocumentFunction(document, position);
        let sourceCode = document.getText();
        let sourceBeforeCursor = sourceCode.substr(0, document.offsetAt(position));
        var isFactory = sourceBeforeCursor.includes("extends Factory") || sourceBeforeCursor.includes("$factory->define(");
        if (func === null && isFactory === false) {
            return out;
        }
        var match = null;
        var modelName = "";
        var modelClass = "";
        if (func) {
            let modelNameRegex = /([A-Za-z0-9_\\]+)::[^:]+$/g;
            var namespaceRegex = /namespace\s+(.+);/g;
            var namespace = "";
            while ((match = modelNameRegex.exec(sourceBeforeCursor)) !== null) {
                modelName = match[1];
            }
            if ((match = namespaceRegex.exec(sourceBeforeCursor)) !== null) {
                namespace = match[1];
            }
            var modelClassRegex = new RegExp("use (.+)" + modelName + ";", "g");
            if (modelName.substr(0, 1) === '\\') {
                modelClass = modelName.substr(1);
            } else if ((match = modelClassRegex.exec(sourceBeforeCursor)) !== null) {
                modelClass = match[1] + modelName;
            } else {
                modelClass = namespace + "\\" + modelName;
            }
        } else {
            var factoryModelClassRegex = /(protected \$model = ([A-Za-z0-9_\\]+)::class;)|(\$factory->define\(\s*([A-Za-z0-9_\\]+)::class)/g
            if ((match = factoryModelClassRegex.exec(sourceBeforeCursor)) !== null) {
                if (typeof match[4] !== 'undefined') { // Laravel 7 <
                    modelName = match[4];
                } else { // Laravel >= 8
                    modelName = match[2];
                }
            }
            var modelClassRegex = new RegExp("use (.+)" + modelName + ";", "g");
            if (modelName.substr(0, 1) === '\\') {
                modelClass = modelName.substr(1);
            } else if ((match = modelClassRegex.exec(sourceBeforeCursor)) !== null) {
                modelClass = match[1] + modelName;
            } else {
                modelClass = modelName;
            }
        }

        if (typeof this.models[modelClass] !== 'undefined') {
            if (func && ['whereHas', 'whereDoesntHave'].some((fn:string) => func.function.includes(fn))) {
                for (let relation of this.models[modelClass].relations) {
                    var completeItem = new vscode.CompletionItem(relation, vscode.CompletionItemKind.Value);
                    completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                    out.push(completeItem);
                }
            } else {
                for (let attribute of this.models[modelClass].attributes) {
                    var completeItem = new vscode.CompletionItem(attribute, vscode.CompletionItemKind.Value);
                    completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                    out.push(completeItem);
                }
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
            self.loadModels();
            self.timer = null;
        }, 2000);
    }

    loadModels() {
        var self = this;
        try {
            for (let modelsPath of vscode.workspace.getConfiguration("LaravelExtraIntellisense").get<Array<string>>('modelsPaths', ['app', 'app/Models'])) {
                Helpers.runLaravel(
                    "if (is_dir(base_path('" + modelsPath + "'))) {" +
                    "   foreach (scandir(base_path('" + modelsPath + "')) as $sourceFile) {" +
                    "      if (substr($sourceFile, -4) == '.php' && is_file(base_path(\"" + modelsPath + "/$sourceFile\"))) {" +
                    "          include_once base_path(\"" + modelsPath + "/$sourceFile\");" +
                    "      }" +
                    "   }" +
                    "}" +
                    "$modelClasses = array_values(array_filter(get_declared_classes(), function ($declaredClass) {" +
                    "   return is_subclass_of($declaredClass, 'Illuminate\\Database\\Eloquent\\Model');" +
                    "}));" +
                    "$output = [];" +
                    "foreach ($modelClasses as $modelClass) {" +
                    "   $output[$modelClass] = ['attributes' => [], 'relations' => []];" +
                    "   try {" +
                    "       $modelInstance = $modelClass::first();" +
                    "       $output[$modelClass]['attributes'] = array_values(array_unique(array_merge(app($modelClass)->getFillable(), array_keys($modelInstance ? $modelInstance->getAttributes() : []))));" +
                    "   } catch (\\Throwable $e) {}" +
                    "   foreach ((new \\ReflectionClass($modelClass))->getMethods() as $classMethod) {" +
                    "       try {" +
                    "           if (" +
                    "                $classMethod->isStatic() == false &&" +
                    "                $classMethod->isPublic() == true &&" +
                    "                substr($classMethod->getName(), 0, 3) != 'get' &&" +
                    "                substr($classMethod->getName(), 0, 3) != 'set' &&" +
                    "                count($classMethod->getParameters()) == 0 &&" +
                    "                preg_match('/belongsTo|hasMany|hasOne|morphOne|morphMany|morphTo/', implode('', array_slice(file($classMethod->getFileName()), $classMethod->getStartLine(), $classMethod->getEndLine() - $classMethod->getStartLine() - 1)))" +
                    "           ) {" +
                    "               $output[$modelClass]['relations'][] = $classMethod->getName();" +
                    "           }" +
                    "       } catch (\\Throwable $e) {}" +
                    "   }" +
                    "   sort($output[$modelClass]['attributes']);" +
                    "   sort($output[$modelClass]['relations']);" +
                    "}" +
                    "echo json_encode($output);"
                ).then(function (result) {
                    let models = JSON.parse(result);
                    for (let i in models) {
                        self.models[i] = models[i];
                    }
                }).catch(function (e) {
                    console.error(e);
                });
            }
        } catch (exception) {
            console.error(exception);
        }
    }
}
