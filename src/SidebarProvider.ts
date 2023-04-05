import * as vscode from "vscode";
import { TimerManager } from "./timer";

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
    manager: TimerManager
    _initF:Function

    constructor(private readonly _extensionUri: vscode.Uri, manager: TimerManager, initFunc: Function) {
        this.manager = manager;
        this._initF = initFunc
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;


        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            // localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "onRefresh": {
                    if (data.index < 0) {
                        return;
                    }
                    webviewView.webview.postMessage({
                        type: "current",
                        value: this.manager.GetTime(data.index),
                    });
                    break;
                }
                case "onPlay": {
                    if (data.index < 0) {
                        return;
                    }
                    this.manager.StartTimer(data.index)
                    break;
                }
                case "onPause": {
                    if (data.index < 0) {
                        return;
                    }
                    this.manager.StopTimer(data.index)
                    break;
                }
                case "onTimeUpdate": {
                    if (data.value == undefined) {
                        return;
                    }
                    this.manager.SetTime(data.index, data.value)
                    break;
                }
                case "onDurationUpdate": {
                    if (data.value == undefined) {
                        return;
                    }
                    this.manager.SetDuration(data.index, data.value)
                    break;
                }
                case "onStampSelect": {
                    if (data.value == undefined) {
                        return;
                    }
                    const stamp = this.manager.GetStamp(data.index, data.value)
                    const editor = vscode.window.activeTextEditor;

                    const pos = new vscode.Position(stamp.line, 0)
                    const range = new vscode.Range(pos, pos)
                    if (editor) {
                        editor.selection = new vscode.Selection(range.start, range.end)
                        editor.revealRange(range)
                    }
                    break;
                }
                case "onInfo": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case "onError": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });
        
        this._initF(vscode.window.activeTextEditor, this)
    }

    public updatePanel(timerIndex: number, full: boolean = true) {
        const data = this.manager.GetTimer(timerIndex)
        this._view?.webview.postMessage({
            type: "reset",
            value: full
        });
        if (full) {
            let rootPath = vscode.workspace.workspaceFolders?.[0].uri;
            const f = vscode.Uri.parse(rootPath + "/" + data.file);
            
            this._view?.webview.postMessage({
                type: "file",
                value: data.file ? this._view?.webview.asWebviewUri(f).toString() : "",
            });
            this._view?.webview.postMessage({
                type: "current",
                value: this.manager.GetTime(timerIndex),
            });
            this._view?.webview.postMessage({
                type: "playState",
                value: this.manager.IsPaused(timerIndex),
            });
            this._view?.webview.postMessage({
                type: "index",
                value: timerIndex,
            });
        }
        this._view?.webview.postMessage({
            type: "title",
            value: data.title,
        });
        this._view?.webview.postMessage({
            type: "duration",
            value: data.duration,
        });
        this._view?.webview.postMessage({
            type: "stamps",
            value: data.stamps,
        });
        
    }

    public revive(panel: vscode.WebviewView) {
        this._view = panel;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
        );
        const styleVSCodeUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
        );
        const wavUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'example.wav'));

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "dist", "compiled/sidebar.js")
        );
        const styleMainUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "dist", "compiled/sidebar.css")
        );

        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; media-src ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
			</head>
      <body>
      </body>
      <script nonce="${nonce}" src="${scriptUri}"></script>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}