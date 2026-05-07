mod commands;
mod shared;
mod core;
mod fs;
mod watcher;

use core::tasks::scheduler::FmScheduler;
use tauri::Manager;
use tokio::sync::Mutex;
use watcher::watcher::FmWatcher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let scheduler = FmScheduler::new(app.handle().clone());
            app.manage(scheduler);

            let handle = app.handle().clone();
            let fw = FmWatcher::new(handle).expect("Failed to create file watcher");
            app.manage(Mutex::new(fw));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::read::read_dir_rich,
            commands::read::read_directory,
            commands::read::get_entry_properties,
            commands::write::create_directory,
            commands::write::delete_entry,
            commands::write::move_entry,
            commands::write::copy_entry,
            commands::write::restore_entry,
            commands::write::undo_trash,
            commands::search::search_entries,
            commands::search::fzf_filter,
            commands::tasks::async_copy,
            commands::tasks::async_move,
            commands::tasks::async_delete,
            commands::tasks::async_trash,
            commands::tasks::async_rename,
            commands::tasks::async_extract,
            commands::tasks::async_extract_here,
            commands::system::copy_files_to_system_clipboard,
            commands::system::is_wayland,
            commands::system::watch_dir,
            commands::system::unwatch_dir,
            commands::system::get_cli_args,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
