import { FilePlus, RefreshCw } from "lucide-react";

import type { ActiveTab } from "../types";

interface SidebarProps {
	activeTab: ActiveTab;
	loading: boolean;
	onAddProject: () => Promise<void>;
	onRefresh: () => Promise<void>;
	onTabChange: (tab: ActiveTab) => void;
}

export function Sidebar({
	activeTab,
	loading,
	onAddProject,
	onRefresh,
	onTabChange,
}: SidebarProps) {
	return (
		<aside className="flex w-[clamp(10.5rem,18vw,13rem)] shrink-0 flex-col gap-5">
			<nav className="flex flex-1 flex-col gap-3">
				<button
					type="button"
					onClick={() => onTabChange("projects")}
					className={`neu-button whitespace-nowrap px-3 py-3 text-left font-medium ${activeTab === "projects" ? "is-active text-neu-accent" : "text-neu-text"}`}
				>
					My Projects
				</button>
				<button
					type="button"
					onClick={() => onTabChange("engines")}
					className={`neu-button whitespace-nowrap px-3 py-3 text-left font-medium ${activeTab === "engines" ? "is-active text-neu-accent" : "text-neu-text"}`}
				>
					Engine Versions
				</button>
				<button
					type="button"
					onClick={() => onTabChange("paths")}
					className={`neu-button whitespace-nowrap px-3 py-3 text-left font-medium ${activeTab === "paths" ? "is-active text-neu-accent" : "text-neu-text"}`}
				>
					Scan Paths
				</button>

				<div className="mt-8 flex flex-col gap-3">
					<p className="px-2 text-xs font-bold uppercase tracking-wider text-neu-muted">Actions</p>
					<button
						type="button"
						onClick={() => void onAddProject()}
						className="neu-button group flex items-center gap-2.5 whitespace-nowrap px-3 py-3 font-medium text-neu-text"
					>
						<FilePlus className="h-5 w-5 text-neu-accent transition-transform group-hover:scale-110" />
						<span>Add .uproject</span>
					</button>
					<button
						type="button"
						onClick={() => void onRefresh()}
						disabled={loading}
						className="neu-button group flex items-center gap-2.5 whitespace-nowrap px-3 py-3 font-medium text-neu-text disabled:cursor-wait disabled:opacity-60"
					>
						<RefreshCw className={`h-5 w-5 text-neu-muted ${loading ? "animate-spin" : "group-hover:rotate-180"}`} />
						<span>Refresh</span>
					</button>
				</div>
			</nav>
		</aside>
	);
}
