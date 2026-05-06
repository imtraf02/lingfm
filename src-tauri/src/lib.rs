mod commands;
mod shared;
mod core;
mod fs;
mod watcher;

use tauri::Manager;
use core::tasks::scheduler::FmScheduler;
use tokio::sync::Mutex;
use watcher::watcher::FmWatcher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_drag::init())
        .setup(|app| {
            // Initialise the async scheduler (inspired by yazi-scheduler)
            let scheduler = FmScheduler::new(app.handle().clone());
            app.manage(scheduler);

            // Initialise the file watcher (inspired by yazi-watcher)
            let handle = app.handle().clone();
            let fw = FmWatcher::new(handle)
                .expect("Failed to create file watcher");
            app.manage(Mutex::new(fw));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ── Read ─────────────────────────────────────────────────────────
            commands::read::read_dir_rich,
            commands::read::read_directory,
            commands::read::get_entry_properties,
            // ── Write ────────────────────────────────────────────────────────
            commands::write::create_directory,
            commands::write::delete_entry,
            commands::write::move_entry,
            commands::write::copy_entry,
            commands::write::restore_entry,
            commands::write::undo_trash,
            // ── Search ───────────────────────────────────────────────────────
            commands::search::search_entries,
            commands::search::fzf_filter,
            // ── Tasks ────────────────────────────────────────────────────────
            commands::tasks::async_copy,
            commands::tasks::async_move,
            commands::tasks::async_delete,
            commands::tasks::async_trash,
            commands::tasks::async_rename,
            // ── System ───────────────────────────────────────────────────────
            commands::system::copy_files_to_system_clipboard,
            commands::system::is_wayland,
            commands::system::watch_dir,
            commands::system::unwatch_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
