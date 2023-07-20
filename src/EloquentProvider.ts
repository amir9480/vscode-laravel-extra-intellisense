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
        var match = null;
        var objectName = "";
        var modelName = "";
        var modelClass = "";
        if (func != null || isFactory) {
            if (func) {
                let modelNameRegex = /([A-z0-9_\\]+)::[^:;]+$/g;
                var namespaceRegex = /namespace\s+(.+);/g;
                var namespace = "";
                while ((match = modelNameRegex.exec(sourceBeforeCursor)) !== null) {
                    modelName = match[1];
                }
                if (modelName.length === 0) {
                    let variableNameRegex = /(\$([A-z0-9_\\]+))->[^;]+$/g;
                    while ((match = variableNameRegex.exec(sourceBeforeCursor)) !== null) {
                        objectName = match[2];
                    }
                    if (objectName.length > 0) {
                        modelNameRegex = new RegExp("\\$" + objectName + "\\s*=\\s*([A-z0-9_\\\\]+)::[^:]", "g");
                        while ((match = modelNameRegex.exec(sourceBeforeCursor)) !== null) {
                            modelName = match[1];
                        }
                    }
                }
                if ((match = namespaceRegex.exec(sourceBeforeCursor)) !== null) {
                    namespace = match[1];
                }
                modelClass = this.getModelClass(modelName, sourceBeforeCursor);
            } else {
                var factoryModelClassRegex = /(protected \$model = ([A-Za-z0-9_\\]+)::class;)|(\$factory->define\(\s*([A-Za-z0-9_\\]+)::class)/g
                if ((match = factoryModelClassRegex.exec(sourceBeforeCursor)) !== null) {
                    if (typeof match[4] !== 'undefined') { // Laravel 7 <
                        modelName = match[4];
                    } else { // Laravel >= 8
                        modelName = match[2];
                    }
                }
                modelClass = this.getModelClass(modelName, sourceBeforeCursor);
            }

            if (typeof this.models[modelClass] !== 'undefined') {
                if (func && Helpers.relationMethods.some((fn:string) => func.function.includes(fn))) {
                    out = out.concat(this.getCompletionItems(document, position, this.models[modelClass].relations));
                } else {
                    out = out.concat(this.getCompletionItems(document, position, this.models[modelClass].attributes));
                }
            }
        } else {
            let isArrayObject = false;
            let objectRegex = /(\$?([A-z0-9_\[\]]+)|(Auth::user\(\)))\-\>[A-z0-9_]*$/g;
            while ((match = objectRegex.exec(sourceBeforeCursor)) !== null) {
                objectName = typeof match[2] !== 'undefined' ? match[2] : match[3];
            }
            if (objectName.match(/\$?[A-z0-9_]+\[.+\].*$/g)) {
                isArrayObject = true;
                objectName = objectName.replace(/\[.+\].*$/g, '');
            }
            if (objectName.length > 0 && objectName != 'Auth::user()') {
                let modelNameRegex = new RegExp("\\$" + objectName + "\\s*=\\s*([A-z0-9_\\\\]+)::[^:;]", "g");
                while ((match = modelNameRegex.exec(sourceBeforeCursor)) !== null) {
                    modelName = match[1];
                }
                modelClass = this.getModelClass(modelName, sourceBeforeCursor);
            }
            if (modelClass == 'Auth' || objectName == 'Auth::user()') {
                if (typeof this.models['App\\User'] !== 'undefined') {
                    out = out.concat(this.getModelAttributesCompletionItems(document, position, 'App\\User'));
                } else if (typeof this.models['App\\Models\\User'] !== 'undefined') {
                    out = out.concat(this.getModelAttributesCompletionItems(document, position, 'App\\Models\\User'));
                }
            }
            let customVariables = vscode.workspace.getConfiguration("LaravelExtraIntellisense").get<any>('modelVariables', {});
            for (let customVariable in customVariables) {
                if (customVariable === objectName && typeof this.models[customVariables[customVariable]] !== 'undefined') {
                    out = out.concat(this.getModelAttributesCompletionItems(document, position, customVariables[customVariable]));
                }
            }
            for (let i in this.models) {
                if (i == modelClass ||
                    (this.models[i].camelCase == objectName || this.models[i].snakeCase == objectName) ||
                    (isArrayObject == true && (this.models[i].pluralCamelCase == objectName || this.models[i].pluralSnakeCase == objectName))
                ) {
                    out = out.concat(this.getModelAttributesCompletionItems(document, position, i));
                }
            }
        }
        out = out.filter((v, i, a) => a.map((ai) => ai.label).indexOf(v.label) === i); // Remove duplicate items
        return out;
    }

    getModelClass(modelName: string, sourceBeforeCursor: string) {
        let match = null;
        let modelClass = "";
        if (modelName.length === 0) {
            return "";
        }
        var modelClassRegex = new RegExp("use (.+)" + modelName + ";", "g");
        if (modelName.substr(0, 1) === '\\') {
            modelClass = modelName.substr(1);
        } else if ((match = modelClassRegex.exec(sourceBeforeCursor)) !== null) {
            modelClass = match[1] + modelName;
        } else {
            modelClass = modelName;
        }
        return modelClass;
    }

    getModelAttributesCompletionItems(document: vscode.TextDocument, position: vscode.Position, modelClass: string) : Array<vscode.CompletionItem> {
        let out: Array<vscode.CompletionItem> = [];
        if (typeof this.models[modelClass] !== 'undefined') {
            out = out.concat(this.getCompletionItems(document, position, this.models[modelClass].attributes.map((attr: any) => attr[vscode.workspace.getConfiguration("LaravelExtraIntellisense").get<string>('modelAttributeCase', 'default')])));
            out = out.concat(this.getCompletionItems(document, position, this.models[modelClass].accessors.map((attr: any) => attr[vscode.workspace.getConfiguration("LaravelExtraIntellisense").get<string>('modelAccessorCase', 'snake')]), vscode.CompletionItemKind.Constant));
            out = out.concat(this.getCompletionItems(document, position, this.models[modelClass].relations, vscode.CompletionItemKind.Value));
            out = out.concat(this.getCompletionItems(document, position, this.models[modelClass].scopes, vscode.CompletionItemKind.Value));
        }
        return out;
    }

    getCompletionItems(document: vscode.TextDocument, position: vscode.Position, items: Array<string>, type: vscode.CompletionItemKind =  vscode.CompletionItemKind.Property) : Array<vscode.CompletionItem> {
        let out: Array<vscode.CompletionItem> = [];
        for (let item of items) {
            var completeItem = new vscode.CompletionItem(item, type);
            completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
            out.push(completeItem);
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
        }, 5000);
    }

    loadModels() {
        var self = this;
        try {
            Helpers.runLaravel(
                "foreach (['" + vscode.workspace.getConfiguration("LaravelExtraIntellisense").get<Array<string>>('modelsPaths', ['app', 'app/Models']).join('\', \'') + "'] as $modelPath) {" +
                "   if (is_dir(base_path($modelPath))) {" +
                "      foreach (scandir(base_path($modelPath)) as $sourceFile) {" +
                "         if (substr($sourceFile, -4) == '.php' && is_file(base_path(\"$modelPath/$sourceFile\"))) {" +
                "             include_once base_path(\"$modelPath/$sourceFile\");" +
                "         }" +
                "      }" +
                "   }" +
                "}" +
                "$modelClasses = array_values(array_filter(get_declared_classes(), function ($declaredClass) {" +
                "   return is_subclass_of($declaredClass, 'Illuminate\\Database\\Eloquent\\Model') && $declaredClass != 'Illuminate\\Database\\Eloquent\\Relations\\Pivot' && $declaredClass != 'Illuminate\\Foundation\\Auth\\User';" +
                "}));" +
                "$output = [];" +
                "foreach ($modelClasses as $modelClass) {" +
                "   $classReflection = new \\ReflectionClass($modelClass);" +
                "   $output[$modelClass] = [" +
                "       'name' => $classReflection->getShortName()," +
                "       'camelCase' => Illuminate\\Support\\Str::camel($classReflection->getShortName())," +
                "       'snakeCase' => Illuminate\\Support\\Str::snake($classReflection->getShortName())," +
                "       'pluralCamelCase' => Illuminate\\Support\\Str::camel(Illuminate\\Support\\Str::plural($classReflection->getShortName()))," +
                "       'pluralSnakeCase' => Illuminate\\Support\\Str::snake(Illuminate\\Support\\Str::plural($classReflection->getShortName()))," +
                "       'attributes' => []," +
                "       'scopes' => []," +
                "       'accessors' => []," +
                "       'relations' => []" +
                "   ];" +
                "   try {" +
                "       $modelInstance = $modelClass::first();" +
                "       $attributes = array_values(array_unique(array_merge(app($modelClass)->getFillable(), array_keys($modelInstance ? $modelInstance->getAttributes() : []))));" +
                "       $output[$modelClass]['attributes'] = array_map(function ($attribute) {" +
                "           return ['default' => $attribute, 'snake' => Illuminate\\Support\\Str::snake($attribute), 'camel' => Illuminate\\Support\\Str::camel($attribute)];" +
                "       }, $attributes);" +
                "   } catch (\\Throwable $e) {}" +
                "   foreach ($classReflection->getMethods() as $classMethod) {" +
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
                "           } elseif (" +
                "                substr($classMethod->getName(), 0, 3) == 'get' && " +
                "                substr($classMethod->getName(), -9) == 'Attribute' &&" +
                "                !empty(substr($classMethod->getName(), 3, -9))" +
                "           ) {" +
                "               $attributeName = substr($classMethod->getName(), 3, -9);" +
                "               $output[$modelClass]['accessors'][] = ['default' => $attributeName, 'snake' => Illuminate\\Support\\Str::snake($attributeName), 'camel' => Illuminate\\Support\\Str::camel($attributeName)];" +
                "           } elseif (" +
                "                substr($classMethod->getName(), 0, 5) == 'scope' && " +
                "                !empty(substr($classMethod->getName(), 5))" +
                "           ) {" +
                "               $attributeName = substr($classMethod->getName(), 5);" +
                "               $output[$modelClass]['scopes'][] = Illuminate\\Support\\Str::camel($attributeName);" +
                "           }" +
                "       } catch (\\Throwable $e) {}" +
                "   }" +
                "   sort($output[$modelClass]['attributes']);" +
                "   sort($output[$modelClass]['scopes']);" +
                "   sort($output[$modelClass]['relations']);" +
                "}" +
                "echo json_encode($output);"
            ).then(function (result) {
                let models = JSON.parse(result);
                self.models = models;
            }).catch(function (e) {
                console.error(e);
            });
        } catch (exception) {
            console.error(exception);
        }
    }
}
