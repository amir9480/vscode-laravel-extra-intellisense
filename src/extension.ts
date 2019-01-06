'use strict';

import * as vscode from 'vscode';
import * as cp from 'child_process';

var routes: Array<string> = [];

function exec(command: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
	return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		cp.exec(command, options, (error, stdout, stderr) => {
			if (error) {
				reject({ error, stdout, stderr });
			}
			resolve({ stdout, stderr });
		});
	});
}

async function loadRoutes() {
	if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
		try {
			let {stdout} = await exec("php "+vscode.workspace.workspaceFolders[0].uri.fsPath+"/artisan route:list", {});
			var lines = stdout.split("\n").filter(function (line) {
				return line.length > 0 && line[0] === '|';
			}).splice(1);

			routes = [];
			for (var i in lines) {
				var line:any = lines[i].split(" | ").splice(3, 1);
				if (line.length > 0) {
					line = line[0].trim();
					if (line.length > 0) {
						routes.push(line);
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	loadRoutes();

	vscode.workspace.onDidSaveTextDocument(function(event: vscode.TextDocument) {
		if (event.fileName.includes("route") && event.fileName.includes("php")) {
			loadRoutes();
		}
	});

	const routeAutocompleteProvider = vscode.languages.registerCompletionItemProvider(
		'php',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				let linePrefix = document.lineAt(position).text.substr(0, position.character);
				if (!linePrefix.includes("route")) {
					return undefined;
				}

				var out:Array<vscode.CompletionItem> = [];
				for (var i in routes) {
					out.push(new vscode.CompletionItem(routes[i], vscode.CompletionItemKind.Text));
				}
				return out;
			}
		},
		'"',
		"'"
	);

	context.subscriptions.push(routeAutocompleteProvider);
}
