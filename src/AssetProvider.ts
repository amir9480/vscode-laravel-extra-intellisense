'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import Helpers from './helpers';


export default class AssetProvider implements vscode.CompletionItemProvider {
    private publicFiles: Array<string> = [];
    private timer: any = null;
    private watcher: any = null;

    constructor () {
        this.loadFiles();
        if (vscode.workspace.workspaceFolders !== undefined) {
            this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], "public/**/*"));
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

        if (func && (Helpers.tags.asset.functions.some((fn:string) => func.function.includes(fn)))) {
            for (var i in this.publicFiles) {
                var completeItem = new vscode.CompletionItem(this.publicFiles[i], vscode.CompletionItemKind.Constant);
                completeItem.range = document.getWordRangeAtPosition(position, Helpers.wordMatchRegex);
                out.push(completeItem);
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
            self.loadFiles();
            self.timer = null;
        }, 2000);
    }

    loadFiles() {
        this.publicFiles = this.getFiles().map((path) => path.replace(/\/?public\/?/g, ""));
    }

    getFiles(scanPath: string = "public", depth: number = 0) {
        let out: Array<string> = [];
        try {
            let projectScanPath = Helpers.projectPath(scanPath);
            if (depth <= 10 && fs.existsSync(projectScanPath)) {
                for (let filePath of fs.readdirSync(projectScanPath)) {
                    let fullFilePath = projectScanPath + "/" + filePath;
                    if (fs.lstatSync(fullFilePath).isDirectory()) {
                        out = out.concat(this.getFiles(scanPath + "/" + filePath, depth + 1));
                    } else if (fs.lstatSync(fullFilePath).isFile()) {
                        if (filePath[0] != '.' && filePath.endsWith(".php") == false) {
                            out.push(scanPath + "/" + filePath);
                        }
                    }
                }
            }
        } catch (exception) {
            console.error(exception);
        }

        return out;
    }
}
