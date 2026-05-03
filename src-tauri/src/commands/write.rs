use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::io::{BufRead, BufReader};
use percent_encoding::percent_decode_str;
use tauri::command;
use crate::fs::fns::copy_dir_recursive;

#[command]
pub async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(Path::new(&path))
        .map_err(|e| format!("Cannot create directory '{path}': {e}"))
}

#[command]
pub async fn delete_entry(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {path}"));
    }
    
    let result = if p.is_dir() {
        fs::remove_dir_all(p)
    } else {
        fs::remove_file(p)
    };

    if let Err(e) = result {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            let status = Command::new("pkexec")
                .arg("rm")
                .arg("-rf")
                .arg(p)
                .status();
            
            match status {
                Ok(s) if s.success() => return Ok(()),
                Ok(_) => return Err("Authentication failed or cancelled".into()),
                Err(err) => return Err(format!("Failed to launch pkexec: {err}")),
            }
        }
        return Err(format!("Cannot delete {}: {e}", path));
    }

    Ok(())
}

#[command]
pub async fn move_entry(src: String, dest: String) -> Result<(), String> {
    let src_path = Path::new(&src);
    if !src_path.exists() {
        return Err(format!("Source does not exist: {src}"));
    }
    fs::rename(src_path, Path::new(&dest))
        .map_err(|e| format!("Cannot move entry: {e}"))
}

#[command]
pub async fn copy_entry(src: String, dest: String) -> Result<(), String> {
    let src_path = Path::new(&src);
    let dest_path = Path::new(&dest);
    if !src_path.exists() {
        return Err(format!("Source does not exist: {src}"));
    }
    if src_path.is_dir() {
        copy_dir_recursive(src_path, dest_path)
    } else {
        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::copy(src_path, dest_path)
            .map(|_| ())
            .map_err(|e| format!("Cannot copy file: {e}"))
    }
}

#[command]
pub async fn restore_entry(path: String) -> Result<(), String> {
    let trash_path = Path::new(&path);
    if !trash_path.exists() {
        return Err("File not found in trash".into());
    }

    let filename = trash_path.file_name().ok_or("Invalid filename")?;
    let trash_dir = trash_path.parent().ok_or("Invalid trash directory")?;
    
    let info_dir = trash_dir.parent().ok_or("Invalid trash structure")?.join("info");
    let info_filename = format!("{}.trashinfo", filename.to_string_lossy());
    let info_path = info_dir.join(info_filename);

    if !info_path.exists() {
        return Err(format!("No .trashinfo found at {}", info_path.display()));
    }

    let file = fs::File::open(&info_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut original_path_str = None;

    for line in reader.lines().flatten() {
        if line.starts_with("Path=") {
            let p = line.trim_start_matches("Path=");
            let decoded = percent_decode_str(p).decode_utf8_lossy().into_owned();
            original_path_str = Some(decoded);
            break;
        }
    }

    let original_path_str = original_path_str.ok_or("Original path not found in .trashinfo")?;
    let original_path = PathBuf::from(original_path_str);

    if let Some(parent) = original_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dir: {e}"))?;
    }

    fs::rename(trash_path, &original_path).map_err(|e| format!("Failed to move file back: {e}"))?;
    
    let _ = fs::remove_file(info_path);

    Ok(())
}

#[command]
pub async fn undo_trash(original_path: String) -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|_| "HOME env var not set")?;
    let info_dir = Path::new(&home).join(".local/share/Trash/info");
    
    if !info_dir.exists() {
        return Err("Trash info directory not found".into());
    }

    let mut best_match = None;
    let mut best_mtime = std::time::UNIX_EPOCH;

    if let Ok(entries) = fs::read_dir(&info_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "trashinfo") {
                if let Ok(file) = fs::File::open(&path) {
                    let reader = BufReader::new(file);
                    for line in reader.lines().flatten() {
                        if line.starts_with("Path=") {
                            let p = line.trim_start_matches("Path=");
                            let decoded = percent_decode_str(p).decode_utf8_lossy().into_owned();
                            if decoded == original_path {
                                if let Ok(meta) = fs::metadata(&path) {
                                    if let Ok(mtime) = meta.modified() {
                                        if mtime > best_mtime {
                                            best_mtime = mtime;
                                            best_match = Some(path.clone());
                                        }
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    if let Some(info_path) = best_match {
        let filename = info_path.file_stem().ok_or("Invalid info filename")?;
        let trash_files_dir = info_dir.parent().ok_or("Invalid trash structure")?.join("files");
        let trash_file_path = trash_files_dir.join(filename);
        
        if !trash_file_path.exists() {
            return Err("Trashed file not found in files/ directory".into());
        }

        let original_path_buf = PathBuf::from(original_path);
        if let Some(parent) = original_path_buf.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dir: {e}"))?;
        }

        fs::rename(&trash_file_path, &original_path_buf).map_err(|e| format!("Failed to move file back: {e}"))?;
        let _ = fs::remove_file(info_path);
        Ok(())
    } else {
        Err(format!("Could not find '{}' in Trash metadata", original_path))
    }
}
