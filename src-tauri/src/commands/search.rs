use tauri::command;
use crate::fs::file::FileEntry;
use crate::fs::search::{search_entries as fs_search, fzf_filter as fs_fzf};

#[command]
pub async fn search_entries(root: String, query: String) -> Result<Vec<FileEntry>, String> {
    fs_search(root, query).await
}

#[command]
pub async fn fzf_filter(paths: Vec<String>, query: String) -> Result<Vec<String>, String> {
    fs_fzf(paths, query).await
}
