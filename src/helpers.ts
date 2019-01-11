'use strict';

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';

export default class Helpers {

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
	static runPhp(code: string) : string {
		if (fs.existsSync(Helpers.projectPath("vendor/autoload.php")) && fs.existsSync(Helpers.projectPath("bootstrap/app.php"))) {
			var command = "php -r \"define('LARAVEL_START', microtime(true));require_once '" + Helpers.projectPath("vendor/autoload.php") + "'; require_once '" + Helpers.projectPath("bootstrap/app.php") + "';$kernel = $app->make(Illuminate\\Contracts\\Http\\Kernel::class);$response = $kernel->handle(     $request = Illuminate\\Http\\Request::capture() );" + code + "\"";
			return cp.execSync(command).toString();
		}
		return "";
	}
}
