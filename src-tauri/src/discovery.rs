use std::fs;
use std::path::Path;

use log::{info, warn};
use walkdir::{DirEntry, WalkDir};

use crate::models::{EngineInfo, ProjectInfo};

const SKIPPED_DIRECTORIES: [&str; 8] = [
    ".git",
    "Binaries",
    "DerivedDataCache",
    "Intermediate",
    "node_modules",
    "Saved",
    "target",
    ".vs",
];

pub fn scan_paths(
    paths: Vec<String>,
    should_cancel: impl Fn() -> bool,
) -> Result<Vec<ProjectInfo>, String> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    let mut projects = Vec::new();
    let mut valid_root_count = 0;

    for path in paths {
        if should_cancel() {
            return Err("Project scan was superseded by a newer request".to_string());
        }
        let root = match Path::new(&path).canonicalize() {
            Ok(root) => root,
            Err(error) => {
                warn!("Skipping scan path '{path}': {error}");
                continue;
            }
        };

        if is_uproject(&root) {
            valid_root_count += 1;
            projects.push(project_from_path(&root)?);
            continue;
        }

        if !root.is_dir() {
            warn!(
                "Skipping scan path '{}': not a directory or .uproject file",
                display_path(&root)
            );
            continue;
        }

        valid_root_count += 1;
        for entry in WalkDir::new(&root)
            .follow_links(false)
            .into_iter()
            .filter_entry(should_visit)
        {
            if should_cancel() {
                return Err("Project scan was superseded by a newer request".to_string());
            }
            match entry {
                Ok(entry) if entry.file_type().is_file() && is_uproject(entry.path()) => {
                    match project_from_path(entry.path()) {
                        Ok(project) => projects.push(project),
                        Err(error) => {
                            warn!("Skipping project '{}': {error}", display_path(entry.path()))
                        }
                    }
                }
                Ok(_) => {}
                Err(error) => warn!("Directory scan entry failed: {error}"),
            }
        }
    }

    if valid_root_count == 0 {
        return Err("None of the configured project paths are available".to_string());
    }

    projects.sort_by_key(|project| project.path.to_lowercase());
    projects.dedup_by(|left, right| left.path.eq_ignore_ascii_case(&right.path));
    info!("Project scan completed with {} project(s)", projects.len());
    Ok(projects)
}

pub fn detect_installed_engines() -> Vec<EngineInfo> {
    let base_paths = [
        Path::new(r"C:\Program Files\Epic Games"),
        Path::new(r"C:\Program Files (x86)\Epic Games"),
    ];
    let mut engines = Vec::new();

    for base_path in base_paths {
        if !base_path.exists() {
            continue;
        }

        let entries = match fs::read_dir(base_path) {
            Ok(entries) => entries,
            Err(error) => {
                warn!(
                    "Could not inspect engine folder '{}': {error}",
                    display_path(base_path)
                );
                continue;
            }
        };

        for entry in entries {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    warn!("Could not read an engine directory entry: {error}");
                    continue;
                }
            };
            let folder_name = entry.file_name().to_string_lossy().into_owned();
            let Some(version) = folder_name.strip_prefix("UE_") else {
                continue;
            };

            let binary_path = entry
                .path()
                .join("Engine")
                .join("Binaries")
                .join("Win64")
                .join("UnrealEditor.exe");
            if !binary_path.is_file() {
                continue;
            }

            engines.push(EngineInfo {
                version: version.to_string(),
                path: display_path(&binary_path),
            });
        }
    }

    engines.sort_by(|left, right| left.version.cmp(&right.version));
    engines.dedup_by(|left, right| left.path.eq_ignore_ascii_case(&right.path));
    info!(
        "Engine detection completed with {} engine(s)",
        engines.len()
    );
    engines
}

fn project_from_path(path: &Path) -> Result<ProjectInfo, String> {
    let canonical_path = path
        .canonicalize()
        .map_err(|error| format!("Could not resolve project path: {error}"))?;
    let name = canonical_path
        .file_stem()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Project filename is not valid UTF-8".to_string())?
        .to_string();
    let parent = canonical_path
        .parent()
        .ok_or_else(|| "Project has no parent directory".to_string())?;
    let screenshot = parent.join("Saved").join("AutoScreenshot.png");
    let solution = parent.join(format!("{name}.sln"));

    Ok(ProjectInfo {
        name,
        path: display_path(&canonical_path),
        screenshot_path: screenshot.is_file().then(|| display_path(&screenshot)),
        sln_path: solution.is_file().then(|| display_path(&solution)),
    })
}

fn should_visit(entry: &DirEntry) -> bool {
    if !entry.file_type().is_dir() {
        return true;
    }

    let directory_name = entry.file_name().to_string_lossy();
    !SKIPPED_DIRECTORIES
        .iter()
        .any(|skipped| directory_name.eq_ignore_ascii_case(skipped))
}

fn is_uproject(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("uproject"))
}

pub fn display_path(path: &Path) -> String {
    let path = path.to_string_lossy();
    if let Some(path) = path.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{path}");
    }
    if let Some(path) = path.strip_prefix(r"\\?\") {
        return path.to_string();
    }
    path.into_owned()
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::scan_paths;

    #[test]
    fn finds_deep_projects_and_skips_generated_folders() {
        let root = tempdir().expect("temporary directory should be created");
        let project_folder = root
            .path()
            .join("One")
            .join("Two")
            .join("Three")
            .join("Four")
            .join("Five");
        fs::create_dir_all(&project_folder).expect("project directory should be created");
        fs::write(project_folder.join("Deep.uproject"), "{}")
            .expect("project file should be written");
        let generated_folder = root.path().join("Intermediate");
        fs::create_dir_all(&generated_folder).expect("generated directory should be created");
        fs::write(generated_folder.join("Ignored.uproject"), "{}")
            .expect("ignored file should be written");

        let projects = scan_paths(vec![root.path().to_string_lossy().into_owned()], || false)
            .expect("scan should succeed");

        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "Deep");
    }

    #[test]
    fn rejects_a_scan_when_all_roots_are_missing() {
        let result = scan_paths(vec![r"Z:\ULaunchMissingPath".to_string()], || false);

        assert!(result.is_err());
    }

    #[test]
    fn cancels_a_superseded_scan() {
        let root = tempdir().expect("temporary directory should be created");

        let result = scan_paths(vec![root.path().to_string_lossy().into_owned()], || true);

        assert!(result.is_err());
    }
}
