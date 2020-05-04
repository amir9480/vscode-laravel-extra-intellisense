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
import EnvProvider from './EnvProvider';
import MiddlewareProvider from './MiddlewareProvider';



export function activate(context: vscode.ExtensionContext) {
	showWelcomeMessage(context);
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
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new EnvProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new MiddlewareProvider, ...TRIGGER_CHARACTERS));
		}
	}
}

export function deactivate() {}

function showWelcomeMessage(context: vscode.ExtensionContext) {
	let previousVersion = context.globalState.get<string>('laravel-extra-intellisense-version');
	let currentVersion = vscode.extensions.getExtension('amiralizadeh9480.laravel-extra-intellisense')?.packageJSON?.version;
	let message : string | null = null;
	let previousVersionArray = previousVersion ? previousVersion.split('.').map((s: string) => Number(s)) : [0, 0, 0];
	let currentVersionArray = currentVersion.split('.').map((s: string) => Number(s));
	if (previousVersion === undefined || previousVersion.length === 0) {
		message = "Thanks for using Laravel Extra Intellisense.";
	} else if (currentVersion !== previousVersion && (
		(previousVersionArray[0] === currentVersionArray[0] && previousVersionArray[1] === currentVersionArray[1] && previousVersionArray[2] < currentVersionArray[2]) ||
		(previousVersionArray[0] === currentVersionArray[0] && previousVersionArray[1] < currentVersionArray[1]) ||
		(previousVersionArray[0] < currentVersionArray[0])
	)
	) {
		message = "Laravel Extra Intellisense updated to " + currentVersion + ". New features: env and route middleware autocomplete.";
	}
	if (message) {
		vscode.window.showInformationMessage(message, '⭐️ Star on Github', '🐞 Report Bug')
			.then(function (val: string | undefined) {
				if (val === '⭐️ Rate') {
					vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=amiralizadeh9480.laravel-extra-intellisense'));
				} else if (val === '🐞 Report Bug') {
					vscode.env.openExternal(vscode.Uri.parse('https://github.com/amir9480/vscode-laravel-extra-intellisense/issues'));
				} else if (val === '⭐️ Star on Github') {
					vscode.env.openExternal(vscode.Uri.parse('https://github.com/amir9480/vscode-laravel-extra-intellisense#other-products'));
				}
			});
		context.globalState.update('laravel-extra-intellisense-version', currentVersion);
	}
}

