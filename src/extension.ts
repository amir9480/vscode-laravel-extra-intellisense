'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from "./helpers";

import RouteProvider from "./RouteProvider";
import ViewProvider from "./ViewProvider";
import ConfigProvider from './ConfigProvider';



export function activate(context: vscode.ExtensionContext) {
	if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
		if (fs.existsSync(Helpers.projectPath("artisan"))) {
			var routeProider = new RouteProvider;
			var viewProvider = new ViewProvider;
			var configProvider = new ConfigProvider;
			vscode.workspace.onDidSaveTextDocument(function(event: vscode.TextDocument) {
				if (event.fileName.toLowerCase().includes("route") && event.fileName.toLowerCase().includes("php")) {
					routeProider.loadRoutes();
				}
				if (event.fileName.toLowerCase().includes("blade.php")) {
					viewProvider.loadViews();
				}
				if (event.fileName.toLowerCase().includes("config") && event.fileName.toLowerCase().includes("php")) {
					configProvider.loadConfigs();
				}
			});

			context.subscriptions.push(
				routeProider.getProvider(),
				viewProvider.getProvider(),
				configProvider.getProvider()
			);
		}
	}
}
