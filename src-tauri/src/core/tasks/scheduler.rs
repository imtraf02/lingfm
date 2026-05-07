use std::{
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicU32, Ordering as AOrdering},
};

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::{self, Sender};

static NEXT_ID: AtomicU32 = AtomicU32::new(1);
fn next_id() -> u32 {
    NEXT_ID.fetch_add(1, AOrdering::Relaxed)
}

#[derive(Debug, Clone)]
pub enum ExtractMode {
    Here,
    To(PathBuf),
}

#[derive(Debug, Clone)]
pub enum FileTask {
    Copy {
        id: u32,
        from: PathBuf,
        to: PathBuf,
        force: bool,
    },
    Move {
        id: u32,
        from: PathBuf,
        to: PathBuf,
    },
    Delete {
        id: u32,
        target: PathBuf,
    },
    Trash {
        id: u32,
        target: PathBuf,
    },
    Rename {
        id: u32,
        from: PathBuf,
        new_name: String,
    },
    Extract {
        id: u32,
        from: PathBuf,
        mode: ExtractMode,
    },
}

impl FileTask {
    pub fn id(&self) -> u32 {
        match self {
            Self::Copy { id, .. }
            | Self::Move { id, .. }
            | Self::Delete { id, .. }
            | Self::Trash { id, .. }
            | Self::Rename { id, .. }
            | Self::Extract { id, .. } => *id,
        }
    }

    pub fn kind(&self) -> &'static str {
        match self {
            Self::Copy { .. } => "copy",
            Self::Move { .. } => "move",
            Self::Delete { .. } => "delete",
            Self::Trash { .. } => "trash",
            Self::Rename { .. } => "rename",
            Self::Extract { .. } => "extract",
        }
    }
}

#[derive(Clone, Serialize)]
pub struct TaskProgress {
    pub id: u32,
    pub kind: String,
    pub name: String,
    pub total: u64,
    pub done: u64,
    pub found: u32,
    pub processed: u32,
    pub failed: u32,
}

#[derive(Clone, Serialize)]
pub struct TaskDone {
    pub id: u32,
    pub kind: String,
    pub success: bool,
    pub errors: Vec<String>,
}

#[derive(Clone)]
pub struct FmScheduler {
    tx: Sender<FileTask>,
}

impl FmScheduler {
    pub fn new(app: AppHandle) -> Self {
        let (tx, mut rx) = mpsc::channel::<FileTask>(64);

        tauri::async_runtime::spawn(async move {
            while let Some(task) = rx.recv().await {
                let app2 = app.clone();
                tauri::async_runtime::spawn(async move {
                    run_task(task, app2).await;
                });
            }
        });

        Self { tx }
    }

    pub async fn submit_copy(&self, from: PathBuf, to: PathBuf, force: bool) -> u32 {
        let id = next_id();
        let _ = self.tx.send(FileTask::Copy { id, from, to, force }).await;
        id
    }

    pub async fn submit_move(&self, from: PathBuf, to: PathBuf) -> u32 {
        let id = next_id();
        let _ = self.tx.send(FileTask::Move { id, from, to }).await;
        id
    }

    pub async fn submit_delete(&self, target: PathBuf) -> u32 {
        let id = next_id();
        let _ = self.tx.send(FileTask::Delete { id, target }).await;
        id
    }

    pub async fn submit_trash(&self, target: PathBuf) -> u32 {
        let id = next_id();
        let _ = self.tx.send(FileTask::Trash { id, target }).await;
        id
    }

    pub async fn submit_rename(&self, from: PathBuf, new_name: String) -> u32 {
        let id = next_id();
        let _ = self.tx.send(FileTask::Rename { id, from, new_name }).await;
        id
    }

    pub async fn submit_extract(&self, from: PathBuf, to: PathBuf) -> u32 {
        let id = next_id();
        let _ = self.tx
            .send(FileTask::Extract {
                id,
                from,
                mode: ExtractMode::To(to),
            })
            .await;
        id
    }

    pub async fn submit_extract_here(&self, from: PathBuf) -> u32 {
        let id = next_id();
        let _ = self.tx
            .send(FileTask::Extract {
                id,
                from,
                mode: ExtractMode::Here,
            })
            .await;
        id
    }
}

