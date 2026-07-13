import { useState } from "react";

import { EnginesView } from "./components/EnginesView";
import { ErrorBanner } from "./components/ErrorBanner";
import { ProjectsView } from "./components/ProjectsView";
import { ScanPathsView } from "./components/ScanPathsView";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { useULaunchData } from "./hooks/useULaunchData";
import type { ActiveTab } from "./types";

function App() {
	const [activeTab, setActiveTab] = useState<ActiveTab>("projects");
	const data = useULaunchData();

	return (
		<div className="flex h-screen flex-col overflow-hidden rounded-xl border border-neu-border bg-neu-bg font-sans text-neu-text">
			<TitleBar onError={data.reportFailure} />
			{data.errorMessage && (
				<ErrorBanner message={data.errorMessage} onDismiss={data.clearError} />
			)}

			<div className="flex flex-1 gap-4 overflow-hidden p-4 xl:gap-6 xl:p-6">
				<Sidebar
					activeTab={activeTab}
					loading={data.loading}
					onAddProject={data.addProject}
					onRefresh={data.refreshProjects}
					onTabChange={setActiveTab}
				/>

				<main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-transparent p-5 xl:p-8">
					{activeTab === "projects" && (
						<ProjectsView
							projects={data.projects}
							loading={data.loading}
							projectImages={data.projectImages}
							onLaunchProject={data.launchProject}
							onLaunchSolution={data.launchSolution}
							onOpenFolder={data.openProjectFolder}
							onResetProjectImage={data.resetProjectImage}
							onSetProjectImage={data.setProjectImage}
						/>
					)}
					{activeTab === "engines" && (
						<EnginesView
							engines={data.allEngines}
							customEnginePaths={data.customEnginePaths}
							defaultEnginePath={data.defaultEnginePath}
							loading={data.loading}
							onAddEngine={data.addCustomEngine}
							onLaunchEngine={data.launchEngine}
							onRefresh={data.refreshAll}
							onRemoveEngine={data.removeCustomEngine}
							onSetDefault={data.setDefaultEngine}
						/>
					)}
					{activeTab === "paths" && (
						<ScanPathsView
							paths={data.scanPaths}
							onAddFolder={data.addFolder}
							onRemovePath={data.removeScanPath}
						/>
					)}
				</main>
			</div>
		</div>
	);
}

export default App;
