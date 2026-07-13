import type { ProjectInfo } from "../types";
import { pathKey } from "./paths";

function isProjectInfo(value: unknown): value is ProjectInfo {
	if (!value || typeof value !== "object") {
		return false;
	}

	const project = value as Record<string, unknown>;
	return typeof project.name === "string"
		&& project.name.length > 0
		&& typeof project.path === "string"
		&& project.path.length > 0
		&& project.path.toLowerCase().endsWith(".uproject")
		&& (project.screenshot_path === null || typeof project.screenshot_path === "string")
		&& (project.sln_path === null || typeof project.sln_path === "string");
}

export function normalizeCachedProjects(value: unknown): ProjectInfo[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const seenPaths = new Set<string>();
	return value.filter((project): project is ProjectInfo => {
		if (!isProjectInfo(project)) {
			return false;
		}
		const key = pathKey(project.path);
		if (seenPaths.has(key)) {
			return false;
		}
		seenPaths.add(key);
		return true;
	});
}
