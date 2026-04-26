// Utility-side shell. Deliberately no `invoke_handler` with signer commands —
// this binary only verifies bundles, it does not mint them. The Rust-side
// Tauri plugins are scoped to dialog open + read-only fs for loading a
// bundle.json file chosen by the user.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
