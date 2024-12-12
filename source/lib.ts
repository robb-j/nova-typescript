//
// Utility files to help out and make code more readable
//

import type { Range as LSPRange } from "vscode-languageserver-protocol";

export type ProcessParams = ConstructorParameters<typeof Process>;
export type ProcessOutput = { stdout: string; stderr: string; status: number };

export const ISSUES_URL = "https://github.com/robb-j/nova-typescript/issues";
export const REQUIREMENTS_URL =
	"https://github.com/robb-j/nova-typescript/tree/main/TypeScript.novaextension#requirements";

/**
 * Run a non-interactive process and get the stdout, stderr & status in one go
 * @param {ProcessParams[0]} path The path to the binary to run
 * @param {ProcessParams[1]} options How to run the process
 * @returns A promise of a ProcessOutput
 */
export function execute(
	path: ProcessParams[0],
	options: ProcessParams[1] = {},
): Promise<ProcessOutput> {
	return new Promise<ProcessOutput>((resolve) => {
		const process = new Process(path, options);

		// Copy all stdout into an array of lines
		const stdout: string[] = [];
		process.onStdout((line) => stdout.push(line));

		// Copy all stderr into an array of lines
		const stderr: string[] = [];
		process.onStderr((line) => stderr.push(line));

		// Resolve the promise once the process has exited,
		// with the stdout and stderr as single strings and the status code number
		process.onDidExit((status) =>
			resolve({
				status,
				stderr: stderr.join("\n"),
				stdout: stdout.join("\n"),
			}),
		);

		// Start the process
		process.start();
	});
}

/**
 * Generate a method for namespaced debug-only logging,
 * inspired by https://github.com/visionmedia/debug.
 *
 * - prints messages under a namespace
 * - only outputs logs when nova.inDevMode()
 * - converts object arguments to json
 */
export function createDebug(namespace: string) {
	return (...args: any[]) => {
		if (!nova.inDevMode()) return;

		const humanArgs = args.map((arg) =>
			typeof arg === "object" ? JSON.stringify(arg) : arg,
		);
		console.info(`${namespace}:`, ...humanArgs);
	};
}

/** Find the full path of a binary */
export async function findBinaryPath(binary: string): Promise<string | null> {
	const { stdout, status } = await execute("which", {
		args: [binary],
		shell: true,
	});
	return status === 0 ? stdout.trim() : null;
}

/**
 * Output put a potentially unknown error
 */
export function logError(message: string, error: unknown) {
	console.error(message);

	if (error instanceof Error) {
		console.error(error.message);
		console.error(error.stack);
	} else {
		console.error("An non-error was thrown");
		console.error(error);
	}
}

/**
 * Based on
 * https://github.com/apexskier/nova-typescript/blob/2d4c1d8e61ca4afba6ee9ad1977a765e8cd0f037/src/lspNovaConversions.ts#L29
 */
/** Convert an LSP Range (line + column) to a Nova one (string offset) */
export function getEditorRange(document: TextDocument, range: LSPRange): Range {
	const text = document.getTextInRange(new Range(0, document.length));

	const lines = text.split(document.eol);
	const result = new Range(0, 0);
	let n = 0;

	for (const [index, line] of lines.entries()) {
		if (index === range.start.line) {
			result.start = n + range.start.character;
		}
		if (index === range.end.line) {
			result.end = n + range.end.character;
			return result;
		}
		n += line.length + document.eol.length;
	}

	throw new Error("LSP Range is out of TextDocument range");
}

/**
	Convert a range from Nova (text offsets) to LSP line-columns
 */
export function getLSPRange(document: TextDocument, range: Range) {
	const text = document.getTextInRange(new Range(0, document.length));

	const lines = text.split(document.eol);
	const result: LSPRange = {
		start: { line: 0, character: 0 },
		end: { line: 0, character: 0 },
	};
	let n = 0;

	for (const [index, line] of lines.entries()) {
		const lineLength = line.length + document.eol.length;
		if (range.start < n + lineLength) {
			result.start.line = index;
			result.start.character = range.start - n;
		}
		if (range.end < n + lineLength) {
			result.end.line = index;
			result.end.character = range.end - n;
			return result;
		}
		n += lineLength;
	}
	throw new Error("TextDocument range is out of LSP Range");
}

export function getPackageDir() {
	return nova.inDevMode()
		? nova.extension.path
		: nova.extension.globalStoragePath;
}

export function findCompiller() {
	const filename = "node_modules/typescript/bin/tsc";

	if (nova.workspace.path) {
		const local = nova.path.join(nova.workspace.path, filename);
		if (nova.fs.access(local, nova.fs.X_OK)) {
			return local;
		}
	}

	return nova.path.join(getPackageDir(), filename);
}
