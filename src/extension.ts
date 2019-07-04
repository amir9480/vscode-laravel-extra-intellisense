'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from "./helpers";

import RouteProvider from "./RouteProvider";
import ViewProvider from "./ViewProvider";
import ConfigProvider from './ConfigProvider';
import TranslationProvider from './TranslationProvider';
import MixProvider from './MixProvider';
import ValidationProvider from './ValidationProvider';



export function activate(context: vscode.ExtensionContext) {
	if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
		if (fs.existsSync(Helpers.projectPath("artisan"))) {
			const LANGUAGES =
			[
				{ scheme: 'file', language: 'php' },
				{ scheme: 'file', language: 'blade' },
				{ scheme: 'file', language: 'laravel-blade' }
			];
			const TRIGGER_CHARACTERS = "\"'".split("");

			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new RouteProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new ViewProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new ConfigProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new TranslationProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new MixProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new ValidationProvider, ...TRIGGER_CHARACTERS.concat(['|'])));
		}
	}
}
