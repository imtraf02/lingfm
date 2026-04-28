mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::fs_ops::read_directory,
            commands::fs_ops::get_entry_properties,
            commands::fs_ops::delete_entry,
            commands::fs_ops::copy_entry,
            commands::fs_ops::create_directory,
            commands::fs_ops::search_entries,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
