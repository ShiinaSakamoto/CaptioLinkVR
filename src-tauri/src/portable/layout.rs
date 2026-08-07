//! ポータブル配布のディレクトリ構成とファイル名を一元定義する。
//! `scripts/portable-layout.json` と値を揃える。

pub const LAUNCHER_EXE: &str = "CaptioLinkVR.exe";
pub const APP_EXE: &str = "captiolink-vr.exe";
pub const RESOURCE_DIR: &str = "resource";
/// 更新ヘルパー配置先。ZIP 互換のためディレクトリ名は `updater` のまま維持する。
pub const MAINTENANCE_DIR: &str = "updater";
pub const APPLY_EXE: &str = "CaptiolinkVRApply.exe";
pub const APPLY_PENDING_EXE: &str = "CaptiolinkVRApply.pending.exe";
pub const LEGACY_APPLY_EXE: &str = "CaptiolinkVRUpdater.exe";
pub const ROOT_MARKER_FILE: &str = ".captiolinkvr-root";
pub const ROOT_ENV: &str = "CAPTIOLINKVR_ROOT";
pub const SETTINGS_FILE: &str = "settings.json";
pub const UPDATE_DIR: &str = "update";
pub const UPDATE_JOB_FILE: &str = "update-job.json";
pub const UPDATE_STAGING_DIR: &str = "update-staging";
pub const RESOURCE_BACKUP_DIR: &str = "resource.bak";
pub const UPDATE_LOG_FILE: &str = "update.log";
pub const PACKAGE_DIR: &str = "CaptioLinkVR";
pub const PACKAGE_ZIP: &str = "CaptioLinkVR.zip";

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    #[test]
    fn portable_layout_matches_json() {
        let json: Value =
            serde_json::from_str(include_str!("../../../scripts/portable-layout.json"))
                .expect("portable-layout.json should parse");

        assert_eq!(LAUNCHER_EXE, json["launcherExe"].as_str().unwrap());
        assert_eq!(APP_EXE, json["appExe"].as_str().unwrap());
        assert_eq!(RESOURCE_DIR, json["resourceDir"].as_str().unwrap());
        assert_eq!(MAINTENANCE_DIR, json["maintenanceDir"].as_str().unwrap());
        assert_eq!(APPLY_EXE, json["applyExe"].as_str().unwrap());
        assert_eq!(ROOT_MARKER_FILE, json["rootMarkerFile"].as_str().unwrap());
        assert_eq!(ROOT_ENV, json["rootEnv"].as_str().unwrap());
        assert_eq!(UPDATE_JOB_FILE, json["updateJobFile"].as_str().unwrap());
        assert_eq!(PACKAGE_DIR, json["packageDir"].as_str().unwrap());
        assert_eq!(PACKAGE_ZIP, json["packageZip"].as_str().unwrap());
    }
}
