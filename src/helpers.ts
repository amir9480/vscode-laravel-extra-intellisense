'use strict';

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

export default class Helpers {

	static wordMatchRegex = /[\w\d\-_\.\:]+/g;

	/**
	 * Create full path from project file name
	 *
	 * @param path
	 * @param string
	 */
	static projectPath(path:string) : string {
		if (path[0] != '/') {
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
	static runLaravel(code: string) : string {
		if (fs.existsSync(Helpers.projectPath("vendor/autoload.php")) && fs.existsSync(Helpers.projectPath("bootstrap/app.php"))) {
			var command = "define('LARAVEL_START', microtime(true));require_once '" + Helpers.projectPath("vendor/autoload.php") + "'; require_once '" + Helpers.projectPath("bootstrap/app.php") + "';$kernel = $app->make(Illuminate\\Contracts\\Http\\Kernel::class);$response = $kernel->handle($request = Illuminate\\Http\\Request::capture());" + code;
			return this.runPhp(command);
		}
		return "";
	}

	/**
	 * run simple php code.
	 *
	 * @param code
	 */
	static runPhp(code: string) : string {
		code = code.replace(/\"/g, "\\\"");
		if (['linux', 'openbsd', 'sunos', 'darwin'].some(unixPlatforms => os.platform().includes(unixPlatforms))) {
			code = code.replace(/\$/g, "\\$");
		}
		var command = "php -r \"" + code + "\"";
		return cp.execSync(command).toString();
	}

	/**
	 * Parse php function call.
	 *
	 * @param text
	 * @param position
	 */
	static parseFunction(text: string, position: number): any {
		var funcsRegex = /((([A-Za-z0-9_]+)::)?([@A-Za-z0-9_]+)\()((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*)\)/g;
		var paramsRegex = /((\s*\,\s*)?)(\[.*\]|array\(.*\)|(\"((\\\")|[^\"])*\")|(\'((\\\')|[^\'])*\'))/g;
		var inlineFunctionMatch = /\((([\s\S]*\,)?\s*function\s*\(.*\)\s*\{)([\S\s]*)\}/g;

		var match = null;
		var match2 = null;

		while ((match = funcsRegex.exec(text)) !== null) {
			if (position >= match.index && position < match.index + match[0].length) {
				if (match2 = inlineFunctionMatch.exec(match[0])) {
					return this.parseFunction(match2[3], position - (match.index + match[1].length + match2[1].length));
				} else {
					var textParameters = [];
					var paramIndex = null;
					var paramIndexCounter = 0;
					var paramsPosition = position - (match.index + match[1].length);
					while ((match2 = paramsRegex.exec(match[5])) !== null) {
						textParameters.push(match2[3]);
						if (paramsPosition >= match2.index && paramsPosition < match2.index + match2[0].length) {
							paramIndex = paramIndexCounter;
						}
						paramIndexCounter++;
					}
					var functionParametrs = [];
					for (var i in textParameters) {
						functionParametrs.push(JSON.parse(this.runPhp("echo json_encode(" + textParameters[i] + ");")));
					}
					return {
						'class': match[3],
						'function': match[4],
						'paramIndex': paramIndex,
						'parameters': functionParametrs,
						'textParameters': textParameters
					};
				}
			}
		}
		return null;
	}
}
