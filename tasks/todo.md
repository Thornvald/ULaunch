# ULaunch Development Plan

## Core Features
- [x] Initialize Tauri app and set up TailwindCSS for styling.
- [x] Set up basic UI with Neumorphism aesthetic.
- [x] Implement Backend: Detect Unreal Engine paths (`detect_engines`).
- [x] Implement Backend: Open folder dialog (`add_scan_directory`).
- [x] Implement Backend: Open file dialog for `.uproject` (`add_uproject_file`).
- [x] Implement Backend: Scan folders for `.uproject` files asynchronously (`scan_directories`).
- [x] Implement Backend: Launch `.uproject` or `UnrealEditor.exe`.
- [x] Add Tauri `store` plugin to save paths across restarts.
- [x] Implement custom `asset://` protocol to load `AutoScreenshot.png` correctly.
- [x] Display Projects in grid.
- [x] Configure frameless window controls (Minimize, Maximize, Close).
- [x] Update app icons and executable name for Task Manager.
- [x] Add `.sln` detection and launching.
- [ ] Test the application flow.

## Review Section
- Fixed window control permissions in `default.json`.
- Enabled `assetProtocol` in `tauri.conf.json` for proper image loading.
- Generated app icons from root `icon.png`.
- Updated Cargo.toml to compile as `ulaunch`.
- Added support for finding `.sln` files next to `.uproject` files.
- Added IDE Code icon to card hover state that launches `.sln` independently.