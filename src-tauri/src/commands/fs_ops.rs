use serde::Serialize;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use tauri::command;

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
    pub extension: Option<String>,
}

#[derive(Serialize)]
pub struct EntryProperties {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub size_on_disk: u64,
    pub modified: u64,
    pub created: u64,
    pub is_readonly: bool,
    pub item_count: Option<u64>, // only for dirs
}

#[command]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    println!("[lingfm] read_directory: path={:?}", path);

    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let entries = fs::read_dir(dir_path).map_err(|e| {
        format!("Cannot read directory '{}': {} (os error {:?})", path, e, e.raw_os_error())
    })?;

    let mut file_entries = Vec::new();

    for entry in entries {
        match entry {
            Ok(entry) => {
                let entry_path = entry.path();
                let metadata = match fs::metadata(&entry_path) {
                    Ok(m) => m,
                    Err(e) => {
                        println!("[lingfm] WARN: skipping {:?} - metadata error: {}", entry_path, e);
                        continue;
                    }
                };
                let name = entry.file_name().to_string_lossy().to_string();
                let modified = metadata
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                file_entries.push(FileEntry {
                    name,
                    path: entry_path.to_string_lossy().to_string(),
                    is_dir: entry_path.is_dir(),
                    size: metadata.len(),
                    modified,
                    extension: entry_path.extension().map(|e| e.to_string_lossy().to_string()),
                });
            }
            Err(e) => println!("[lingfm] WARN: entry error: {}", e),
        }
    }

    file_entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    println!("[lingfm] OK: {} entries from '{}'", file_entries.len(), path);
    Ok(file_entries)
}

#[command]
pub async fn get_entry_properties(path: String) -> Result<EntryProperties, String> {
    let p = Path::new(&path);
    let metadata = fs::metadata(p).map_err(|e| format!("Cannot read metadata: {}", e))?;

    let name = p.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    let modified = metadata.modified().ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let created = metadata.created().ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let is_dir = metadata.is_dir();

    // For directories, count immediate children
    let item_count = if is_dir {
        fs::read_dir(p).ok().map(|entries| entries.count() as u64)
    } else {
        None
    };

    // Size on disk: for dirs, sum recursively (capped to avoid hang on huge dirs)
    let size_on_disk = if is_dir {
        dir_size(p).unwrap_or(0)
    } else {
        metadata.len()
    };

    Ok(EntryProperties {
        name,
        path: path.clone(),
        is_dir,
        size: metadata.len(),
        size_on_disk,
        modified,
        created,
        is_readonly: metadata.permissions().readonly(),
        item_count,
    })
}

fn dir_size(path: &Path) -> Result<u64, String> {
    let mut total = 0u64;
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta = match fs::metadata(entry.path()) {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.is_dir() {
            total += dir_size(&entry.path()).unwrap_or(0);
        } else {
            total += meta.len();
        }
    }
    Ok(total)
}

#[command]
pub async fn delete_entry(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("Cannot delete directory: {}", e))
    } else {
        fs::remove_file(p).map_err(|e| format!("Cannot delete file: {}", e))
    }
}

#[command]
pub async fn copy_entry(src: String, dest: String) -> Result<(), String> {
    let src_path = Path::new(&src);
    let dest_path = Path::new(&dest);

    if !src_path.exists() {
        return Err(format!("Source does not exist: {}", src));
    }

    if src_path.is_dir() {
        copy_dir_recursive(src_path, dest_path)
    } else {
        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::copy(src_path, dest_path)
            .map(|_| ())
            .map_err(|e| format!("Cannot copy file: {}", e))
    }
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("Cannot create dir: {}", e))?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let dest_child = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_recursive(&entry.path(), &dest_child)?;
        } else {
            fs::copy(entry.path(), &dest_child)
                .map_err(|e| format!("Cannot copy {:?}: {}", entry.path(), e))?;
        }
    }
    Ok(())
}

#[command]
pub async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(Path::new(&path))
        .map_err(|e| format!("Cannot create directory '{}': {}", path, e))
}

#[command]
pub async fn search_entries(
    root: String,
    query: String,
) -> Result<Vec<FileEntry>, String> {
    let query_lower = query.to_lowercase();
    let root_path = Path::new(&root);
    let mut results = Vec::new();
    search_recursive(root_path, &query_lower, &mut results, 0);
    Ok(results)
}

fn search_recursive(dir: &Path, query: &str, results: &mut Vec<FileEntry>, depth: u32) {
    // Cap depth and result count to avoid performance issues
    if depth > 8 || results.len() >= 500 {
        return;
    }
    let read = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };
    for entry in read.flatten() {
        if results.len() >= 500 {
            break;
        }
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files at depth 0 (but allow deeper)
        if depth == 0 && name.starts_with('.') {
            continue;
        }

        if name.to_lowercase().contains(query) {
            if let Ok(metadata) = fs::metadata(&entry_path) {
                let modified = metadata
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                results.push(FileEntry {
                    name: name.clone(),
                    path: entry_path.to_string_lossy().to_string(),
                    is_dir: metadata.is_dir(),
                    size: metadata.len(),
                    modified,
                    extension: entry_path.extension().map(|e| e.to_string_lossy().to_string()),
                });
            }
        }

        // Recurse into directories
        if entry_path.is_dir() {
            search_recursive(&entry_path, query, results, depth + 1);
        }
    }
}
