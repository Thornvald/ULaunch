import { Play, RefreshCw, Settings, Trash2 } from "lucide-react";

import type { EngineInfo } from "../types";
import { pathKey } from "../utils/paths";

interface EnginesViewProps {
	engines: EngineInfo[];
	customEnginePaths: Set<string>;
	defaultEnginePath: string | null;
	loading: boolean;
	onAddEngine: () => Promise<void>;
	onLaunchEngine: (path: string) => Promise<void>;
	onRefresh: () => Promise<void>;
	onRemoveEngine: (path: string) => Promise<void>;
	onSetDefault: (path: string | null) => Promise<void>;
}

export function EnginesView({
	engines,
	customEnginePaths,
	defaultEnginePath,
	loading,
	onAddEngine,
	onLaunchEngine,
	onRefresh,
	onRemoveEngine,
	onSetDefault,
}: EnginesViewProps) {
	return (
		<div className="flex h-full flex-col">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neu-muted">Installed</p>
					<h2 className="text-3xl font-bold text-neu-text">Engines</h2>
				</div>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => void onAddEngine()}
						className="neu-button px-4 py-2 text-sm font-medium text-neu-text hover:text-neu-accent"
					>
						+ Add Engine
					</button>
					<button
						type="button"
						onClick={() => void onRefresh()}
						disabled={loading}
						className="neu-button-round flex h-10 w-10 items-center justify-center text-neu-muted disabled:cursor-wait disabled:opacity-60"
						aria-label="Refresh engines"
					>
						<RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
					</button>
				</div>
			</div>

			{engines.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center text-neu-muted">
					<Settings className="mb-4 h-16 w-16 opacity-40" />
					<p>No Unreal Engine installations detected.</p>
				</div>
			) : (
				<div className="flex flex-col gap-4 pb-8">
					{engines.map((engine) => {
						const isDefault = pathKey(defaultEnginePath ?? "") === pathKey(engine.path);
						const isCustom = customEnginePaths.has(pathKey(engine.path));
						return (
							<div key={engine.path} className="neu-card group flex flex-col items-stretch gap-5 p-4 min-[1000px]:flex-row min-[1000px]:items-center min-[1000px]:justify-between min-[1000px]:p-6">
								<div className="flex min-w-0 items-center gap-4 sm:gap-6">
									<div className="w-16 shrink-0 text-center text-3xl font-extrabold text-neu-muted transition-colors group-hover:text-neu-accent sm:w-20">
										{engine.version}
									</div>
									<div className="min-w-0">
										<h3 className="truncate text-xl font-bold text-neu-text">Unreal Engine {engine.version}</h3>
										<p className="truncate text-sm text-neu-muted" title={engine.path}>{engine.path}</p>
									</div>
								</div>

								<div className="flex w-full flex-wrap items-center justify-end gap-3 min-[1000px]:ml-5 min-[1000px]:w-auto min-[1000px]:shrink-0">
									{isCustom && (
										<button
											type="button"
											onClick={() => void onRemoveEngine(engine.path)}
											className="neu-button-round flex h-9 w-9 items-center justify-center text-neu-muted hover:text-red-400"
											aria-label={`Remove Unreal Engine ${engine.version}`}
										>
											<Trash2 className="h-4 w-4" />
										</button>
									)}
									<button
										type="button"
										onClick={() => void onSetDefault(isDefault ? null : engine.path)}
										className={`neu-button px-4 py-2 text-sm font-medium ${isDefault ? "is-active text-neu-accent" : "text-neu-muted hover:text-neu-text"}`}
									>
										{isDefault ? "Default" : "Set Default"}
									</button>
									<button
										type="button"
										onClick={() => void onLaunchEngine(engine.path)}
										className="neu-button group/launch flex items-center gap-2 px-5 py-3 font-semibold text-neu-text hover:text-neu-accent"
									>
										<Play className="h-5 w-5 fill-current text-neu-muted transition-colors group-hover/launch:text-neu-accent" />
										Launch Engine
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
