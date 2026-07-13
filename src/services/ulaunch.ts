import { invoke } from "@tauri-apps/api/core";
import { error, info, warn } from "@tauri-apps/plugin-log";

import type { EngineInfo, ProjectInfo } from "../types";

const MAX_CONCURRENT_IMAGE_READS = 4;
let activeImageReads = 0;
const pendingImageReads: Array<() => void> = [];

function runNextImageRead(): void {
	const nextImageRead = pendingImageReads.shift();
	if (nextImageRead) {
		nextImageRead();
	}
}

function withImageReadSlot<T>(operation: () => Promise<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const run = () => {
			activeImageReads += 1;
			void operation()
				.then(resolve, reject)
				.finally(() => {
					activeImageReads -= 1;
					runNextImageRead();
				});
		};

		if (activeImageReads < MAX_CONCURRENT_IMAGE_READS) {
			run();
			return;
		}
		pendingImageReads.push(run);
	});
}

function errorMessage(errorValue: unknown): string {
	if (errorValue instanceof Error) {
		return errorValue.message;
	}
	if (typeof errorValue === "string") {
		return errorValue;
	}
	return "Unknown error";
}

async function writeLog(
	logger: (message: string) => Promise<void>,
	fallback: (message: string) => void,
	message: string,
): Promise<void> {
	try {
		await logger(message);
	} catch {
		fallback(message);
	}
}

export async function reportError(context: string, errorValue: unknown): Promise<string> {
	const message = `${context}: ${errorMessage(errorValue)}`;
	await writeLog(error, console.error, message);
	return message;
}

export async function reportInfo(message: string): Promise<void> {
	await writeLog(info, console.info, message);
}

export async function reportWarning(message: string): Promise<void> {
	await writeLog(warn, console.warn, message);
}

export function scanDirectories(paths: string[]): Promise<ProjectInfo[]> {
	return invoke<ProjectInfo[]>("scan_directories", { paths });
}

export function detectEngines(): Promise<EngineInfo[]> {
	return invoke<EngineInfo[]>("detect_engines");
}

export function launchProject(path: string, enginePath: string | null): Promise<void> {
	return invoke("launch_uproject", { path, enginePath });
}

export function launchSolution(path: string): Promise<void> {
	return invoke("launch_sln", { path });
}

export function launchEngine(path: string): Promise<void> {
	return invoke("launch_engine", { path });
}

export function openProjectFolder(path: string): Promise<void> {
	return invoke("open_in_explorer", { path });
}

export async function loadProjectImage(path: string): Promise<string> {
	const bytes = await withImageReadSlot(() => invoke<ArrayBuffer>("read_project_image", { path }));
	const extension = path.split(".").at(-1)?.toLowerCase();
	const mimeType = extension === "jpg" || extension === "jpeg"
		? "image/jpeg"
		: extension === "webp"
			? "image/webp"
			: "image/png";
	return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export function setProjectImage(projectPath: string, imagePath: string): Promise<string> {
	return invoke<string>("set_project_image", { projectPath, imagePath });
}

export function removeProjectImage(projectPath: string): Promise<void> {
	return invoke("remove_project_image", { projectPath });
}

export function discardProjectImage(imagePath: string): Promise<void> {
	return invoke("discard_project_image", { imagePath });
}

export function cleanupProjectImages(projectPath: string, keptImagePath: string): Promise<void> {
	return invoke("cleanup_project_images", { projectPath, keptImagePath });
}
