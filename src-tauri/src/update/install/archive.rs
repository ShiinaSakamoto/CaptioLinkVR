//! 更新ZIPの展開。エントリ名は信用できないため、必ず正規化してから書き出す。

use std::fs::{self, File};
use std::io::copy;
use std::path::{Component, Path, PathBuf};

use zip::read::ZipArchive;

use crate::portable::layout;

pub fn extract_zip(zip_path: &Path, destination: &Path) -> Result<(), String> {
    let file =
        File::open(zip_path).map_err(|error| format!("failed to open update zip: {error}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|error| format!("failed to read update zip: {error}"))?;

    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| format!("failed to read zip entry: {error}"))?;
        let Some(relative_path) = sanitize_zip_entry_path(entry.name()) else {
            continue;
        };
        if should_skip_update_path(&relative_path) {
            continue;
        }

        let output_path = destination.join(&relative_path);
        if entry.is_dir() {
            fs::create_dir_all(&output_path).map_err(|error| {
                format!(
                    "failed to create directory {}: {error}",
                    output_path.display()
                )
            })?;
            continue;
        }

        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                format!(
                    "failed to create parent directory {}: {error}",
                    parent.display()
                )
            })?;
        }

        let mut output = File::create(&output_path)
            .map_err(|error| format!("failed to create file {}: {error}", output_path.display()))?;
        copy(&mut entry, &mut output)
            .map_err(|error| format!("failed to extract {}: {error}", output_path.display()))?;
    }

    Ok(())
}

/// ZIPエントリ名を展開先に収まる相対パスへ正規化する。
/// 絶対パス・親ディレクトリ参照・ドライブ指定を含むものは None にして展開対象から外す。
/// これを通さないと `../` を含むエントリで展開先の外へ書き出せてしまう（zip slip）。
fn sanitize_zip_entry_path(raw: &str) -> Option<PathBuf> {
    let path = Path::new(raw);
    if path.is_absolute() {
        return None;
    }

    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => normalized.push(part),
            Component::CurDir => {}
            _ => return None,
        }
    }

    if normalized.as_os_str().is_empty() {
        None
    } else {
        Some(normalized)
    }
}

/// ユーザー設定は更新で上書きしない。
fn should_skip_update_path(path: &Path) -> bool {
    path.components().any(
        |component| matches!(component, Component::Normal(name) if name == layout::SETTINGS_FILE),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_relative_entry_is_kept() {
        assert_eq!(
            sanitize_zip_entry_path("CaptioLinkVR/resource/app.js"),
            Some(PathBuf::from("CaptioLinkVR/resource/app.js"))
        );
    }

    #[test]
    fn current_directory_segments_are_stripped() {
        assert_eq!(
            sanitize_zip_entry_path("./CaptioLinkVR/./resource/app.js"),
            Some(PathBuf::from("CaptioLinkVR/resource/app.js"))
        );
    }

    // zip slip: 親ディレクトリ参照で展開先の外へ書き出す攻撃を拒否する。
    #[test]
    fn parent_directory_traversal_is_rejected() {
        assert_eq!(sanitize_zip_entry_path("../evil.exe"), None);
        assert_eq!(sanitize_zip_entry_path("a/../../evil.exe"), None);
        assert_eq!(sanitize_zip_entry_path("CaptioLinkVR/../../evil.dll"), None);
        assert_eq!(sanitize_zip_entry_path(".."), None);
    }

    #[test]
    fn absolute_entry_paths_are_rejected() {
        assert_eq!(sanitize_zip_entry_path("/etc/passwd"), None);
        assert_eq!(
            sanitize_zip_entry_path("C:\\Windows\\System32\\evil.dll"),
            None
        );
        assert_eq!(sanitize_zip_entry_path("\\\\server\\share\\evil.dll"), None);
    }

    #[test]
    fn empty_entry_names_are_rejected() {
        assert_eq!(sanitize_zip_entry_path(""), None);
        assert_eq!(sanitize_zip_entry_path("."), None);
        assert_eq!(sanitize_zip_entry_path("./"), None);
    }

    // 正規化後のパスが展開先の外へ出ないことを、結合結果でも確かめる。
    #[test]
    fn sanitized_paths_always_stay_under_destination() {
        let destination = Path::new("C:\\app\\update-staging\\extracted");
        for raw in [
            "resource/app.js",
            "./resource/nested/deep/file.dat",
            "CaptioLinkVR/updater/CaptiolinkVRApply.exe",
        ] {
            let sanitized = sanitize_zip_entry_path(raw).expect("entry must be accepted");
            assert!(destination.join(&sanitized).starts_with(destination));
        }
    }

    #[test]
    fn settings_file_is_skipped_at_any_depth() {
        assert!(should_skip_update_path(Path::new(layout::SETTINGS_FILE)));
        assert!(should_skip_update_path(Path::new(
            "CaptioLinkVR/settings.json"
        )));
        assert!(should_skip_update_path(Path::new(
            "CaptioLinkVR/resource/settings.json"
        )));
    }

    #[test]
    fn other_json_files_are_not_skipped() {
        assert!(!should_skip_update_path(Path::new("resource/catalog.json")));
        assert!(!should_skip_update_path(Path::new("settings.json.bak")));
        assert!(!should_skip_update_path(Path::new("my-settings.json")));
    }
}
