'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from "./helpers";

import RouteProvider from "./RouteProvider";
import ViewProvider from "./ViewProvider";



export function activate(context: vscode.ExtensionContext) {
	if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
		if (fs.existsSync(Helpers.projectPath("artisan"))) {
			var routeProider = new RouteProvider;
			var viewProvider = new ViewProvider;
			vscode.workspace.onDidSaveTextDocument(function(event: vscode.TextDocument) {
				if (event.fileName.toLowerCase().includes("route") && event.fileName.toLowerCase().includes("php")) {
					routeProider.loadRoutes();
				}
				if (event.fileName.toLowerCase().includes("blade.php")) {
					viewProvider.loadViews();
				}
			});

			context.subscriptions.push(
				routeProider.getProvider(),
				viewProvider.getProvider()
			);
		}
	}
}