async fn run_task(task: FileTask, app: AppHandle) {
    let id = task.id();
    let kind = task.kind().to_string();

    let result: Result<(), Vec<String>> = match task {
        FileTask::Copy { from, to, force, .. } => run_copy(&from, &to, force, id, &app).await,
        FileTask::Move { from, to, .. } => run_move(&from, &to, id, &app).await,
        FileTask::Delete { target, .. } => run_delete(&target, id, &app).await,
        FileTask::Trash { target, .. } => run_trash(&target, id, &app).await,
        FileTask::Rename { from, new_name, .. } => run_rename(&from, &new_name, id, &app).await,
        FileTask::Extract { from, mode, .. } => run_extract(&from, mode, id, &app).await,
    };

    let (success, errors) = match result {
        Ok(()) => (true, vec![]),
        Err(errs) => (false, errs),
    };

    let _ = app.emit(
        "task_done",
        TaskDone {
            id,
            kind,
            success,
            errors,
        },
    );
}

fn archive_stem(path: &Path) -> String {
    let name = path.file_name().unwrap_or_default().to_string_lossy();
    for ext in &[".tar.gz", ".tar.bz2", ".tar.xz", ".tar.zst", ".tar.lz4"] {
        if let Some(stem) = name.strip_suffix(ext) {
            return stem.to_string();
        }
    }
    path.file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned()
}

async fn run_extract(
    from: &Path,
    mode: ExtractMode,
    id: u32,
    app: &AppHandle,
) -> Result<(), Vec<String>> {
    let name = from
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    emit_progress(app, id, "extract", &name, 0, 0, 1, 0, 0);

    let resolved_to_dir = match mode {
        ExtractMode::Here => from.parent().unwrap_or_else(|| Path::new("/")).to_path_buf(),
        ExtractMode::To(dir) => dir,
    };

    let final_dest = resolved_to_dir.join(archive_stem(from));

    if let Err(e) = std::fs::create_dir_all(&final_dest) {
        return Err(vec![format!(
            "Failed to create destination directory {}: {e}",
            final_dest.display()
        )]);
    }

    let cmd_name = if which::which("7zz").is_ok() {
        "7zz"
    } else {
        "7z"
    };

    let from_buf = from.to_path_buf();
    let extract_buf = final_dest.clone();
    let cmd = cmd_name.to_string();

    let output = tokio::task::spawn_blocking(move || {
        Command::new(&cmd)
            .args(["x", "-y", "-aoa", "-sccUTF-8"])
            .arg(format!("-o{}", extract_buf.display()))
            .arg(&from_buf)
            .output()
    })
    .await
    .unwrap_or_else(|e| Err(std::io::Error::new(std::io::ErrorKind::Other, e)));

    match output {
        Ok(out) if out.status.success() => {
            emit_progress(app, id, "extract", &name, 0, 0, 1, 1, 0);
            Ok(())
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr).into_owned();
            let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
            Err(vec![format!(
                "7zip exited with code {}. Stderr: {} Stdout: {}",
                out.status.code().unwrap_or(-1),
                stderr,
                stdout
            )])
        }
        Err(e) => Err(vec![format!("Failed to start 7zip: {e}")]),
    }
}

