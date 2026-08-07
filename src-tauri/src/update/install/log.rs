//! アップデート進行状況の追記ログ。失敗時の原因追跡に使う。

use std::fs;
use std::path::Path;

use crate::portable::layout;

pub fn append_update_log(root: &Path, message: &str) -> Result<(), String> {
    use std::io::Write;

    let update_dir = root.join(layout::UPDATE_DIR);
    fs::create_dir_all(&update_dir)
        .map_err(|error| format!("failed to create update log directory: {error}"))?;
    let log_path = update_dir.join(layout::UPDATE_LOG_FILE);
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|error| format!("failed to open update log {}: {error}", log_path.display()))?;
    writeln!(&mut file, "{message}")
        .map_err(|error| format!("failed to write update log {}: {error}", log_path.display()))
}
