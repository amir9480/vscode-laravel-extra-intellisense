'use strict';

import * as vscode from 'vscode';


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
}
