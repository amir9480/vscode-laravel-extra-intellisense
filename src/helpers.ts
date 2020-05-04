'use strict';

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

export default class Helpers {

	static wordMatchRegex = /[\w\d\-_\.\:\\\/]+/g;
	static phpParser:any = null;
	static cachedParseFunction:any = null;

	static tags:any = {
		config: 	{classes: ['Config']	, functions: ['config']},
		mix: 		{classes: []			, functions: ['mix']},
		route: 		{classes: ['Route']		, functions: ['route']},
		trans: 		{classes: ['Lang']		, functions: ['__', 'trans', '@lang']},
		validation:	{classes: ['Validator'] , functions: ['validate', 'sometimes', 'rules']},
		view: 		{classes: ['View']		, functions: ['view', 'markdown', 'links', '@extends', '@component', '@include', '@each']},
		env: 		{classes: []			, functions: ['env']},
	};
	static functionRegex: any = null;

	/**
	 * Create full path from project file name
	 *
	 * @param path
	 * @param string
	 */
	static projectPath(path:string) : string {
		if (path[0] !== '/') {
			path = '/' + path;
		}
		if (vscode.workspace.workspaceFolders instanceof Array && vscode.workspace.workspaceFolders.length > 0) {
			return vscode.workspace.workspaceFolders[0].uri.fsPath+path;
		}
		return "";
	}

	static arrayUnique(value:any, index:any, self:Array<any>) {
		return self.indexOf(value) === index;
	}

	/**
	 * Boot laravel and run simple php code.
	 *
	 * @param code
	 */
	static async runLaravel(code: string) : Promise<string> {
		if (fs.existsSync(Helpers.projectPath("vendor/autoload.php")) && fs.existsSync(Helpers.projectPath("bootstrap/app.php"))) {
			var command =
				"define('LARAVEL_START', microtime(true));" +
				"require_once '" + Helpers.projectPath("vendor/autoload.php") + "';" +
				"$app = require_once '" + Helpers.projectPath("bootstrap/app.php") + "';" +
				"class VscodeLaravelExtraIntellisenseProvider extends \\Illuminate\\Support\\ServiceProvider" +
				"{" +
				"	public function boot()" +
				"	{" +
				"		$this->app['log']->setHandlers([new \\Monolog\\Handler\\NullHandler()]);" +
				"	}" +
				"}" +
				"$app->register(new VscodeLaravelExtraIntellisenseProvider($app));" +
				"$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);" +

				"$status = $kernel->handle(" +
					"$input = new Symfony\\Component\\Console\\Input\\ArgvInput," +
					"new Symfony\\Component\\Console\\Output\\ConsoleOutput" +
				");" +
				"echo '___VSCODE_LARAVEL_EXTRA_INSTELLISENSE_OUTPUT___';" +
				 code +
				"echo '___VSCODE_LARAVEL_EXTRA_INSTELLISENSE_END_OUTPUT___';";

			var out : string | null | RegExpExecArray = await this.runPhp(command);
			out = /___VSCODE_LARAVEL_EXTRA_INSTELLISENSE_OUTPUT___(.*)___VSCODE_LARAVEL_EXTRA_INSTELLISENSE_END_OUTPUT___/g.exec(out);
			if (out) {
				return out[1];
			}
		}
		return "";
	}

	/**
	 * run simple php code.
	 *
	 * @param code
	 */
	static async runPhp(code: string) : Promise<string> {
		code = code.replace(/\"/g, "\\\"");
		if (['linux', 'openbsd', 'sunos', 'darwin'].some(unixPlatforms => os.platform().includes(unixPlatforms))) {
			code = code.replace(/\$/g, "\\$");
			code = code.replace(/\\\\'/g, '\\\\\\\\\'');
			code = code.replace(/\\\\"/g, '\\\\\\\\\"');
		}
		var command = "php -r \"" + code + "\"";
		let out = new Promise<string>(function (resolve, error) {
			cp.exec(command, function (err, stdout, stderr) {
				if (stdout.length > 0) {
					resolve(stdout);
				} else {
					error(stderr);
				}
			});
		});
		return out;
	}

	/**
	 * Parse php code with 'php-parser' package.
	 * @param code
	 */
	static parsePhp(code: string): any {
		if (! Helpers.phpParser) {
			var PhpEngine = require('php-parser');
			Helpers.phpParser = new PhpEngine({
				parser: {
					extractDoc: true,
					php7: true
				},
				ast: {
				  withPositions: true
				}
			});
		}
		try {
			return Helpers.phpParser.parseCode(code);
		} catch (exception) {
			return null;
		}
	}

	/**
	 * Convert php variable defination to javascript variable.
	 * @param code
	 */
	static evalPhp(code: string): any {
		var out = Helpers.parsePhp('<?php ' + code + ';');
		if (out && typeof out.children[0] !== 'undefined') {
			return out.children[0].expression.value;
		}
		return undefined;
	}

	/**
	 * Parse php function call.
	 *
	 * @param text
	 * @param position
	 */
	static parseFunction(text: string, position: number, level: number = 0): any {
		var out:any = null;
		var classes = [];
		for(let i in Helpers.tags) {
			for (let j in Helpers.tags[i].classes) {
				classes.push(Helpers.tags[i].classes[j]);
			}
		}
		var regexPattern = "(((" + classes.join('|') + ")::)?([@A-Za-z0-9_]+))((\\()(([^)(]+|array\\s*\\(([^)(]+|array\\s*\\([^)(]*\\))*\\)))(\\)|$))";
		var functionRegex = new RegExp(regexPattern, "g");
		var paramsRegex = /((\s*\,\s*)?)(\[.*(\]|$)|array\(.*(\)|$)|(\"((\\\")|[^\"])*(\"|$))|(\'((\\\')|[^\'])*(\'|$))|(\s+))/g;
		var inlineFunctionMatch = /\((([\s\S]*\,)?\s*function\s*\(.*\)\s*\{)([\S\s]*)\}/g;

		var match = null;
		var match2 = null;
		if (Helpers.cachedParseFunction !== null && Helpers.cachedParseFunction.text === text && position === Helpers.cachedParseFunction.position) {
			out = Helpers.cachedParseFunction.out;
		} else if (level < 6) {
			while ((match = functionRegex.exec(text)) !== null) {
				if (position >= match.index && position < match.index + match[0].length) {
					if ((match2 = inlineFunctionMatch.exec(match[0])) !== null) {
						out = this.parseFunction(match2[3], position - (match.index + match[1].length + match[6].length + match2[1].length), level + 1);
					} else {
						var textParameters = [];
						var paramIndex = null;
						var paramIndexCounter = 0;
						var paramsPosition = position - (match.index + match[1].length + match[6].length);

						while ((match2 = paramsRegex.exec(match[7])) !== null) {
							textParameters.push(match2[3]);
							if (paramsPosition >= match2.index && paramsPosition <= match2.index + match2[0].length) {
								paramIndex = paramIndexCounter;
							}
							paramIndexCounter++;
						}
						var functionParametrs = [];
						for (let i in textParameters) {
							functionParametrs.push(this.evalPhp(textParameters[i]));
						}
						out = {
							class: match[3],
							function: match[4],
							paramIndex: paramIndex,
							parameters: functionParametrs,
							textParameters: textParameters
						};
					}
					if (level === 0) {
						Helpers.cachedParseFunction = {text, position, out};
					}
				}
			}
		}
		return out;
	}

	static parseDocumentFunction(document: vscode.TextDocument, position: vscode.Position) {
        var pos = document.offsetAt(position);
        return Helpers.parseFunction(document.getText(), pos);
	}
}
