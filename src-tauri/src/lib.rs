use std::path::Path;
use walkdir::WalkDir;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub screenshot_path: Option<String>,
    pub sln_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EngineInfo {
    pub version: String,
    pub path: String,
}

#[tauri::command]
async fn scan_directories(paths: Vec<String>) -> Result<Vec<ProjectInfo>, String> {
    let mut projects = Vec::new();

    for path in paths {
        let root = Path::new(&path);
        if !root.exists() { continue; }

        for entry in WalkDir::new(root).max_depth(4).into_iter().filter_map(|e| e.ok()) {
            let p = entry.path();
            if p.extension().map_or(false, |ext| ext == "uproject") {
                let name = p.file_stem().unwrap_or_default().to_string_lossy().into_owned();
                
                // Check for AutoScreenshot.png and .sln
                let mut screenshot_path = None;
                let mut sln_path = None;
                
                if let Some(parent) = p.parent() {
                    let screenshot = parent.join("Saved").join("AutoScreenshot.png");
                    if screenshot.exists() {
                        screenshot_path = Some(screenshot.to_string_lossy().into_owned());
                    }
                    
                    let sln = parent.join(format!("{}.sln", name));
                    if sln.exists() {
                        sln_path = Some(sln.to_string_lossy().into_owned());
                    }
                }

                projects.push(ProjectInfo {
                    name,
                    path: p.to_string_lossy().into_owned(),
                    screenshot_path,
                    sln_path,
                });
            }
        }
    }
    
    // Deduplicate
    projects.sort_by(|a, b| a.path.cmp(&b.path));
    projects.dedup_by(|a, b| a.path == b.path);

    Ok(projects)
}

#[tauri::command]
async fn detect_engines() -> Result<Vec<EngineInfo>, String> {
    let mut engines = Vec::new();
    let base_paths = vec![
        "C:\\Program Files\\Epic Games",
        "C:\\Program Files (x86)\\Epic Games",
    ];

    for base in base_paths {
        let base_path = Path::new(base);
        if !base_path.exists() { continue; }

        if let Ok(entries) = std::fs::read_dir(base_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let folder_name = entry.file_name().to_string_lossy().into_owned();
                if folder_name.starts_with("UE_") {
                    let version = folder_name.trim_start_matches("UE_").to_string();
                    let binary_path = entry.path().join("Engine").join("Binaries").join("Win64").join("UnrealEditor.exe");
                    if binary_path.exists() {
                        engines.push(EngineInfo {
                            version,
                            path: binary_path.to_string_lossy().into_owned(),
                        });
                    }
                }
            }
        }
    }

    Ok(engines)
}

#[tauri::command]
fn launch_uproject(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn launch_sln(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn launch_engine(path: String) -> Result<(), String> {
    std::process::Command::new(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_in_explorer(path: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        open::that(parent).map_err(|e| e.to_string())
    } else {
        Err("Could not get parent directory".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_directories,
            detect_engines,
            launch_uproject,
            launch_sln,
            launch_engine,
            open_in_explorer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}