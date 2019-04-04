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
			var providerTimers:any = {
				route: null,
				view: null,
				config: null,
				translation: null,
				mix: null
			};
			vscode.workspace.onDidSaveTextDocument(function(event: vscode.TextDocument) {
				if (providerTimers.route !== null && event.fileName.toLowerCase().includes("route") && event.fileName.toLowerCase().includes("php")) {
					providerTimers.route = setTimeout(function () {
						routeProider.loadRoutes();
						providerTimers.route = null;
					}, 2000);
				}
				if (providerTimers.view !== null && event.fileName.toLowerCase().includes("blade.php")) {
					providerTimers.view = setTimeout(function () {
						viewProvider.loadViews();
						providerTimers.view = null;
					}, 2000);
				}
				if (providerTimers.config !== null && event.fileName.toLowerCase().includes("config") && event.fileName.toLowerCase().includes("php")) {
					providerTimers.config = setTimeout(function () {
						configProvider.loadConfigs();
						providerTimers.config = null;
					}, 2000);
				}
				if (providerTimers.translation !== null && event.fileName.toLowerCase().includes("lang") || event.fileName.toLowerCase().includes("trans") || event.fileName.toLowerCase().includes("localization")) {
					providerTimers.translation = setTimeout(function () {
						translationProvider.loadTranslations();
						providerTimers.translation = null;
					}, 2000);
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
