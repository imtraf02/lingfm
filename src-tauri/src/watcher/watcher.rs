use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher, recommended_watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct FsEvent {
    pub path: String,
}

#[derive(Clone, Serialize)]
pub struct FsRenameEvent {
    pub old_path: String,
    pub new_path: String,
}

pub struct FmWatcher {
    inner:   RecommendedWatcher,
    watched: Arc<Mutex<Option<PathBuf>>>,
}

impl FmWatcher {
    pub fn new(app: AppHandle) -> notify::Result<Self> {
        let app2 = app.clone();

        let watcher = recommended_watcher(move |res: notify::Result<Event>| {
            let Ok(event) = res else { return };
            dispatch_event(&app2, event);
        })?;

        Ok(Self {
            inner:   watcher,
            watched: Arc::new(Mutex::new(None)),
        })
    }

    pub fn watch_dir(&mut self, path: &Path) -> notify::Result<()> {
        if let Some(prev) = self.watched.lock().unwrap().take() {
            let _ = self.inner.unwatch(&prev);
        }

        self.inner.watch(path, RecursiveMode::NonRecursive)?;
        *self.watched.lock().unwrap() = Some(path.to_path_buf());

        Ok(())
    }

    pub fn stop(&mut self) {
        if let Some(path) = self.watched.lock().unwrap().take() {
            let _ = self.inner.unwatch(&path);
        }
    }
}

fn dispatch_event(app: &AppHandle, event: Event) {
    match event.kind {
        EventKind::Create(_) => {
            for path in event.paths {
                let _ = app.emit("fs_created", FsEvent { path: path_str(&path) });
            }
        }
        EventKind::Modify(_) => {
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