async fn run_copy(
    src: &Path,
    dst: &Path,
    force: bool,
    id: u32,
    app: &AppHandle,
) -> Result<(), Vec<String>> {
    let files = collect_files(src);
    let total_bytes: u64 = files.iter().map(|(_, size)| *size).sum();
    let found = files.len() as u32;
    let mut done_bytes = 0u64;
    let mut processed = 0u32;
    let mut errors = vec![];
    let name = src
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    emit_progress(app, id, "copy", &name, total_bytes, 0, found, 0, 0);

    for (rel_path, _size) in &files {
        let src_path = if src.is_dir() {
            src.join(rel_path)
        } else {
            src.to_path_buf()
        };
        let dst_path = if src.is_dir() {
            dst.join(rel_path)
        } else {
            dst.to_path_buf()
        };

        if !force && dst_path.exists() {
            errors.push(format!("Destination already exists: {}", dst_path.display()));
            continue;
        }

        if let Some(parent) = dst_path.parent() {
            if let Err(e) = tokio::fs::create_dir_all(parent).await {
                errors.push(format!("Cannot create dir {}: {e}", parent.display()));
                continue;
            }
        }

        match tokio::fs::copy(&src_path, &dst_path).await {
            Ok(bytes) => {
                done_bytes += bytes;
                processed += 1;
                emit_progress(
                    app,
                    id,
                    "copy",
                    &name,
                    total_bytes,
                    done_bytes,
                    found,
                    processed,
                    errors.len() as u32,
                );
            }
            Err(e) => {
                errors.push(format!("Cannot copy {}: {e}", src_path.display()));
            }
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

async fn run_move(src: &Path, dst: &Path, id: u32, app: &AppHandle) -> Result<(), Vec<String>> {
    let name = src
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    emit_progress(app, id, "move", &name, 0, 0, 1, 0, 0);

    if tokio::fs::rename(src, dst).await.is_ok() {
        emit_progress(app, id, "move", &name, 0, 0, 1, 1, 0);
        return Ok(());
    }

    run_copy(src, dst, false, id, app).await?;

    if let Err(e) = tokio::fs::remove_dir_all(src).await {
        return Err(vec![format!("Cannot remove source after move: {e}")]);
    }
    Ok(())
}

async fn run_delete(target: &Path, id: u32, app: &AppHandle) -> Result<(), Vec<String>> {
    let name = target
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    emit_progress(app, id, "delete", &name, 0, 0, 1, 0, 0);

    let result = if target.is_dir() {
        tokio::fs::remove_dir_all(target).await
    } else {
        tokio::fs::remove_file(target).await
    };

    if let Err(e) = result {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            let status = Command::new("pkexec")
                .arg("rm")
                .arg("-rf")
                .arg(target)
                .status();
            return match status {
                Ok(s) if s.success() => Ok(()),
                Ok(_) => Err(vec!["Authentication failed or cancelled".into()]),
                Err(e) => Err(vec![format!("Failed to launch pkexec: {e}")]),
            };
        }
        return Err(vec![format!("Cannot delete {}: {e}", target.display())]);
    }

    emit_progress(app, id, "delete", &name, 0, 0, 1, 1, 0);
    Ok(())
}

async fn run_trash(target: &Path, id: u32, app: &AppHandle) -> Result<(), Vec<String>> {
    let name = target
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    emit_progress(app, id, "trash", &name, 0, 0, 1, 0, 0);

    let target_buf = target.to_path_buf();
    let result = tokio::task::spawn_blocking(move || {
        trash::delete(&target_buf)
            .map_err(|e| vec![format!("Cannot trash {}: {e}", target_buf.display())])
    })
    .await
    .unwrap_or_else(|e| Err(vec![format!("Task panicked: {e}")]));

    if let Err(errs) = result {
        let status = Command::new("pkexec")
            .arg("rm")
            .arg("-rf")
            .arg(target)
            .status();
        return match status {
            Ok(s) if s.success() => Ok(()),
            _ => Err(errs),
        };
    }

    emit_progress(app, id, "trash", &name, 0, 0, 1, 1, 0);
    Ok(())
}

async fn run_rename(
    from: &Path,
    new_name: &str,
    id: u32,
    app: &AppHandle,
) -> Result<(), Vec<String>> {
    let to = from.parent().unwrap_or(Path::new("/")).join(new_name);
    let name = from
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    emit_progress(app, id, "rename", &name, 0, 0, 1, 0, 0);

    tokio::fs::rename(from, &to)
        .await
        .map_err(|e| vec![format!("Cannot rename {}: {e}", from.display())])?;

    emit_progress(app, id, "rename", &name, 0, 0, 1, 1, 0);
    Ok(())
}

fn collect_files(root: &Path) -> Vec<(PathBuf, u64)> {
    let mut result = vec![];
    if root.is_file() {
        let size = root.metadata().map(|m| m.len()).unwrap_or(0);
        let name = root.file_name().unwrap_or_default();
        result.push((PathBuf::from(name), size));
        return result;
    }
    collect_recursive(root, root, &mut result);
    result
}

fn collect_recursive(base: &Path, dir: &Path, out: &mut Vec<(PathBuf, u64)>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let rel = path.strip_prefix(base).unwrap_or(&path).to_path_buf();
        let Ok(meta) = entry.metadata() else {
            continue;
        };
        if meta.is_dir() {
            collect_recursive(base, &path, out);
        } else {
            out.push((rel, meta.len()));
        }
    }
}

fn emit_progress(
    app: &AppHandle,
    id: u32,
    kind: &str,
    name: &str,
    total: u64,
    done: u64,
    found: u32,
    processed: u32,
    failed: u32,
) {
    let _ = app.emit(
        "task_progress",
        TaskProgress {
            id,
            kind: kind.to_string(),
            name: name.to_string(),
            total,
            done,
            found,
            processed,
            failed,
        },
    );
}