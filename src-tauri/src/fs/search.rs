use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::io::Write;
use crate::fs::file::FileEntry;

pub async fn search_entries(root: String, query: String) -> Result<Vec<FileEntry>, String> {
    let root_path = Path::new(&root);
    if !root_path.exists() {
        return Err(format!("Root path does not exist: {root}"));
    }

    let mut child = Command::new("fd")
        .arg("--base-directory").arg(&root)
        .arg("--hidden")
        .arg("--ignore-case")
        .arg(&query)
        .stdout(Stdio::piped())
        .spawn()
        .or_else(|_| {
            Command::new("fdfind")
                .arg("--base-directory").arg(&root)
                .arg("--hidden")
                .arg("--ignore-case")
                .arg(&query)
                .stdout(Stdio::piped())
                .spawn()
        })
        .or_else(|_| {
            Command::new("find")
                .arg(&root)
                .arg("-iname").arg(format!("*{query}*"))
                .stdout(Stdio::piped())
                .spawn()
        })
        .map_err(|e| format!("Failed to start search process: {e}"))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);
    let mut results = Vec::new();

    for line in reader.lines().flatten().take(500) {
        let entry_path = if line.starts_with('/') {
            PathBuf::from(line)
        } else {
            root_path.join(line)
        };

        if let Ok(metadata) = fs::metadata(&entry_path) {
            let name = entry_path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
            let modified = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            results.push(FileEntry {
                name,
                path: entry_path.to_string_lossy().into_owned(),
                is_dir: metadata.is_dir(),
                size: metadata.len(),
                modified,
                extension: entry_path.extension().map(|e| e.to_string_lossy().into_owned()),
            });
        }
    }

    let _ = child.kill();
    Ok(results)
}

pub async fn fzf_filter(paths: Vec<String>, query: String) -> Result<Vec<String>, String> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    let mut child = Command::new("fzf")
        .arg("-f")
        .arg(&query)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn fzf: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        for path in &paths {
            let _ = writeln!(stdin, "{}", path);
        }
    }

    let output = child.wait_with_output().map_err(|e| format!("Failed to wait on fzf: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: Vec<String> = stdout.lines().map(|s| s.to_string()).collect();
    
    Ok(result)
}
