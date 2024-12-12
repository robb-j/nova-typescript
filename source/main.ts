import type * as lsp from "vscode-languageserver-protocol";
import { createDebug, getLSPRange, logError } from "./lib.js";
import { TypeScriptTasks } from "./tasks.js";
import { TypeScriptServer } from "./typescript-server.js";

const debug = createDebug("main");
let server: TypeScriptServer | null = null;

export function activate() {
	debug("#activate");

	server = new TypeScriptServer();

	nova.workspace.config.observe("robb-j.typescript.enabled", (value) => {
		debug("@enabled", value);
		(nova.workspace as any).context.set("enabled", value);
		if (!server) return;
		if (value && !server.isRunning) server.start();
		if (!value && server.isRunning) server.stop();
	});
}

export function deactivate() {
	debug("#deactivate");

	if (server) {
		server.deactivate();
		server = null;
	}
}

nova.commands.register("robb-j.typescript.restart", () => {
	debug("@restart");
	if (!server) return;
	server.stop();
	server.start();
});

nova.commands.register("robb-j.typescript.init", () => {
	nova.workspace.config.set("robb-j.typescript.enabled", true);
});

nova.commands.register(
	"robb-j.typescript.organiseImports",
	async (editor: TextEditor) => {
		debug("@organiseImports");
		if (!server?.client) return;

		await server.client.sendRequest("workspace/executeCommand", {
			command: "_typescript.organizeImports",
			arguments: [editor.document.path, { skipDestructiveCodeActions: false }],
		});

		editor.selectedRange = new Range(0, 0);
		editor.scrollToCursorPosition();
	},
);

nova.commands.register(
	"robb-j.typescript.rename",
	async (editor: TextEditor) => {
		try {
			debug("@rename");
			if (!server?.client) return;

			const position = getLSPRange(editor.document, editor.selectedRange).start;

			editor.selectWordsContainingCursors();

			const newName = await new Promise<string | null>((resolve) => {
				nova.workspace.showInputPalette(
					nova.localize("rename-message"),
					{ placeholder: editor.selectedText, value: editor.selectedText },
					resolve,
				);
			});

			if (!newName) return;

			// Run the rename and get the workspace edit
			const response = await server.client.sendRequest("textDocument/rename", {
				textDocument: { uri: editor.document.uri },
				position,
				newName,
			} satisfies lsp.RenameParams);

			// Run the workspace edit
			await server.client.sendRequest("workspace/executeCommand", {
				command: "_typescript.applyWorkspaceEdit",
				arguments: [response],
			});
		} catch (error) {
			logError("ERROR", error);
		}
	},
);

nova.commands.register("robb-j.typescript.clean", async () => {
	if (!nova.workspace.path) return;

	const tsconfig = nova.path.join(nova.workspace.path, "tsconfig.json");
	if (!nova.fs.access(tsconfig, nova.fs.R_OK)) return;

	const file = nova.fs.open(tsconfig, "r") as FileTextMode;
	const data = JSON.parse(file.read() ?? "{}");
	file.close();

	if (data?.compilerOptions?.outDir) {
		console.log("rm", data.compilerOptions.outDir);
		nova.fs.rmdir(
			nova.path.join(nova.workspace.path, data.compilerOptions.outDir),
		);
	}
});

nova.assistants.registerTaskAssistant(new TypeScriptTasks(), {
	identifier: "robb-j.typescript",
	name: "Compile",
});
