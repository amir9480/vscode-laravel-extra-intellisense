'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import * as cp from 'child_process';

var projectRoot = "";
var routes: Array<any> = [];
var views: Array<string> = [];

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

/**
 * Create full path from project file name
 *
 * @param path
 * @param String
 */
function projectPath(path:string) {
	if (path[0] != '/') {
		path = '/' + path;
	}
	return projectRoot+path;
}

async function loadRoutes() {
	if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
		try {
			let {stdout} = await exec("php "+projectPath("artisan")+" route:list", {});
			var lines = stdout.split("\n").filter(function (line) {
				return line.length > 0 && line[0] === '|';
			}).splice(1);

			routes = [];
			for (var i in lines) {
				var line = lines[i].split(" | ");
				if (line.length >= 3) {
					for (i in line) {
						line[i] = line[i].trim();
					}
					if (line[3].length > 0) {
						routes.push({method: line[1], uri: line[2], route: line[3], action: line[4]});
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	}
}

function loadViews(root?: string) {
	if (root === undefined) {
		views = [];
		root = "/";
	}
	if (fs.existsSync(projectPath("resources/views")) && fs.lstatSync(projectPath("resources/views")).isDirectory()) {
		fs.readdirSync(projectPath("resources/views"+root)).forEach(function (file) {
			if (fs.lstatSync(projectPath("resources/views"+root+file)).isDirectory()) {
				loadViews(root + file + "/");
			} else {
				views.push((root != undefined && root.length > 1 ? root.substr(1).replace(/\/|\\/g, ".") : "") + file.replace(".blade.php", ""));
			}
		});
	}
}

function routeAutocompleteProvider() {
	return vscode.languages.registerCompletionItemProvider(
		[
			{ scheme: 'file', language: 'php' },
			{ scheme: 'file', language: 'blade' }
		],
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				let linePrefix = document.lineAt(position).text.substr(0, position.character).toLowerCase().trim();
				if (! linePrefix.includes("route")) {
					return undefined;
				}

				var out:Array<vscode.CompletionItem> = [];

				if (linePrefix.substr(linePrefix.indexOf("route") + 5).includes(",")) {
					// route parameters autocomplete
					var currentRoute = (/\(('|")([A-Za-z0-9_-]+)('|")/g).exec(linePrefix);
					if (currentRoute != null && currentRoute[2].length > 0) {
						for (var i in routes) {
							if (routes[i].route == currentRoute[2]) {
								var routeParamRegex = (/\{([A-Za-z0-9_]+)(\?|)\}/g);
								var currentRouteParameters:any = routeParamRegex.exec(routes[i].uri);
								while (currentRouteParameters != null) {
									if (currentRouteParameters != null && currentRouteParameters[1].length > 0) {
										var compeleteItem = new vscode.CompletionItem(currentRouteParameters[1], vscode.CompletionItemKind.Variable);
										compeleteItem.detail = currentRouteParameters[2] == "?" ? "Optional" : "Required";
										out.push(compeleteItem);
									}
									currentRouteParameters = routeParamRegex.exec(routes[i].uri);
								}
								return out;
							}
						}
					}
				}

				// route name autocomplete
				for (var i in routes) {
					var compeleteItem = new vscode.CompletionItem(routes[i].route, vscode.CompletionItemKind.Enum);
					compeleteItem.detail = routes[i].action.replace(/App\\Http\\Controllers\\/g, '') +
											"\n\n" +
											routes[i].method.replace(/\|HEAD|HEAD\|/g, '') + ":" + routes[i].uri;
					out.push(compeleteItem);
				}
				return out;
			}
		},
		'"',
		"'"
	);
}


function viewAutocompleteProvider() {
	return vscode.languages.registerCompletionItemProvider(
		[
			{ scheme: 'file', language: 'php' },
			{ scheme: 'file', language: 'blade' }
		],
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				let linePrefix = document.lineAt(position).text.substr(0, position.character).toLowerCase().trim();
				if (!(
					linePrefix.includes("view") ||
					linePrefix.includes("@extends") ||
					linePrefix.includes("@component") ||
					linePrefix.includes("@include") ||
					linePrefix.includes("@each")
				)) {
					return undefined;
				}

				var out:Array<vscode.CompletionItem> = [];

				for (var i in views) {
					out.push(new vscode.CompletionItem(views[i], vscode.CompletionItemKind.File));
				}
				return out;
			}
		},
		'"',
		"'"
	);
}

export function activate(context: vscode.ExtensionContext) {
	if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
		projectRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
		if (fs.existsSync(projectPath("artisan"))) {
			loadRoutes();
			loadViews();

			vscode.workspace.onDidSaveTextDocument(function(event: vscode.TextDocument) {
				if (event.fileName.includes("route") && event.fileName.includes("php")) {
					loadRoutes();
				}
				if (event.fileName.includes("views") && event.fileName.includes("php")) {
					loadViews();
				}
			});

			context.subscriptions.push(routeAutocompleteProvider(), viewAutocompleteProvider());
		}
	}
}
