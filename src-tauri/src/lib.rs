mod commands;
mod discovery;
mod launcher;
mod models;
mod project_images;

use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let application = tauri::Builder::default()
        .manage(Arc::new(commands::ScanState::default()))
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .max_file_size(5_000_000)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::scan_directories,
            commands::detect_engines,
            commands::read_project_image,
            commands::set_project_image,
            commands::remove_project_image,
            commands::discard_project_image,
            commands::cleanup_project_images,
            commands::launch_uproject,
            commands::launch_sln,
            commands::launch_engine,
            commands::open_in_explorer
        ])
        .run(tauri::generate_context!());

    if let Err(error) = application {
        log::error!("ULaunch stopped because of an application error: {error}");
        eprintln!("ULaunch stopped because of an application error: {error}");
    }
}
