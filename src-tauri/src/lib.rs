// The whole game is the web bundle in ../dist; this shell just hosts it in a
// native window. No custom commands yet — Steamworks (achievements, cloud
// saves) would hook in here via the `steamworks` crate.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Panelák Tycoon");
}
