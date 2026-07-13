use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use image::{ImageFormat, ImageReader, Limits};
use log::{info, warn};
use sha2::{Digest, Sha256};
use tauri::Manager;
use tempfile::NamedTempFile;

use crate::discovery::display_path;
use crate::launcher;

const MAX_IMAGE_BYTES: u64 = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS: [&str; 4] = ["png", "jpg", "jpeg", "webp"];

pub fn save_project_image(
    app_handle: &tauri::AppHandle,
    project_path: &str,
    image_path: &str,
) -> Result<String, String> {
    let project_path = launcher::validated_project(project_path)?;
    let (source_path, extension) = validated_image(image_path)?;
    let image_directory = project_image_directory(app_handle)?;
    fs::create_dir_all(&image_directory)
        .map_err(|error| format!("Could not create project image directory: {error}"))?;

    let image_id = project_image_id(&project_path);
    let image_bytes = fs::read(&source_path)
        .map_err(|error| format!("Could not read custom project image: {error}"))?;
    let content_id: String = Sha256::digest(&image_bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    let destination = image_directory.join(format!("{image_id}-{content_id}.{extension}"));
    let mut temporary_file = NamedTempFile::new_in(&image_directory)
        .map_err(|error| format!("Could not create temporary project image: {error}"))?;
    temporary_file
        .write_all(&image_bytes)
        .map_err(|error| format!("Could not copy custom project image: {error}"))?;
    temporary_file
        .as_file()
        .sync_all()
        .map_err(|error| format!("Could not flush custom project image: {error}"))?;
    temporary_file
        .persist(&destination)
        .map_err(|error| format!("Could not atomically save custom project image: {error}"))?;

    let destination = destination
        .canonicalize()
        .map_err(|error| format!("Could not resolve saved project image: {error}"))?;
    info!(
        "Saved custom image for project '{}'",
        display_path(&project_path)
    );
    Ok(display_path(&destination))
}

pub fn remove_project_image(
    app_handle: &tauri::AppHandle,
    project_path: &str,
) -> Result<(), String> {
    let project_path = launcher::validated_project(project_path)?;
    let image_directory = project_image_directory(app_handle)?;
    let image_id = project_image_id(&project_path);
    remove_project_image_files(&image_directory, &image_id, None)?;

    info!(
        "Removed custom image for project '{}'",
        display_path(&project_path)
    );
    Ok(())
}

pub fn discard_project_image(
    app_handle: &tauri::AppHandle,
    image_path: &str,
) -> Result<(), String> {
    let image_path = validated_managed_image(app_handle, image_path)?;
    fs::remove_file(&image_path)
        .map_err(|error| format!("Could not discard custom project image: {error}"))?;
    info!(
        "Discarded custom project image '{}'",
        display_path(&image_path)
    );
    Ok(())
}

pub fn cleanup_project_images(
    app_handle: &tauri::AppHandle,
    project_path: &str,
    kept_image_path: &str,
) -> Result<(), String> {
    let project_path = launcher::validated_project(project_path)?;
    let kept_image_path = validated_managed_image(app_handle, kept_image_path)?;
    let image_directory = project_image_directory(app_handle)?;
    let image_id = project_image_id(&project_path);
    let kept_file_name = kept_image_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Saved project image filename is invalid".to_string())?;
    if !kept_file_name.starts_with(&format!("{image_id}-")) {
        return Err("Saved image does not belong to the selected project".to_string());
    }
    remove_project_image_files(&image_directory, &image_id, Some(&kept_image_path))
}

pub fn read_project_image(
    app_handle: &tauri::AppHandle,
    image_path: &str,
) -> Result<Vec<u8>, String> {
    let image_path = match launcher::validated_screenshot(image_path) {
        Ok(screenshot_path) => validated_image_file(&display_path(&screenshot_path))?,
        Err(_) => validated_managed_image(app_handle, image_path)?,
    };
    fs::read(&image_path).map_err(|error| format!("Could not read project image: {error}"))
}

fn validated_managed_image(
    app_handle: &tauri::AppHandle,
    image_path: &str,
) -> Result<PathBuf, String> {
    let image_path = validated_image_file(image_path)?;
    let image_directory = project_image_directory(app_handle)?;
    let image_directory = image_directory
        .canonicalize()
        .map_err(|error| format!("Could not resolve project image directory: {error}"))?;
    if !image_path.starts_with(&image_directory) {
        return Err("Custom image is outside the ULaunch project image directory".to_string());
    }
    Ok(image_path)
}

fn validated_image(image_path: &str) -> Result<(PathBuf, &'static str), String> {
    let image_path = validated_image_file(image_path)?;

    let mut reader = ImageReader::open(&image_path)
        .map_err(|error| format!("Could not open project image: {error}"))?
        .with_guessed_format()
        .map_err(|error| format!("Could not identify project image format: {error}"))?;
    let format = reader
        .format()
        .ok_or_else(|| "Could not identify project image format".to_string())?;
    let extension = match format {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpg",
        ImageFormat::WebP => "webp",
        _ => return Err("Image must contain valid PNG, JPEG, or WebP data".to_string()),
    };
    let mut limits = Limits::default();
    limits.max_image_width = Some(8_192);
    limits.max_image_height = Some(8_192);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    let decoded_image = reader
        .decode()
        .map_err(|error| format!("Could not decode project image: {error}"))?;
    if decoded_image.width() == 0 || decoded_image.height() == 0 {
        return Err("Project image dimensions are invalid".to_string());
    }
    Ok((image_path, extension))
}

fn validated_image_file(image_path: &str) -> Result<PathBuf, String> {
    let image_path = Path::new(image_path)
        .canonicalize()
        .map_err(|error| format!("Image does not exist or cannot be accessed: {error}"))?;
    if !image_path.is_file() {
        return Err("Image path must point to a file".to_string());
    }

    let metadata = fs::metadata(&image_path)
        .map_err(|error| format!("Could not inspect project image: {error}"))?;
    if metadata.len() == 0 {
        return Err("Project image is empty".to_string());
    }
    if metadata.len() > MAX_IMAGE_BYTES {
        return Err("Project image is larger than 10 MB".to_string());
    }

    let supported_extension = image_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            IMAGE_EXTENSIONS
                .iter()
                .any(|supported| extension.eq_ignore_ascii_case(supported))
        });
    if !supported_extension {
        return Err("Project image must use a PNG, JPG, JPEG, or WebP extension".to_string());
    }

    Ok(image_path)
}

