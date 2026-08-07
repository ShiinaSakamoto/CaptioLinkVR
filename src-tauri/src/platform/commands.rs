use tauri::command;

use crate::platform::open;

#[command]
pub fn open_external_url(url: String) -> Result<(), String> {
    open::open_external_url(&url)
}
