import { useEffect, useMemo, useState } from "react";
import { Code, FolderOpen, FolderPlus, ImageOff, ImagePlus, Play } from "lucide-react";

import { loadProjectImage, reportWarning } from "../services/ulaunch";
import type { ProjectInfo } from "../types";
import { pathKey } from "../utils/paths";

interface ProjectsViewProps {
	projects: ProjectInfo[];
	loading: boolean;
	projectImages: Record<string, string>;
	onLaunchProject: (path: string) => Promise<void>;
	onLaunchSolution: (path: string) => Promise<void>;
	onOpenFolder: (path: string) => Promise<void>;
	onResetProjectImage: (path: string) => Promise<void>;
	onSetProjectImage: (path: string) => Promise<void>;
}

interface ProjectScreenshotProps {
	project: ProjectInfo;
	customImagePath: string | null;
}

function ProjectScreenshot({ project, customImagePath }: ProjectScreenshotProps) {
	const imagePaths = useMemo(
		() => [customImagePath, project.screenshot_path].filter(
			(path, index, paths): path is string => Boolean(path) && paths.indexOf(path) === index,
		),
		[customImagePath, project.screenshot_path],
	);
	const imageKey = imagePaths.join("\0");
	const [imageRetry, setImageRetry] = useState({ key: "", startIndex: 0 });
	const [screenshot, setScreenshot] = useState<{ index: number; url: string } | null>(null);

	useEffect(() => {
		if (imagePaths.length === 0) {
			setScreenshot(null);
			return;
		}

		let active = true;
		let objectUrl: string | null = null;
		const startIndex = imageRetry.key === imageKey ? imageRetry.startIndex : 0;
		setScreenshot(null);
		void (async () => {
			for (let index = startIndex; index < imagePaths.length; index += 1) {
				const imagePath = imagePaths[index];
				try {
					const url = await loadProjectImage(imagePath);
					if (!active) {
						URL.revokeObjectURL(url);
						return;
					}
					objectUrl = url;
					setScreenshot({ index, url });
					return;
				} catch (errorValue) {
					if (!active) {
						return;
					}
					void reportWarning(`Could not load image for '${project.name}': ${String(errorValue)}`);
				}
			}
			if (active) {
				setScreenshot(null);
			}
		})();

		return () => {
			active = false;
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, [imageKey, imagePaths, imageRetry, project.name]);

	return (
		<div className="relative m-2 aspect-video w-[calc(100%-16px)] self-center overflow-hidden rounded-lg bg-neu-inset transition-transform duration-300 group-hover:scale-[0.985]">
			{screenshot ? (
				<img
					src={screenshot.url}
					alt={`${project.name} screenshot`}
					className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
					onError={() => {
						URL.revokeObjectURL(screenshot.url);
						setScreenshot(null);
						void reportWarning(`Could not decode image for '${project.name}'.`);
						if (screenshot.index + 1 < imagePaths.length) {
							setImageRetry({ key: imageKey, startIndex: screenshot.index + 1 });
						}
					}}
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center bg-neu-inset text-neu-muted">
					<span className="text-4xl font-bold opacity-30">UE</span>
				</div>
			)}
		</div>
	);
}

export function ProjectsView({
	projects,
	loading,
	projectImages,
	onLaunchProject,
	onLaunchSolution,
	onOpenFolder,
	onResetProjectImage,
	onSetProjectImage,
}: ProjectsViewProps) {
	return (
		<div className="flex h-full flex-col">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neu-muted">Workspace</p>
					<h2 className="text-3xl font-bold text-neu-text">Projects</h2>
				</div>
				<span className="text-sm font-medium text-neu-muted">
					{projects.length} Found
				</span>
			</div>

			{projects.length === 0 && !loading ? (
				<div className="flex flex-1 flex-col items-center justify-center text-neu-muted">
					<FolderPlus className="mb-4 h-16 w-16 opacity-40" />
					<p>No projects found. Add a folder or .uproject file.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 items-start gap-x-6 gap-y-1 pb-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{projects.map((project) => (
						<div key={project.path} className="group relative pb-10 hover:z-30 focus-within:z-30">
							<button
								type="button"
								className="neu-card neu-card-interactive relative z-10 flex w-full cursor-pointer flex-col text-left"
								onClick={() => void onLaunchProject(project.path)}
							>
								<ProjectScreenshot
									project={project}
									customImagePath={projectImages[pathKey(project.path)] ?? null}
								/>
								<div className="flex flex-1 flex-col px-4 pb-4 pt-2">
									<h3 className="truncate text-lg font-bold text-neu-text transition-colors group-hover:text-neu-accent" title={project.name}>
										{project.name}
									</h3>
								</div>
							</button>

							<div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-[52px] translate-y-2 items-center justify-end rounded-b-2xl border border-t-0 border-neu-border bg-[#191919] px-4 pb-2 pt-3 opacity-0 transition-[opacity,transform] duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
								<div className="flex items-center gap-1">
									{projectImages[pathKey(project.path)] && (
										<button
											type="button"
											onClick={() => void onResetProjectImage(project.path)}
											className="project-action-button neu-button-round flex h-7 w-7 items-center justify-center text-neu-muted hover:text-neu-text"
											title="Reset project image"
											aria-label="Reset project image"
										>
											<ImageOff className="h-4 w-4" />
										</button>
									)}
									<button
										type="button"
										onClick={() => void onSetProjectImage(project.path)}
										className="project-action-button neu-button-round flex h-7 w-7 items-center justify-center text-neu-muted hover:text-neu-text"
										title="Set custom project image"
										aria-label="Set custom project image"
									>
										<ImagePlus className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => void onOpenFolder(project.path)}
										className="project-action-button neu-button-round flex h-7 w-7 items-center justify-center text-neu-muted hover:text-neu-text"
										title="Open project folder"
										aria-label="Open project folder"
									>
										<FolderOpen className="h-4 w-4" />
									</button>
									{project.sln_path && (
										<button
											type="button"
											onClick={() => void onLaunchSolution(project.sln_path!)}
											className="project-action-button neu-button-round flex h-7 w-7 items-center justify-center text-neu-muted hover:text-neu-text"
											title="Open solution"
											aria-label="Open solution"
										>
											<Code className="h-4 w-4" />
										</button>
									)}
									<button
										type="button"
										onClick={() => void onLaunchProject(project.path)}
										className="project-action-button neu-button-round ml-1 flex h-7 w-7 items-center justify-center text-neu-accent"
										title="Launch project"
										aria-label="Launch project"
									>
										<Play className="h-4 w-4 fill-current" />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
