use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use log::{error, info};
use tauri::ipc::Response;
use tauri::State;

use crate::discovery;
use crate::launcher;
use crate::models::{EngineInfo, ProjectInfo};
use crate::project_images;

#[derive(Default)]
pub struct ScanState {
    generation: AtomicU64,
}

impl ScanState {
    fn begin(&self) -> u64 {
        self.generation.fetch_add(1, Ordering::AcqRel) + 1
    }

    fn is_cancelled(&self, generation: u64) -> bool {
        self.generation.load(Ordering::Acquire) != generation
    }
}

#[tauri::command]
pub async fn scan_directories(
    paths: Vec<String>,
    scan_state: State<'_, Arc<ScanState>>,
) -> Result<Vec<ProjectInfo>, String> {
    info!("Scanning {} configured project path(s)", paths.len());
    let scan_state = Arc::clone(&scan_state);
    let generation = scan_state.begin();
    tauri::async_runtime::spawn_blocking(move || {
        discovery::scan_paths(paths, || scan_state.is_cancelled(generation))
    })
    .await
    .map_err(|error| format!("Project scan task failed: {error}"))?
}

#[tauri::command]
pub async fn detect_engines() -> Result<Vec<EngineInfo>, String> {
    tauri::async_runtime::spawn_blocking(discovery::detect_installed_engines)
        .await
        .map_err(|error| format!("Engine detection task failed: {error}"))
}

#[tauri::command]
pub async fn read_project_image(
    app_handle: tauri::AppHandle,
    path: String,
) -> Result<Response, String> {
    tauri::async_runtime::spawn_blocking(move || {
        project_images::read_project_image(&app_handle, &path).map(Response::new)
    })
    .await
    .map_err(|error| format!("Project image task failed: {error}"))?
}

#[tauri::command]
pub async fn set_project_image(
    app_handle: tauri::AppHandle,
    project_path: String,
    image_path: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        project_images::save_project_image(&app_handle, &project_path, &image_path)
    })
    .await
    .map_err(|error| format!("Project image save task failed: {error}"))?
    .map_err(log_command_error)
}

#[tauri::command]
pub async fn remove_project_image(
    app_handle: tauri::AppHandle,
    project_path: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        project_images::remove_project_image(&app_handle, &project_path)
    })
    .await
    .map_err(|error| format!("Project image removal task failed: {error}"))?
    .map_err(log_command_error)
}

#[tauri::command]
pub async fn discard_project_image(
    app_handle: tauri::AppHandle,
    image_path: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        project_images::discard_project_image(&app_handle, &image_path)
    })
    .await
    .map_err(|error| format!("Project image discard task failed: {error}"))?
    .map_err(log_command_error)
}

#[tauri::command]
pub async fn cleanup_project_images(
    app_handle: tauri::AppHandle,
    project_path: String,
    kept_image_path: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        project_images::cleanup_project_images(&app_handle, &project_path, &kept_image_path)
    })
    .await
    .map_err(|error| format!("Project image cleanup task failed: {error}"))?
    .map_err(log_command_error)
}

#[tauri::command]
pub fn launch_uproject(path: String, engine_path: Option<String>) -> Result<(), String> {
    launcher::launch_project(&path, engine_path.as_deref()).map_err(log_command_error)
}

#[tauri::command]
pub fn launch_sln(path: String) -> Result<(), String> {
    launcher::launch_solution(&path).map_err(log_command_error)
}

#[tauri::command]
pub fn launch_engine(path: String) -> Result<(), String> {
    launcher::launch_editor(&path).map_err(log_command_error)
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    launcher::open_project_folder(&path).map_err(log_command_error)
}

fn log_command_error(message: String) -> String {
    error!("{message}");
    message
}