fn project_image_directory(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map(|path| path.join("project-images"))
        .map_err(|error| format!("Could not resolve application data directory: {error}"))
}

fn project_image_id(project_path: &Path) -> String {
    let normalized_path = display_path(project_path).to_lowercase();
    let digest = Sha256::digest(normalized_path.as_bytes());
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn remove_project_image_files(
    directory: &Path,
    image_id: &str,
    kept_image_path: Option<&Path>,
) -> Result<(), String> {
    if !directory.exists() {
        return Ok(());
    }
    let entries = fs::read_dir(directory)
        .map_err(|error| format!("Could not inspect project image directory: {error}"))?;
    let prefix = format!("{image_id}-");
    let kept_file_name = kept_image_path.and_then(Path::file_name);
    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                warn!("Could not inspect a saved project image: {error}");
                continue;
            }
        };
        let image_path = entry.path();
        if kept_file_name.is_some_and(|kept_name| entry.file_name() == kept_name) {
            continue;
        }
        let matches_project = image_path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.starts_with(&prefix));
        if !matches_project {
            continue;
        }
        fs::remove_file(&image_path)
            .map_err(|error| format!("Could not remove custom project image: {error}"))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use image::{DynamicImage, ImageFormat};
    use tempfile::tempdir;

    use super::{remove_project_image_files, validated_image, validated_image_file};

    #[test]
    fn cleanup_preserves_the_kept_image_by_filename() {
        let directory = tempdir().expect("temporary directory should be created");
        let kept_image = directory.path().join("project-current.png");
        let old_image = directory.path().join("project-old.png");
        fs::write(&kept_image, b"current").expect("kept image should be written");
        fs::write(&old_image, b"old").expect("old image should be written");
        let canonical_kept_image =
            fs::canonicalize(&kept_image).expect("kept image path should be canonicalized");

        remove_project_image_files(directory.path(), "project", Some(&canonical_kept_image))
            .expect("old project images should be cleaned up");

        assert!(kept_image.exists());
        assert!(!old_image.exists());
    }

    #[test]
    fn accepts_a_decodable_supported_image() {
        let directory = tempdir().expect("temporary directory should be created");
        let image_path = directory.path().join("project.png");
        DynamicImage::new_rgba8(1, 1)
            .save_with_format(&image_path, ImageFormat::Png)
            .expect("test image should be saved");

        let result = validated_image(&image_path.to_string_lossy());

        assert!(result.is_ok());
    }

    #[test]
    fn accepts_a_decodable_jpeg_image() {
        let directory = tempdir().expect("temporary directory should be created");
        let image_path = directory.path().join("project.jpeg");
        DynamicImage::new_rgb8(1, 1)
            .save_with_format(&image_path, ImageFormat::Jpeg)
            .expect("test image should be saved");

        let result = validated_image(&image_path.to_string_lossy());

        assert_eq!(
            result.expect("JPEG image should pass full validation").1,
            "jpg"
        );
    }

    #[test]
    fn cheap_validation_accepts_a_jpeg_path_without_decoding() {
        let directory = tempdir().expect("temporary directory should be created");
        let image_path = directory.path().join("project.jpeg");
        fs::write(&image_path, b"not decoded during reads")
            .expect("test image bytes should be written");

        assert!(validated_image_file(&image_path.to_string_lossy()).is_ok());
        assert!(validated_image(&image_path.to_string_lossy()).is_err());
    }

    #[test]
    fn rejects_a_truncated_image_with_a_valid_header() {
        let directory = tempdir().expect("temporary directory should be created");
        let image_path = directory.path().join("broken.png");
        fs::write(
            &image_path,
            [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A],
        )
        .expect("broken image should be written");

        let result = validated_image(&image_path.to_string_lossy());

        assert!(result.is_err());
    }
}
