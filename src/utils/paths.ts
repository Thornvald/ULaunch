import type { EngineInfo } from "../types";

export function pathKey(path: string): string {
	return path.replaceAll("/", "\\").toLowerCase();
}

export function uniquePaths(paths: string[]): string[] {
	const seenPaths = new Set<string>();
	return paths.filter((path) => {
		const key = pathKey(path);
		if (seenPaths.has(key)) {
			return false;
		}
		seenPaths.add(key);
		return true;
	});
}

export function uniqueEngines(engines: EngineInfo[]): EngineInfo[] {
	const seenPaths = new Set<string>();
	return engines.filter((engine) => {
		const key = pathKey(engine.path);
		if (seenPaths.has(key)) {
			return false;
		}
		seenPaths.add(key);
		return true;
	});
}

export function engineVersion(path: string): string {
	const parts = path.split(/[\\/]/);
	const versionFolder = parts.find((part) => part.toUpperCase().startsWith("UE_"));
	return versionFolder?.slice(3) || "Custom";
}
