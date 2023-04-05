// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SidebarProvider } from "./SidebarProvider";
import { TimerManager, Stamp } from './timer';

type GenericObject = { [key: string]: any };
const parseMarkdown = require('front-matter-markdown')
var md = require('markdown-it')()

function prepareMarkdownIt(md: any) {
	return md.use(require('markdown-it-directive')).use(require('markdown-it-directive-webcomponents'), {
		components: [
			{
				present: 'both',
				name: 'lec-timer',
				tag: 'timer',
				allowedAttrs: ['time', 'id', 'preview', 'type'],
				parseInner: true
			},
		]
	})
}

const timerManager = new TimerManager()
let files: Map<vscode.TextDocument, number>

function findTimeStamps(nodes: any[], timeStamps: GenericObject[]) {
	nodes?.forEach(token => {
		if (token.type == "component_open" && token.tag == "timer") {
			let stamp: GenericObject = {}
			token.attrs.forEach((attr: string[]) => {
				const key = attr[0]
				const value = attr[1]
				stamp[key] = value
			});
			timeStamps.push(stamp)
		}
		timeStamps = findTimeStamps(token.children, timeStamps)
	});
	return timeStamps
}

function updateTimeStampsPosition(document: vscode.TextDocument, timeStamps: Stamp[]) {
	let stampIndex = 0
	for (let i = 0; i < document.lineCount; i++) {
		const line = document.lineAt(i);
		if (!line.isEmptyOrWhitespace) {
			const re = new RegExp(':lec-timer.+}').exec(line.text)
			const l = re ? re.length : 0
			for (let rIndex = 0; rIndex < l; rIndex++) {
				timeStamps[stampIndex + rIndex].line = line.lineNumber
			}
			stampIndex += l
		}
	}
	return timeStamps
}

function updateManagerState(e: vscode.TextEditor|undefined, sidebarProvider: any) {
	if (e?.document.languageId == "markdown") {
		let data = parseMarkdown(e?.document.getText()).lecture
		if (data) {
			if (!files.has(e.document)) {
				data.stamps = findTimeStamps(md.parse(e?.document.getText(), {}), [])
				data.stamps = updateTimeStampsPosition(e.document, data.stamps)
				files.set(e.document, timerManager.AddTimer(data))
			};
			const timerIndex = files.get(e.document)
			if (timerIndex != undefined) {
				sidebarProvider.updatePanel(timerIndex)
			}
		}
	}
}

function toTime(timeInSeconds: number): string {
	if (timeInSeconds < 0) {
		return "--:--:--";
	}
	const hours = Math.floor(timeInSeconds / (60 * 60));
	const pHours = (hours < 10 ? "0" : "") + hours.toString();
	const minutes = Math.floor(timeInSeconds / 60);
	const pMinutes = (minutes < 10 ? "0" : "") + minutes.toString();
	const seconds = Math.floor(timeInSeconds - minutes * 60);
	const pSeconds = (seconds < 10 ? "0" : "") + seconds.toString();

	return pHours + ":" + pMinutes + ":" + pSeconds;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	files = new Map();
	md = prepareMarkdownIt(md)
	const sidebarProvider = new SidebarProvider(context.extensionUri, timerManager, updateManagerState);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('lecture-timer.stampMarker', () => {
		const editor = vscode.window.activeTextEditor;

		editor?.edit((editBuilder: vscode.TextEditorEdit) => {
			const timerIndex = files.get(editor.document)

			if (timerIndex != undefined) {
				const currentTime = timerManager.GetTime(timerIndex)

				timerManager.AddStamp(timerIndex, currentTime, editor.selection.start.line)
				sidebarProvider.updatePanel(timerIndex)

				let output: string;
				const name = "lec-timer";
				const tsData = `{time="${currentTime}" preview="${toTime(currentTime)}"`;
				const content = editor.document.getText(editor.selection);
				if (editor.selection.isEmpty) {
					output = `:${name}${tsData} type="alone"}`;
				} else if (editor.selection.isSingleLine) {
					output = `:${name}[${content}]${tsData} type="inline"}`;
				} else {
					output = `:::${name}${tsData} type="block"}\n${content}\n:::`;
				}
				editBuilder.replace(editor.selection, output);
			}
		});
	}));

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("lecture-timer-sidebar", sidebarProvider)
	);

	vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
		if (e) {
			const timerIndex = files.get(e)
			if (timerIndex != undefined) {
				let data = parseMarkdown(e.getText()).lecture
				const timer = timerManager.GetTimer(timerIndex)
				var fullReset = false
				if (data.title != timer.title) {
					timerManager.SetTitle(timerIndex, data.title)
					fullReset = true
				}
				if (data.file != timer.file) {
					timerManager.SetFile(timerIndex, data.file)
					timerManager.SetTime(timerIndex, 0)
					timerManager.StopTimer(timerIndex)
					fullReset = true
				}
				if (data.duration != timer.duration) {
					timerManager.SetDuration(timerIndex, +data.duration)
					fullReset = true
				}
				const stamps: any = findTimeStamps(md.parse(e.getText(), {}), [])
				timerManager.SetStamps(timerIndex, updateTimeStampsPosition(e, stamps))
				sidebarProvider.updatePanel(timerIndex, fullReset)
			}
		}
	})

	vscode.window.onDidChangeActiveTextEditor(async (e: vscode.TextEditor | undefined) => {
		updateManagerState(e,sidebarProvider)
	})

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "lecture-timer" is now active!');

	return {
		extendMarkdownIt: prepareMarkdownIt
	};
}

// This method is called when your extension is deactivated
export function deactivate() { }
