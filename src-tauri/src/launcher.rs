use std::path::{Path, PathBuf};
use std::process::Command;

use log::info;

use crate::discovery::display_path;

pub fn launch_project(path: &str, engine_path: Option<&str>) -> Result<(), String> {
    let project_path = validated_file(path, Some("uproject"), None)?;

    if let Some(engine_path) = engine_path.filter(|path| !path.trim().is_empty()) {
        let engine_path = validated_file(engine_path, Some("exe"), Some("UnrealEditor.exe"))?;
        Command::new(&engine_path)
            .arg(&project_path)
            .spawn()
            .map_err(|error| {
                format!("Could not launch project with the selected engine: {error}")
            })?;
        info!(
            "Launched project '{}' with engine '{}'",
            display_path(&project_path),
            display_path(&engine_path)
        );
        return Ok(());
    }

    open::that(&project_path).map_err(|error| {
        format!("Could not launch project using Windows file association: {error}")
    })?;
    info!(
        "Launched project '{}' using Windows file association",
        display_path(&project_path)
    );
    Ok(())
}

pub fn launch_solution(path: &str) -> Result<(), String> {
    let solution_path = validated_file(path, Some("sln"), None)?;
    open::that(&solution_path).map_err(|error| format!("Could not open solution: {error}"))?;
    info!("Opened solution '{}'", display_path(&solution_path));
    Ok(())
}

pub fn launch_editor(path: &str) -> Result<(), String> {
    let engine_path = validated_file(path, Some("exe"), Some("UnrealEditor.exe"))?;
    Command::new(&engine_path)
        .spawn()
        .map_err(|error| format!("Could not launch Unreal Editor: {error}"))?;
    info!("Launched Unreal Editor '{}'", display_path(&engine_path));
    Ok(())
}

pub fn open_project_folder(path: &str) -> Result<(), String> {
    let project_path = validated_file(path, Some("uproject"), None)?;
    let parent = project_path
        .parent()
        .ok_or_else(|| "Project has no parent directory".to_string())?;
    open::that(parent).map_err(|error| format!("Could not open project folder: {error}"))?;
    info!("Opened project folder '{}'", display_path(parent));
    Ok(())
}

pub fn validated_screenshot(path: &str) -> Result<PathBuf, String> {
    let screenshot_path = validated_file(path, Some("png"), Some("AutoScreenshot.png"))?;
    let saved_directory = screenshot_path
        .parent()
        .and_then(Path::file_name)
        .and_then(|name| name.to_str());
    if !saved_directory.is_some_and(|name| name.eq_ignore_ascii_case("Saved")) {
        return Err("Screenshot must be Saved/AutoScreenshot.png".to_string());
    }
    Ok(screenshot_path)
}

pub fn validated_project(path: &str) -> Result<PathBuf, String> {
    validated_file(path, Some("uproject"), None)
}

fn validated_file(
    path: &str,
    expected_extension: Option<&str>,
    expected_file_name: Option<&str>,
) -> Result<PathBuf, String> {
    let canonical_path = Path::new(path)
        .canonicalize()
        .map_err(|error| format!("Path does not exist or cannot be accessed: {error}"))?;
    if !canonical_path.is_file() {
        return Err("Path must point to a file".to_string());
    }

    if let Some(expected_extension) = expected_extension {
        let extension_matches = canonical_path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case(expected_extension));
        if !extension_matches {
            return Err(format!("File must use the .{expected_extension} extension"));
        }
    }

    if let Some(expected_file_name) = expected_file_name {
        let file_name_matches = canonical_path
            .file_name()
            .and_then(|file_name| file_name.to_str())
            .is_some_and(|file_name| file_name.eq_ignore_ascii_case(expected_file_name));
        if !file_name_matches {
            return Err(format!("File must be named {expected_file_name}"));
        }
    }

    Ok(canonical_path)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{validated_file, validated_screenshot};

    #[test]
    fn rejects_wrong_file_extensions() {
        let root = tempdir().expect("temporary directory should be created");
        let file_path = root.path().join("NotAProject.txt");
        fs::write(&file_path, "test").expect("test file should be written");

        let result = validated_file(&file_path.to_string_lossy(), Some("uproject"), None);

        assert!(result.is_err());
    }

    #[test]
    fn accepts_only_the_expected_screenshot_location() {
        let root = tempdir().expect("temporary directory should be created");
        let saved_folder = root.path().join("Saved");
        fs::create_dir(&saved_folder).expect("saved directory should be created");
        let screenshot_path = saved_folder.join("AutoScreenshot.png");
        fs::write(&screenshot_path, "image").expect("screenshot should be written");

        let result = validated_screenshot(&screenshot_path.to_string_lossy());

        assert!(result.is_ok());
    }
}
