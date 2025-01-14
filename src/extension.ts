'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import Helpers from "./helpers";

import RouteProvider from "./RouteProvider";
import ViewProvider from "./ViewProvider";
import ConfigProvider from './ConfigProvider';
import TranslationProvider from './TranslationProvider';
import MixProvider from './MixProvider';
import ViteProvider from './ViteProvider';
import ValidationProvider from './ValidationProvider';
import EnvProvider from './EnvProvider';
import MiddlewareProvider from './MiddlewareProvider';
import AuthProvider from './AuthProvider';
import AssetProvider from './AssetProvider';
import EloquentProvider from './EloquentProvider';
import BladeProvider from './BladeProvider';
import { sep } from 'path';


export function activate(context: vscode.ExtensionContext) {
	showWelcomeMessage(context);
	vscode.workspace.onDidOpenTextDocument((document) => {
		if (isDatabaseRelatedFile(document)) {
			suggestDevDbExtension(context);
		}
	});

	if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
		if (fs.existsSync(Helpers.projectPath("artisan"))) {
			if (Helpers.outputChannel === null) {
				Helpers.outputChannel = vscode.window.createOutputChannel("Laravel Extra Intellisense", {log: true});
				Helpers.outputChannel.info("Laravel Extra Intellisense Started...");
			}

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
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new ViteProvider(), ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new ValidationProvider, ...TRIGGER_CHARACTERS.concat(['|'])));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new EnvProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new MiddlewareProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new AuthProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new AssetProvider, ...TRIGGER_CHARACTERS));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new EloquentProvider, ...TRIGGER_CHARACTERS.concat(['>'])));
			context.subscriptions.push(vscode.languages.registerCompletionItemProvider(LANGUAGES, new BladeProvider, '@'));
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
		// (previousVersionArray[0] === currentVersionArray[0] && previousVersionArray[1] === currentVersionArray[1] && previousVersionArray[2] < currentVersionArray[2]) ||
		(previousVersionArray[0] === currentVersionArray[0] && previousVersionArray[1] < currentVersionArray[1]) ||
		(previousVersionArray[0] < currentVersionArray[0])
	)
	) {
		message = "Laravel Extra Intellisense updated to " + currentVersion + " - New Feature✨ : Add Vite autocompletion support.";
	}
	if (message) {
		vscode.window.showInformationMessage(message, '⭐️ Star on Github', '🐞 Report Bug')
			.then(function (val: string | undefined) {
				if (val === '⭐️ Rate') {
					vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=amiralizadeh9480.laravel-extra-intellisense'));
				} else if (val === '🐞 Report Bug') {
					vscode.env.openExternal(vscode.Uri.parse('https://github.com/amir9480/vscode-laravel-extra-intellisense/issues'));
				} else if (val === '⭐️ Star on Github') {
					vscode.env.openExternal(vscode.Uri.parse('https://github.com/amir9480/vscode-laravel-extra-intellisense'));
				}
			});
		context.globalState.update('laravel-extra-intellisense-version', currentVersion);
	}
}

function isDatabaseRelatedFile(document: vscode.TextDocument): boolean {
	const filePath = document.uri.fsPath;
	const isInModelsPath = filePath.includes(`app${sep}Models`);
	const isInDatabasePath = filePath.includes(`database${sep}`);

	return isInModelsPath || isInDatabasePath
}

async function suggestDevDbExtension(context: vscode.ExtensionContext) {
	const DEVDB_EXTENSION_ID = 'damms005.devdb';
	const RECOMMENDATION_KEY = 'laravel-extra-intellisense-devdb-extension-recommendation';
	const NOT_INTERESTED_KEY = 'laravel-extra-intellisense-devdb-extension-not-interested';
	const isDevDbExtensionInstalled = vscode.extensions.getExtension(DEVDB_EXTENSION_ID) !== undefined;

	if (isDevDbExtensionInstalled || context.globalState.get<boolean>(NOT_INTERESTED_KEY)) {
		return;
	}

	const currentTime = Date.now();
	const lastRecommendation = context.globalState.get<number>(RECOMMENDATION_KEY);
	const aYearSinceLastRecommendation = lastRecommendation && (((currentTime - lastRecommendation) > 365 * 24 * 60 * 60 * 1000));

	if (!lastRecommendation || aYearSinceLastRecommendation) {
		const selection = await vscode.window.showInformationMessage(
			'Laravel Extra Intellisense Recommendation: Enhance your database workflow with DevDb - a zero-config extension to auto-load and display database records.',
			'Get DevDb',
			'Not Interested',
			'Remind Me Later'
		);

		if (selection === 'Get DevDb') {
			vscode.commands.executeCommand(
				'extension.open',
				DEVDB_EXTENSION_ID
			);
		} else if (selection === 'Not Interested') {
			context.globalState.update(NOT_INTERESTED_KEY, true);
		} else if (selection === 'Remind Me Later') {
			context.globalState.update(RECOMMENDATION_KEY, currentTime);
		}
	}
}