import { FolderPlus, FolderSearch, X } from "lucide-react";

interface ScanPathsViewProps {
	paths: string[];
	onAddFolder: () => Promise<void>;
	onRemovePath: (path: string) => Promise<void>;
}

export function ScanPathsView({ paths, onAddFolder, onRemovePath }: ScanPathsViewProps) {
	return (
		<div className="flex h-full flex-col">
			<div className="mb-8 flex items-end justify-between">
				<div>
					<p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neu-muted">Discovery</p>
					<h2 className="text-3xl font-bold text-neu-text">Scan Paths</h2>
				</div>
				<div className="flex items-center gap-4">
					<span className="text-sm font-medium text-neu-muted">{paths.length} Configured</span>
					<button
						type="button"
						onClick={() => void onAddFolder()}
						className="neu-button flex items-center gap-2 px-4 py-2 text-sm font-medium text-neu-text"
					>
						<FolderPlus className="h-4 w-4" />
						Add Folder
					</button>
				</div>
			</div>

			{paths.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center text-neu-muted">
					<FolderSearch className="mb-4 h-16 w-16 opacity-40" />
					<p>No scan paths configured.</p>
				</div>
			) : (
				<div className="flex flex-col">
					{paths.map((path) => (
						<div key={path} className="flex items-center gap-4 border-b border-neu-border px-1 py-4">
							<FolderSearch className="h-5 w-5 shrink-0 text-neu-muted" />
							<span className="min-w-0 flex-1 truncate text-sm text-neu-text" title={path}>{path}</span>
							<button
								type="button"
								onClick={() => void onRemovePath(path)}
								className="neu-button-round flex h-8 w-8 shrink-0 items-center justify-center text-neu-muted hover:text-red-400"
								aria-label={`Remove ${path}`}
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
