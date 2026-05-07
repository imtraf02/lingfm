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
