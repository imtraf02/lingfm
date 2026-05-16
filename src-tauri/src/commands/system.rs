use std::path::Path;
use tauri::{State, command};
use tokio::sync::Mutex;
use crate::watcher::watcher::FmWatcher;

#[command]
pub fn copy_files_to_system_clipboard(paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Ok(());
    }

    let uri_list: String = paths
        .iter()
        .map(|p| {
            if let Ok(u) = tauri::Url::from_file_path(p) {
                format!("{}\r\n", u.as_str())
            } else {
                format!("file://{p}\r\n")
            }
        })
        .collect();

    let plain_text = paths.join("\n");

    let mut gnome_data = b"copy\n".to_vec();
    gnome_data.extend_from_slice(uri_list.as_bytes());

    use wl_clipboard_rs::copy::{MimeSource, MimeType, Options, Source};
    Options::new()
        .copy_multi(vec![
            MimeSource {
                source:    Source::Bytes(uri_list.into_bytes().into()),
                mime_type: MimeType::Specific("text/uri-list".to_string()),
            },
            MimeSource {
                source:    Source::Bytes(gnome_data.into()),
                mime_type: MimeType::Specific("x-special/gnome-copied-files".to_string()),
            },
            MimeSource {
                source:    Source::Bytes(plain_text.into_bytes().into()),
                mime_type: MimeType::Text,
            },
        ])
        .map_err(|e| format!("Clipboard write failed: {e}"))?;

    Ok(())
}

#[command]
pub fn is_wayland() -> bool {
    std::env::var("XDG_SESSION_TYPE")
        .map(|v| v == "wayland")
        .unwrap_or(false)
        || std::env::var("WAYLAND_DISPLAY").is_ok()
}

#[command]
pub async fn watch_dir(
    path: String,
    watcher: State<'_, Mutex<FmWatcher>>,
) -> Result<(), String> {
    watcher
        .lock()
        .await
        .watch_dir(Path::new(&path))
        .map_err(|e| format!("Cannot watch dir: {e}"))
}

#[command]
pub async fn unwatch_dir(
    watcher: State<'_, Mutex<FmWatcher>>,
) -> Result<(), String> {
    watcher.lock().await.stop();
    Ok(())
}

#[command]
pub fn get_cli_args() -> Vec<String> {
    std::env::args().collect()
}

/// Open a file using the system default application.
/// Mirrors yazi's `open` opener rule:
///   Linux:   xdg-open %s1  (orphan — detached from parent process)
///   macOS:   open %s
///   Windows: start "" %s1  (orphan)
#[command]
pub fn open_entry(path: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("xdg-open failed: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("open failed: {e}"))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("start failed: {e}"))?;
    }

    Ok(())
}

#[command]
pub fn open_with(path: String, cmd: String) -> Result<(), String> {
    std::process::Command::new(&cmd)
        .arg(&path)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to run '{cmd}': {e}"))?;

    Ok(())
}
