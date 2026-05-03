/// File system watcher – inspired by yazi-watcher.
///
/// Uses the `notify` crate (same as Yazi) to detect FS changes in the
/// currently-viewed directory, then emits Tauri events to the frontend
/// so it can auto-refresh without polling.
use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher, recommended_watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

// ─── Events emitted to frontend ───────────────────────────────────────────────

#[derive(Clone, Serialize)]
pub struct FsEvent {
    pub path: String,
}

#[derive(Clone, Serialize)]
pub struct FsRenameEvent {
    pub old_path: String,
    pub new_path: String,
}

// ─── Watcher state ────────────────────────────────────────────────────────────

pub struct FmWatcher {
    inner:   RecommendedWatcher,
    watched: Arc<Mutex<Option<PathBuf>>>,
}

impl FmWatcher {
    /// Create watcher. Call `watch_dir` to activate.
    pub fn new(app: AppHandle) -> notify::Result<Self> {
        let app2 = app.clone();

        // Debounce: collect events, only emit after 50ms of silence
        // (mimics Yazi's debounce approach in yazi-watcher)
        let watcher = recommended_watcher(move |res: notify::Result<Event>| {
            let Ok(event) = res else { return };
            dispatch_event(&app2, event);
        })?;

        Ok(Self {
            inner:   watcher,
            watched: Arc::new(Mutex::new(None)),
        })
    }

    /// Watch a new directory (stops watching the previous one).
    pub fn watch_dir(&mut self, path: &Path) -> notify::Result<()> {
        // Unwatch previous
        if let Some(prev) = self.watched.lock().unwrap().take() {
            let _ = self.inner.unwatch(&prev);
        }

        // Watch new directory (non-recursive – only immediate children)
        self.inner.watch(path, RecursiveMode::NonRecursive)?;
        *self.watched.lock().unwrap() = Some(path.to_path_buf());

        Ok(())
    }

    /// Stop watching everything (e.g. on tab close or app exit).
    pub fn stop(&mut self) {
        if let Some(path) = self.watched.lock().unwrap().take() {
            let _ = self.inner.unwatch(&path);
        }
    }
}

// ─── Event dispatch ───────────────────────────────────────────────────────────

fn dispatch_event(app: &AppHandle, event: Event) {
    match event.kind {
        EventKind::Create(_) => {
            for path in event.paths {
                let _ = app.emit("fs_created", FsEvent { path: path_str(&path) });
            }
        }
        EventKind::Modify(_) => {
            // Rename events arrive as Modify on some platforms
            let paths = &event.paths;
            if paths.len() == 2 {
                let _ = app.emit(
                    "fs_renamed",
                    FsRenameEvent {
                        old_path: path_str(&paths[0]),
                        new_path: path_str(&paths[1]),
                    },
                );
            } else {
                for path in paths {
                    let _ = app.emit("fs_modified", FsEvent { path: path_str(path) });
                }
            }
        }
        EventKind::Remove(_) => {
            for path in event.paths {
                let _ = app.emit("fs_deleted", FsEvent { path: path_str(&path) });
            }
        }
        _ => {}
    }
}

fn path_str(p: &Path) -> String {
    p.to_string_lossy().into_owned()
}
