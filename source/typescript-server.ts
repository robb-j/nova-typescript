import {
	createDebug,
	findBinaryPath,
	getPackageDir,
	ISSUES_URL,
	logError,
	REQUIREMENTS_URL,
} from "./lib.js";

const debug = createDebug("language-server");

const DEBUG_INSPECT = nova.inDevMode() && false;

// Log stdin and stdout of the server to local files
const DEBUG_LOGS = nova.inDevMode() && false;

export class TypeScriptServer {
	client?: LanguageClient;

	get isRunning() {
		return Boolean(this.client);
	}

	deactivate() {
		debug("#deactivate");
		this.stop();
	}

	async start() {
		try {
			debug("#start");

			const packageDir = getPackageDir();
			const nodePath = await this.getNodeJsPath();
			if (!nodePath) return;

			if (this.client) this.stop();

			const installed = await this.install(packageDir);
			if (!installed) return;

			const serverOptions = this.getServerOptions(
				nodePath,
				packageDir,
				DEBUG_LOGS ? nova.workspace.path : null,
			);
			const clientOptions = {
				syntaxes: ["typescript", "tsx", "cts", "mts", "javascript", "jsx"],
			};

			debug("serverOptions", serverOptions);
			debug("clientOptions", clientOptions);

			const client = new LanguageClient(
				"robb-j.typescript",
				"TypeScript Server",
				serverOptions,
				clientOptions,
			);

			nova.subscriptions.add(client as any);
			this.client = client;

			client.onDidStop((err) => {
				debug("client.onDidStop", err?.message);
			});

			client.start();
		} catch (error) {
			logError("LanguageServer Failed", error);
		}
	}

	stop() {
		debug("#stop");

		if (this.client) {
			this.client.stop();
			nova.subscriptions.remove(this.client as any);
			this.client = undefined;
		}
	}

	//
	// Internal
	//

	async install(installDir: string): Promise<boolean> {
		// Extension developers should manually install dependencies
		if (nova.inDevMode()) return true;

		debug("#installPackages", installDir);

		const proc = new Process("/usr/bin/env", {
			args: ["npm", "install", "--no-audit", "--omit=dev"],
			cwd: installDir,
		});
		proc.onStdout((line) => debug("npm install: " + line));
		proc.onStderr((line) => console.error("ERROR(npm install): " + line));
		proc.start();

		const success = await new Promise<boolean>((resolve) => {
			proc.onDidExit((status) => resolve(status === 0));
		});

		if (success) return true;

		const msg = new NotificationRequest("npm-install-failed");
		msg.title = nova.localize("npm-install-failed-title");
		msg.body = nova.localize("npm-install-failed-body");
		msg.actions = [nova.localize("ok"), nova.localize("submit-bug")];

		const response = await nova.notifications
			.add(msg)
			.catch((error) => logError("Notification failed", error));

		if (response?.actionIdx === 1) {
			nova.openURL(ISSUES_URL);
		}

		return false;
	}

	async getNodeJsPath(): Promise<string | null> {
		const nodePath = await findBinaryPath("node");
		debug("node=" + nodePath);

		if (nodePath) return nodePath;

		const msg = new NotificationRequest("node-js-not-found");
		msg.title = nova.localize("node-not-found-title");
		msg.body = nova.localize("node-not-found-body");
		msg.actions = [nova.localize("ok"), nova.localize("open-readme")];

		const response = await nova.notifications
			.add(msg)
			.catch((error) => logError("Notification failed", error));

		if (response?.actionIdx === 1) {
			nova.openURL(REQUIREMENTS_URL);
		}

		return null;
	}

	getServerOptions(
		nodePath: string,
		packageDir: string,
		debugPath: string | null,
	): ServerOptions {
		// const nodeArgs = ["--unhandled-rejections=warn", "--trace-warnings"];
		const nodeArgs = [];

		const serverPath = nova.path.join(
			packageDir,
			"node_modules/typescript-language-server/lib/cli.mjs",
		);

		if (DEBUG_INSPECT) {
			nodeArgs.push("--inspect-brk=9231", "--trace-warnings");
		}

		if (debugPath) {
			const stdinLog = nova.path.join(debugPath, "stdin.log");
			const stdoutLog = nova.path.join(debugPath, "stdout.log");

			const args = nodeArgs.join(" ");
			const command = `${nodePath} ${args} "${serverPath}" --stdio`;

			return {
				type: "stdio",
				path: "/bin/sh",
				args: ["-c", `tee "${stdinLog}" | ${command} | tee "${stdoutLog}"`],
			};
		}

		return {
			type: "stdio",
			path: nodePath,
			args: [...nodeArgs, serverPath, "--stdio"],
		};
	}
}