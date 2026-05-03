mod commands;
mod cha;
mod natsort;
mod scheduler;
mod watcher;

use tauri::Manager;
use scheduler::FmScheduler;
use tokio::sync::Mutex;
use watcher::FmWatcher;


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
            // ── Legacy (backward-compat) ──────────────────────────────────────
            commands::fs_ops::read_directory,
            commands::fs_ops::get_entry_properties,
            commands::fs_ops::delete_entry,
            commands::fs_ops::move_entry,
            commands::fs_ops::copy_entry,
            commands::fs_ops::create_directory,
            commands::fs_ops::search_entries,
            commands::fs_ops::copy_files_to_system_clipboard,
            commands::fs_ops::fzf_filter,
            // ── Rich FS (Yazi-inspired) ───────────────────────────────────────
            commands::fs_ops::read_dir_rich,
            // ── Async task scheduler ─────────────────────────────────────────
            commands::fs_ops::async_copy,
            commands::fs_ops::async_move,
            commands::fs_ops::async_delete,
            commands::fs_ops::async_trash,
            commands::fs_ops::async_rename,
            // ── File watcher ─────────────────────────────────────────────────
            commands::fs_ops::watch_dir,
            commands::fs_ops::unwatch_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
