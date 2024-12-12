import { findCompiller } from "./lib.js";

export class TypeScriptTasks implements TaskAssistant {
	provideTasks(): AssistantArray<Task> {
		const task = new Task("TypeScript");
		task.setAction(Task.Build, new TaskResolvableAction());
		task.setAction(Task.Run, new TaskResolvableAction());
		task.setAction(Task.Clean, new TaskResolvableAction());
		return [task];
	}

	async resolveTaskAction(
		context: TaskActionResolveContext<any>,
	): Promise<ResolvedTaskAction> {
		const tsc = findCompiller();

		if (context.action === Task.Build) {
			return new TaskProcessAction(tsc, {
				matchers: ["tsc-issue"],
			});
		}
		if (context.action === Task.Run) {
			return new TaskProcessAction(tsc, {
				args: ["--watch"],
				matchers: ["tsc-issue"],
			});
		}
		if (context.action === Task.Clean) {
			return new TaskCommandAction("robb-j.typescript.clean");
		}

		throw new Error("Method not implemented.");
	}
}
