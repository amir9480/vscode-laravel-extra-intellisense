'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from "./helpers";

import RouteProvider from "./RouteProvider";
import ViewProvider from "./ViewProvider";
import ConfigProvider from './ConfigProvider';
import TranslationProvider from './TranslationProvider';
import MixProvider from './MixProvider';



export function activate(context: vscode.ExtensionContext) {
	if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
		if (fs.existsSync(Helpers.projectPath("artisan"))) {
			var routeProider = new RouteProvider;
			var viewProvider = new ViewProvider;
			var configProvider = new ConfigProvider;
			var translationProvider = new TranslationProvider;
			var mixProvider = new MixProvider;
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
				if (event.fileName.toLowerCase().includes("lang") || event.fileName.toLowerCase().includes("trans") || event.fileName.toLowerCase().includes("localization")) {
					translationProvider.loadTranslations();
				}
			});

			var provider = vscode.languages.registerCompletionItemProvider(
				[
					{ scheme: 'file', language: 'php' },
					{ scheme: 'file', language: 'blade' }
				],
				{
					provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
						var out:Array<vscode.CompletionItem> = [];
						out = out.concat(routeProider.getItems(document, position, token, context));
						out = out.concat(viewProvider.getItems(document, position, token, context));
						out = out.concat(configProvider.getItems(document, position, token, context));
						out = out.concat(translationProvider.getItems(document, position, token, context));
						out = out.concat(mixProvider.getItems(document, position, token, context));
						return out;
					}
				},
				...("\"'".split(""))
			);
			context.subscriptions.push(provider);
		}
	}
}
