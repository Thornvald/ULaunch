import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { load, type Store } from "@tauri-apps/plugin-store";

import {
	cleanupProjectImages as cleanupProjectImagesCommand,
	detectEngines,
	discardProjectImage as discardProjectImageCommand,
	launchEngine as launchEngineCommand,
	launchProject as launchProjectCommand,
	launchSolution as launchSolutionCommand,
	openProjectFolder as openProjectFolderCommand,
	removeProjectImage as removeProjectImageCommand,
	reportError,
	reportInfo,
	reportWarning,
	scanDirectories,
	setProjectImage as setProjectImageCommand,
} from "../services/ulaunch";
import type { EngineInfo, ProjectInfo } from "../types";
import { engineVersion, pathKey, uniqueEngines, uniquePaths } from "../utils/paths";
import { normalizeCachedProjects } from "../utils/projects";

const STORE_DEFAULTS = {
	projects: [] as ProjectInfo[],
	scanPaths: [] as string[],
	customEngines: [] as EngineInfo[],
	defaultEnginePath: null as string | null,
	projectImages: {} as Record<string, string>,
};

async function persist<T>(store: Store, key: string, value: T): Promise<void> {
	await store.set(key, value);
	await store.save();
}

async function persistValues(store: Store, values: Record<string, unknown>): Promise<void> {
	for (const [key, value] of Object.entries(values)) {
		await store.set(key, value);
	}
	await store.save();
}

