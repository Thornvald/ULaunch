import { useState, useEffect } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { load, Store } from "@tauri-apps/plugin-store";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { FolderPlus, FilePlus, Play, Settings, RefreshCw, X, Minus, Square, Code, FolderOpen } from "lucide-react";

interface ProjectInfo {
  name: string;
  path: string;
  screenshot_path: string | null;
  sln_path: string | null;
}

interface EngineInfo {
  version: string;
  path: string;
}

function App() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [scanPaths, setScanPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'engines'>('projects');
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      const appStore = await load("store.json", { autoSave: false, defaults: { scanPaths: [] } });
      setStore(appStore);

      const savedPaths = await appStore.get<string[]>("scanPaths");
      if (savedPaths && savedPaths.length > 0) {
        setScanPaths(savedPaths);
        await refreshProjects(savedPaths);
      }
      
      const detectedEngines = await invoke<EngineInfo[]>("detect_engines");
      setEngines(detectedEngines);
    } catch (e) {
      console.error("Init error", e);
    }
  }

  async function refreshProjects(paths: string[]) {
    setLoading(true);
    try {
      const foundProjects = await invoke<ProjectInfo[]>("scan_directories", { paths });
      setProjects(foundProjects);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleAddFolder() {
    const selected = await open({
      multiple: true,
      directory: true,
    });
    if (selected && store) {
      const newPaths = Array.isArray(selected) ? selected : [selected];
      const updatedPaths = [...new Set([...scanPaths, ...newPaths])];
      setScanPaths(updatedPaths);
      await store.set("scanPaths", updatedPaths);
      await store.save();
      await refreshProjects(updatedPaths);
    }
  }

  async function handleAddFile() {
    const selected = await open({
      multiple: true,
      filters: [{ name: "Unreal Project", extensions: ["uproject"] }]
    });
    if (selected && store) {
      const newPaths = Array.isArray(selected) ? selected : [selected];
      const updatedPaths = [...new Set([...scanPaths, ...newPaths])];
      setScanPaths(updatedPaths);
      await store.set("scanPaths", updatedPaths);
      await store.save();
      await refreshProjects(updatedPaths);
    }
  }

  async function launchProject(path: string) {
    try {
      await invoke("launch_uproject", { path });
    } catch (e) {
      console.error("Failed to launch project:", e);
    }
  }

  async function launchEngine(path: string) {
    try {
      await invoke("launch_engine", { path });
    } catch (e) {
      console.error("Failed to launch engine:", e);
    }
  }

  async function removePath(pathToRemove: string) {
    if (!store) return;
    const updated = scanPaths.filter(p => p !== pathToRemove);
    setScanPaths(updated);
    await store.set("scanPaths", updated);
    await store.save();
    await refreshProjects(updated);
  }

  const appWindow = getCurrentWindow();

  return (
    <div className="flex flex-col h-screen bg-neu-bg text-slate-700 font-sans overflow-hidden rounded-xl border border-white/20">
      {/* Custom Titlebar */}
      <div 
        data-tauri-drag-region 
        className="h-12 flex items-center justify-between px-4 shrink-0 shadow-neu-sm bg-neu-bg z-50 select-none"
      >
        <div className="flex items-center gap-2 pointer-events-none" data-tauri-drag-region>
          <div className="w-6 h-6 rounded-full bg-neu-bg shadow-neu-sm flex items-center justify-center">
            <Play className="w-3 h-3 text-blue-500 fill-current" />
          </div>
          <span className="font-bold text-sm tracking-widest text-slate-600">ULAUNCH</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => appWindow.minimize()}
            className="w-8 h-8 neu-button-round flex items-center justify-center text-slate-500 hover:text-blue-500"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => appWindow.toggleMaximize()}
            className="w-8 h-8 neu-button-round flex items-center justify-center text-slate-500 hover:text-green-500"
          >
            <Square className="w-3 h-3" />
          </button>
          <button 
            onClick={() => appWindow.close()}
            className="w-8 h-8 neu-button-round flex items-center justify-center text-slate-500 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden p-6 gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex flex-col gap-6 shrink-0">
          <nav className="flex flex-col gap-4 flex-1">
            <button 
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-3 text-left font-medium ${activeTab === 'projects' ? 'neu-button text-blue-600' : 'neu-button'}`}
            >
              My Projects
            </button>
            <button 
              onClick={() => setActiveTab('engines')}
              className={`px-4 py-3 text-left font-medium ${activeTab === 'engines' ? 'neu-button text-blue-600' : 'neu-button'}`}
            >
              Engine Versions
            </button>

            <div className="mt-8 flex flex-col gap-4">
              <p className="text-sm font-semibold text-slate-500 px-2">Actions</p>
              <button 
                onClick={handleAddFolder}
                className="flex items-center gap-3 px-4 py-3 neu-button group text-slate-700 font-medium"
              >
                <FolderPlus className="w-5 h-5 text-green-500 transition-transform duration-500 ease-smooth group-hover:scale-110 group-active:scale-95" />
                <span>Add Folder</span>
              </button>
              <button 
                onClick={handleAddFile}
                className="flex items-center gap-3 px-4 py-3 neu-button group text-slate-700 font-medium"
              >
                <FilePlus className="w-5 h-5 text-purple-500 transition-transform duration-500 ease-smooth group-hover:scale-110 group-active:scale-95" />
                <span>Add .uproject</span>
              </button>
              <button 
                onClick={() => refreshProjects(scanPaths)}
                className="flex items-center gap-3 px-4 py-3 neu-button group text-slate-700 font-medium"
              >
                <RefreshCw className={`w-5 h-5 text-orange-500 transition-transform duration-500 ease-smooth group-active:scale-95 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                <span>Refresh</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-neu-bg rounded-3xl shadow-neu-pressed p-8 overflow-y-auto">
          {activeTab === 'projects' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-slate-800">Projects</h2>
                <span className="px-4 py-2 rounded-xl shadow-neu-flat text-sm font-medium transition-all duration-500 hover:shadow-neu-sm">
                  {projects.length} Found
                </span>
              </div>

              {scanPaths.length > 0 && (
                 <div className="mb-6 flex gap-2 flex-wrap">
                    {scanPaths.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1 rounded-full shadow-neu-sm text-xs bg-neu-bg transition-all duration-500 hover:shadow-neu-flat">
                        <span className="truncate max-w-[200px]" title={p}>{p}</span>
                        <button onClick={() => removePath(p)} className="p-1 w-6 h-6 neu-button-round flex items-center justify-center text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                 </div>
              )}

              {projects.length === 0 && !loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <FolderPlus className="w-16 h-16 mb-4 opacity-50" />
                  <p>No projects found. Add a folder to scan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                  {projects.map((proj, idx) => (
                    <div 
                      key={idx} 
                      className="group relative flex flex-col neu-card neu-card-interactive overflow-hidden cursor-pointer"
                      onClick={() => launchProject(proj.path)}
                    >
                      <div className="aspect-video w-full bg-slate-200 shadow-neu-pressed m-2 rounded-2xl overflow-hidden self-center transition-all duration-700 ease-smooth group-hover:m-3 group-hover:w-[calc(100%-24px)]" style={{ width: 'calc(100% - 16px)' }}>
                        {proj.screenshot_path ? (
                          <img 
                            src={convertFileSrc(proj.screenshot_path)} 
                            alt={proj.name}
                            className="w-full h-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 bg-neu-bg">
                            <span className="text-4xl font-bold opacity-20">UE</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-lg truncate mb-1 transition-colors duration-500 group-hover:text-blue-600" title={proj.name}>{proj.name}</h3>
                        <p className="text-xs text-slate-500 truncate" title={proj.path}>{proj.path}</p>
                        
                        <div className="mt-4 pt-4 border-t border-slate-300/30 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-700 ease-smooth translate-y-2 group-hover:translate-y-0">
                          <span className="text-sm font-medium text-blue-600">Launch Project</span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                invoke("open_in_explorer", { path: proj.path });
                              }}
                              className="w-8 h-8 neu-button-round flex items-center justify-center text-slate-500 hover:text-green-600 transition-colors"
                              title="Open Project Folder"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>
                            {proj.sln_path && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  invoke("launch_sln", { path: proj.sln_path });
                                }}
                                className="w-8 h-8 neu-button-round flex items-center justify-center text-slate-500 hover:text-purple-600 transition-colors"
                                title="Open Solution in IDE"
                              >
                                <Code className="w-4 h-4" />
                              </button>
                            )}
                            <div className="p-2 rounded-full text-blue-600">
                              <Play className="w-4 h-4 fill-current" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'engines' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-slate-800">Detected Engines</h2>
                <button onClick={() => initApp()} className="p-2 w-10 h-10 neu-button-round flex items-center justify-center text-slate-600">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {engines.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <Settings className="w-16 h-16 mb-4 opacity-50" />
                  <p>No Unreal Engine installations detected in default paths.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {engines.map((eng, idx) => (
                    <div 
                      key={idx}
                      className="group flex items-center justify-between p-6 neu-card"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl shadow-neu-pressed flex items-center justify-center text-2xl font-bold text-blue-600 transition-transform duration-500 ease-smooth group-hover:scale-105">
                          {eng.version}
                        </div>
                        <div>
                          <h3 className="font-bold text-xl transition-colors duration-500 group-hover:text-blue-600">Unreal Engine {eng.version}</h3>
                          <p className="text-sm text-slate-500">{eng.path}</p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => launchEngine(eng.path)}
                        className="flex items-center gap-2 px-6 py-3 neu-button text-blue-600 font-semibold hover:gap-4"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Launch Engine
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;