#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Lecture/écriture du dossier projet (cosmos.json + cartes/*.md)
    .plugin(tauri_plugin_fs::init())
    // Sélecteur de dossier natif
    .plugin(tauri_plugin_dialog::init())
    // Le dossier choisi par l'auteur reste autorisé d'un lancement à l'autre. Sans cela, un projet
    // hors du dossier personnel (autre disque, OneDrive déplacé) est refusé au redémarrage.
    // À déclarer après le plugin fs.
    .plugin(tauri_plugin_persisted_scope::init())
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
    .expect("erreur au lancement de Cosmos");
}
