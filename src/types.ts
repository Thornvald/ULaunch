export interface ProjectInfo {
	name: string;
	path: string;
	screenshot_path: string | null;
	sln_path: string | null;
}

export interface EngineInfo {
	version: string;
	path: string;
}

export type ActiveTab = "projects" | "engines" | "paths";
