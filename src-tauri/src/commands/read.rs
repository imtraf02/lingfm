use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use tauri::command;
use crate::fs::cha::{read_cha, systime_secs};
use crate::fs::file::{RichFileEntry, FileEntry, EntryProperties, SortOptions};
use crate::fs::sorter::sort_rich_entries;
use crate::fs::fns::dir_size;
use crate::shared::natsort::natsort;

#[command]
pub async fn read_dir_rich(
    path: String,
    sort: Option<SortOptions>,
) -> Result<Vec<RichFileEntry>, String> {
    let dir = Path::new(&path);
    if !dir.exists() {
        return Err(format!("Path does not exist: {path}"));
    }
    if !dir.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }

    let opts = sort.unwrap_or_default();
    let show_hidden = opts.show_hidden.unwrap_or(false);

    let entries = fs::read_dir(dir).map_err(|e| format!("Cannot read dir: {e}"))?;

    let mut items: Vec<RichFileEntry> = entries
        .flatten()
        .filter_map(|entry| {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();

            let cha = read_cha(&entry_path).ok()?;

            if !show_hidden && cha.is_hidden {
                return None;
            }

            Some(RichFileEntry {
                is_dir:    cha.file_type.is_dir(),
                is_link:   cha.is_link,
                is_hidden: cha.is_hidden,
                is_orphan: cha.is_orphan,
                size:      cha.len,
                mode:      cha.mode,
                uid:       cha.uid,
                gid:       cha.gid,
                nlink:     cha.nlink,
                atime:     systime_secs(cha.atime),
                btime:     systime_secs(cha.btime),
                ctime:     systime_secs(cha.ctime),
                mtime:     systime_secs(cha.mtime),
                extension: entry_path
                    .extension()
                    .map(|e| e.to_string_lossy().into_owned()),
                link_to:   cha.link_to,
                path:      entry_path.to_string_lossy().into_owned(),
                name,
            })
        })
        .collect();

    sort_rich_entries(&mut items, opts);

    Ok(items)
}

#[command]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let dir_path = Path::new(&path);
    if !dir_path.exists() {
        return Err(format!("Path does not exist: {path}"));
    }
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }

    let entries = fs::read_dir(dir_path)
        .map_err(|e| format!("Cannot read directory '{path}': {e}"))?;

    let mut file_entries: Vec<FileEntry> = entries
        .flatten()
        .filter_map(|entry| {
            let entry_path = entry.path();
            let metadata = fs::metadata(&entry_path).ok()?;
            let name = entry.file_name().to_string_lossy().into_owned();
            let modified = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            Some(FileEntry {
                name,
                path: entry_path.to_string_lossy().into_owned(),
                is_dir: entry_path.is_dir(),
                size: metadata.len(),
                modified,
                extension: entry_path.extension().map(|e| e.to_string_lossy().into_owned()),
            })
        })
        .collect();

    file_entries.sort_unstable_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            natsort(a.name.as_bytes(), b.name.as_bytes(), true)
        }
    });

    Ok(file_entries)
}

#[command]
pub async fn get_entry_properties(path: String) -> Result<EntryProperties, String> {
    let p = Path::new(&path);
    let metadata = fs::metadata(p).map_err(|e| format!("Cannot read metadata: {e}"))?;

    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.clone());

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let created = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let is_dir = metadata.is_dir();
    let item_count =
        if is_dir { fs::read_dir(p).ok().map(|e| e.count() as u64) } else { None };
    let size_on_disk = if is_dir { dir_size(p).unwrap_or(0) } else { metadata.len() };

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