export function useULaunchData() {
	const [projects, setProjects] = useState<ProjectInfo[]>([]);
	const [engines, setEngines] = useState<EngineInfo[]>([]);
	const [customEngines, setCustomEngines] = useState<EngineInfo[]>([]);
	const [defaultEnginePath, setDefaultEnginePath] = useState<string | null>(null);
	const [scanPaths, setScanPaths] = useState<string[]>([]);
	const [projectImages, setProjectImages] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [ready, setReady] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [store, setStore] = useState<Store | null>(null);
	const scanRequest = useRef(0);
	const initializationStarted = useRef(false);

	const showError = useCallback(async (context: string, errorValue: unknown) => {
		setErrorMessage(await reportError(context, errorValue));
	}, []);

	const refreshProjects = useCallback(async (paths: string[], projectStore: Store | null = store) => {
		const request = ++scanRequest.current;
		if (paths.length === 0) {
			setProjects([]);
			setErrorMessage(null);
			setLoading(false);
			if (projectStore) {
				try {
					await persist(projectStore, "projects", []);
				} catch (cacheError) {
					await reportWarning(`Could not clear cached projects: ${String(cacheError)}`);
				}
			}
			return;
		}

		setLoading(true);
		try {
			const foundProjects = await scanDirectories(paths);
			if (request !== scanRequest.current) {
				return;
			}
			setProjects(foundProjects);
			setErrorMessage(null);
			if (projectStore) {
				try {
					await persist(projectStore, "projects", foundProjects);
				} catch (cacheError) {
					await reportWarning(`Could not cache discovered projects: ${String(cacheError)}`);
				}
			}
			await reportInfo(`Loaded ${foundProjects.length} project(s)`);
		} catch (errorValue) {
			if (request === scanRequest.current) {
				await showError("Project scan failed", errorValue);
			}
		} finally {
			if (request === scanRequest.current) {
				setLoading(false);
			}
		}
	}, [showError, store]);

	const initialize = useCallback(async () => {
		try {
			const appStore = await load("store.json", { autoSave: false, defaults: STORE_DEFAULTS });
			setStore(appStore);

			const [savedProjects, savedPaths, savedCustomEngines, savedDefaultEngine, savedProjectImages] = await Promise.all([
				appStore.get<unknown>("projects"),
				appStore.get<string[]>("scanPaths"),
				appStore.get<EngineInfo[]>("customEngines"),
				appStore.get<string | null>("defaultEnginePath"),
				appStore.get<Record<string, string>>("projectImages"),
			]);
			const normalizedPaths = uniquePaths(savedPaths ?? []);
			const cachedProjects = normalizedPaths.length > 0
				? normalizeCachedProjects(savedProjects)
				: [];
			const normalizedCustomEngines = uniqueEngines(savedCustomEngines ?? []);
			setProjects(cachedProjects);
			setScanPaths(normalizedPaths);
			setCustomEngines(normalizedCustomEngines);
			setDefaultEnginePath(savedDefaultEngine ?? null);
			setProjectImages(savedProjectImages ?? {});
			setErrorMessage(null);
			setReady(true);
			if (cachedProjects.length > 0) {
				await reportInfo(`Restored ${cachedProjects.length} cached project(s)`);
			}

			const detectedEngines = await detectEngines();
			const normalizedDetectedEngines = uniqueEngines(detectedEngines);
			const availableEngines = uniqueEngines([
				...normalizedDetectedEngines,
				...normalizedCustomEngines,
			]);
			const validDefaultEngine = savedDefaultEngine
				&& availableEngines.some((engine) => pathKey(engine.path) === pathKey(savedDefaultEngine))
				? savedDefaultEngine
				: null;
			if (savedDefaultEngine && !validDefaultEngine) {
				await persist(appStore, "defaultEnginePath", null);
				await reportWarning(`Cleared unavailable default engine '${savedDefaultEngine}'`);
			}
			setDefaultEnginePath(validDefaultEngine);
			setEngines(normalizedDetectedEngines);

			await refreshProjects(normalizedPaths, appStore);
		} catch (errorValue) {
			await showError("Application initialization failed", errorValue);
		} finally {
			setReady(true);
		}
	}, [refreshProjects, showError]);

	useEffect(() => {
		if (initializationStarted.current) {
			return;
		}
		initializationStarted.current = true;
		void initialize();
	}, [initialize]);

	const addScanPaths = useCallback(async (directory: boolean) => {
		if (!store) {
			await showError("Could not save scan path", "Application store is not ready");
			return;
		}

		try {
			const selected = await open({
				multiple: true,
				directory,
				filters: directory ? undefined : [{ name: "Unreal Project", extensions: ["uproject"] }],
			});
			if (!selected) {
				return;
			}
			const selectedPaths = Array.isArray(selected) ? selected : [selected];
			const updatedPaths = uniquePaths([...scanPaths, ...selectedPaths]);
			await persist(store, "scanPaths", updatedPaths);
			setScanPaths(updatedPaths);
			await refreshProjects(updatedPaths);
		} catch (errorValue) {
			await showError("Could not add project path", errorValue);
		}
	}, [refreshProjects, scanPaths, showError, store]);

	const addCustomEngine = useCallback(async () => {
		if (!store) {
			await showError("Could not save engine", "Application store is not ready");
			return;
		}

		try {
			const selected = await open({
				multiple: false,
				filters: [{ name: "Unreal Editor", extensions: ["exe"] }],
			});
			if (!selected || typeof selected !== "string") {
				return;
			}
			if (selected.split(/[\\/]/).at(-1)?.toLowerCase() !== "unrealeditor.exe") {
				await reportWarning(`Rejected custom engine path '${selected}'`);
				throw new Error("Select UnrealEditor.exe from Engine/Binaries/Win64");
			}

			const updatedEngines = uniqueEngines([
				...customEngines,
				{ version: engineVersion(selected), path: selected },
			]);
			await persist(store, "customEngines", updatedEngines);
			setCustomEngines(updatedEngines);
			setErrorMessage(null);
		} catch (errorValue) {
			await showError("Could not add custom engine", errorValue);
		}
	}, [customEngines, showError, store]);

	const removeCustomEngine = useCallback(async (path: string) => {
		if (!store) {
			return;
		}
		try {
			const updatedEngines = customEngines.filter((engine) => pathKey(engine.path) !== pathKey(path));
			const removesDefaultEngine = Boolean(
				defaultEnginePath && pathKey(defaultEnginePath) === pathKey(path),
			);
			await persistValues(store, {
				customEngines: updatedEngines,
				...(removesDefaultEngine ? { defaultEnginePath: null } : {}),
			});
			setCustomEngines(updatedEngines);
			if (removesDefaultEngine) {
				setDefaultEnginePath(null);
			}
		} catch (errorValue) {
			await showError("Could not remove custom engine", errorValue);
		}
	}, [customEngines, defaultEnginePath, showError, store]);

	const setDefaultEngine = useCallback(async (path: string | null) => {
		if (!store) {
			return;
		}
		try {
			await persist(store, "defaultEnginePath", path);
			setDefaultEnginePath(path);
			setErrorMessage(null);
		} catch (errorValue) {
			await showError("Could not save default engine", errorValue);
		}
	}, [showError, store]);

	const setProjectImage = useCallback(async (projectPath: string) => {
		if (!store) {
			await showError("Could not save project image", "Application store is not ready");
			return;
		}

		try {
			const selected = await open({
				multiple: false,
				filters: [{ name: "Project Image", extensions: ["png", "jpg", "jpeg", "webp"] }],
			});
			if (!selected || typeof selected !== "string") {
				return;
			}
			const imageKey = pathKey(projectPath);
			const previousImagePath = projectImages[imageKey];
			const managedImagePath = await setProjectImageCommand(projectPath, selected);
			const updatedImages = {
				...projectImages,
				[imageKey]: managedImagePath,
			};
			try {
				await persist(store, "projectImages", updatedImages);
			} catch (storeError) {
				if (!previousImagePath || pathKey(previousImagePath) !== pathKey(managedImagePath)) {
					try {
						await discardProjectImageCommand(managedImagePath);
					} catch (cleanupError) {
						await reportWarning(`Could not roll back unsaved project image: ${String(cleanupError)}`);
					}
				}
				throw storeError;
			}
			setProjectImages(updatedImages);
			setErrorMessage(null);
			await reportInfo("Custom project image saved");
			try {
				await cleanupProjectImagesCommand(projectPath, managedImagePath);
			} catch (cleanupError) {
				await reportWarning(`Could not remove an old project image: ${String(cleanupError)}`);
			}
		} catch (errorValue) {
			await showError("Could not save project image", errorValue);
		}
	}, [projectImages, showError, store]);

	const resetProjectImage = useCallback(async (projectPath: string) => {
		if (!store) {
			return;
		}

		try {
			const updatedImages = { ...projectImages };
			delete updatedImages[pathKey(projectPath)];
			await persist(store, "projectImages", updatedImages);
			setProjectImages(updatedImages);
			setErrorMessage(null);
			try {
				await removeProjectImageCommand(projectPath);
			} catch (cleanupError) {
				await reportWarning(`Could not remove the unused project image file: ${String(cleanupError)}`);
			}
			await reportInfo("Custom project image removed");
		} catch (errorValue) {
			await showError("Could not reset project image", errorValue);
		}
	}, [projectImages, showError, store]);

	const removeScanPath = useCallback(async (path: string) => {
		if (!store) {
			return;
		}
		try {
			const updatedPaths = scanPaths.filter((scanPath) => pathKey(scanPath) !== pathKey(path));
			await persist(store, "scanPaths", updatedPaths);
			setScanPaths(updatedPaths);
			await refreshProjects(updatedPaths);
		} catch (errorValue) {
			await showError("Could not remove project path", errorValue);
		}
	}, [refreshProjects, scanPaths, showError, store]);

	const runProjectAction = useCallback(async (
		context: string,
		action: () => Promise<void>,
	) => {
		try {
			await action();
			setErrorMessage(null);
			await reportInfo(context);
		} catch (errorValue) {
			await showError(context, errorValue);
		}
	}, [showError]);

	const allEngines = useMemo(() => uniqueEngines([...engines, ...customEngines]), [customEngines, engines]);
	const customEnginePaths = useMemo(
		() => new Set(customEngines.map((engine) => pathKey(engine.path))),
		[customEngines],
	);

	return {
		projects,
		projectImages,
		allEngines,
		customEnginePaths,
		defaultEnginePath,
		scanPaths,
		loading,
		ready,
		errorMessage,
		clearError: () => setErrorMessage(null),
		reportFailure: showError,
		addFolder: () => addScanPaths(true),
		addProject: () => addScanPaths(false),
		addCustomEngine,
		removeCustomEngine,
		setDefaultEngine,
		removeScanPath,
		setProjectImage,
		resetProjectImage,
		refreshProjects: () => refreshProjects(scanPaths),
		refreshAll: initialize,
		launchProject: (path: string) => runProjectAction(
			"Project launch requested",
			() => launchProjectCommand(path, defaultEnginePath),
		),
		launchSolution: (path: string) => runProjectAction(
			"Solution launch requested",
			() => launchSolutionCommand(path),
		),
		launchEngine: (path: string) => runProjectAction(
			"Engine launch requested",
			() => launchEngineCommand(path),
		),
		openProjectFolder: (path: string) => runProjectAction(
			"Project folder opened",
			() => openProjectFolderCommand(path),
		),
	};
}
