use std::fs;
use std::path::Path;

pub fn dir_size(path: &Path) -> Result<u64, String> {
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

pub fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("Cannot create dir: {e}"))?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let path = entry.path();
        let dest_child = dst.join(entry.file_name());

        if file_type.is_symlink() {
            #[cfg(unix)]
            {
                use std::os::unix::fs::symlink;
                if let Ok(target) = fs::read_link(&path) {
                    if let Err(_e) = symlink(target, &dest_child) {
                        if !path.is_dir() {
                            fs::copy(&path, &dest_child).map(|_| ()).map_err(|e| e.to_string())?;
                        } else {
                            copy_dir_recursive(&path, &dest_child)?;
                        }
                    }
                }
            }
            #[cfg(not(unix))]
            {
                if path.is_dir() {
                    copy_dir_recursive(&path, &dest_child)?;
                } else {
                    fs::copy(&path, &dest_child).map(|_| ()).map_err(|e| e.to_string())?;
                }
            }
        } else if file_type.is_dir() {
            copy_dir_recursive(&path, &dest_child)?;
        } else {
            fs::copy(&path, &dest_child)
                .map_err(|e| format!("Cannot copy {:?}: {e}", path))?;
        }
    }
    Ok(())
}
