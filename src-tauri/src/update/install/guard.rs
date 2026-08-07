//! 破壊的なファイル操作の安全弁。
//! 更新ジョブのパスは改ざんされうるため、削除・置換の前に必ずここで範囲を確認する。

use std::fs;
use std::path::{Path, PathBuf};

use crate::portable::{layout, marker};

/// ポータブルルートとして使って良いディレクトリかを確認し、絶対パスへ解決する。
/// ドライブ直下やマーカーの無い場所を弾き、無関係なフォルダを更新対象にしない。
pub fn ensure_safe_root(root: &Path) -> Result<PathBuf, String> {
    let absolute = fs::canonicalize(root)
        .map_err(|error| format!("failed to resolve portable root: {error}"))?;

    if absolute.parent().is_none() {
        return Err(format!(
            "refusing to use drive root as update target: {}",
            absolute.display()
        ));
    }
    if !marker::has_root_marker(&absolute) {
        return Err(format!(
            "portable root marker was not found under {}",
            absolute.display()
        ));
    }

    Ok(absolute)
}

pub fn assert_safe_runtime_paths(root: &Path) -> Result<(), String> {
    let resource_path = root.join(layout::RESOURCE_DIR);
    if resource_path == *root {
        return Err("invalid runtime path: resource points to root".to_string());
    }
    Ok(())
}

/// ホワイトリストに載ったパス配下だけを再帰削除する。
/// シンボリックリンクは辿らずに拒否し、リンク先の実体を消さないようにする。
pub fn remove_dir_all_guarded(
    path: &Path,
    root: &Path,
    allowed_targets: &[PathBuf],
) -> Result<(), String> {
    ensure_delete_target(path, root, allowed_targets)?;
    if !path.exists() {
        return Ok(());
    }

    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("failed to inspect {}: {error}", path.display()))?;
    if metadata.file_type().is_symlink() {
        return Err(format!(
            "refusing to delete symlink path: {}",
            path.display()
        ));
    }

    if metadata.is_dir() {
        for entry in fs::read_dir(path)
            .map_err(|error| format!("failed to read directory {}: {error}", path.display()))?
        {
            let entry =
                entry.map_err(|error| format!("failed to read directory entry: {error}"))?;
            remove_dir_all_guarded(&entry.path(), root, allowed_targets)?;
        }
        fs::remove_dir(path)
            .map_err(|error| format!("failed to remove directory {}: {error}", path.display()))?;
        return Ok(());
    }

    fs::remove_file(path)
        .map_err(|error| format!("failed to remove file {}: {error}", path.display()))
}

fn ensure_delete_target(
    path: &Path,
    root: &Path,
    allowed_targets: &[PathBuf],
) -> Result<(), String> {
    let absolute_path = absolutize(path, root)?;
    let absolute_root =
        fs::canonicalize(root).map_err(|error| format!("failed to canonicalize root: {error}"))?;

    if !absolute_path.starts_with(&absolute_root) {
        return Err(format!(
            "refusing to delete path outside root: {}",
            absolute_path.display()
        ));
    }

    let mut allowed = false;
    for allowed_target in allowed_targets {
        let absolute_allowed = absolutize(allowed_target, root)?;
        if absolute_path.starts_with(&absolute_allowed) {
            allowed = true;
            break;
        }
    }
    if !allowed {
        return Err(format!(
            "refusing to delete non-whitelisted path: {}",
            absolute_path.display()
        ));
    }
    Ok(())
}

fn absolutize(path: &Path, root: &Path) -> Result<PathBuf, String> {
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        root.join(path)
    };
    if absolute.exists() {
        fs::canonicalize(&absolute)
            .map_err(|error| format!("failed to canonicalize {}: {error}", absolute.display()))
    } else {
        Ok(absolute)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    // canonicalize を通すため、実在するディレクトリを使って検証する。
    struct TempRoot {
        path: PathBuf,
    }

    impl TempRoot {
        fn new(label: &str) -> Self {
            let unique = COUNTER.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "captiolinkvr-guard-{label}-{}-{unique}",
                std::process::id()
            ));
            fs::create_dir_all(&path).expect("temp root must be creatable");
            Self { path }
        }

        fn canonical(&self) -> PathBuf {
            fs::canonicalize(&self.path).expect("temp root must canonicalize")
        }
    }

    impl Drop for TempRoot {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn root_without_marker_is_rejected() {
        let temp = TempRoot::new("no-marker");
        let error = ensure_safe_root(&temp.path).expect_err("missing marker must be rejected");
        assert!(error.contains("root marker"), "unexpected error: {error}");
    }

    #[test]
    fn missing_root_is_rejected() {
        let temp = TempRoot::new("missing");
        let missing = temp.path.join("does-not-exist");
        assert!(ensure_safe_root(&missing).is_err());
    }

    #[test]
    fn resource_directory_never_equals_root() {
        let temp = TempRoot::new("runtime");
        assert!(assert_safe_runtime_paths(&temp.path).is_ok());
    }

    #[test]
    fn deleting_outside_root_is_refused() {
        let temp = TempRoot::new("outside");
        let root = temp.canonical();
        let allowed = vec![root.join(layout::UPDATE_STAGING_DIR)];

        let outside = root.join("..").join("elsewhere");
        let error = remove_dir_all_guarded(&outside, &root, &allowed)
            .expect_err("path outside root must be refused");
        assert!(error.contains("refusing to delete"), "unexpected: {error}");
    }

    #[test]
    fn deleting_non_whitelisted_path_inside_root_is_refused() {
        let temp = TempRoot::new("whitelist");
        let root = temp.canonical();
        let allowed = vec![root.join(layout::UPDATE_STAGING_DIR)];

        let precious = root.join(layout::SETTINGS_FILE);
        fs::write(&precious, b"{}").expect("settings file must be writable");

        let error = remove_dir_all_guarded(&precious, &root, &allowed)
            .expect_err("non-whitelisted path must be refused");
        assert!(
            error.contains("non-whitelisted"),
            "unexpected error: {error}"
        );
        assert!(precious.exists(), "refused delete must not remove the file");
    }

    #[test]
    fn whitelisted_directory_is_removed_recursively() {
        let temp = TempRoot::new("allowed");
        let root = temp.canonical();
        let staging = root.join(layout::UPDATE_STAGING_DIR);
        let nested = staging.join("extracted").join("resource");
        fs::create_dir_all(&nested).expect("nested dirs must be creatable");
        fs::write(nested.join("app.js"), b"// code").expect("file must be writable");

        remove_dir_all_guarded(&staging, &root, &[staging.clone()])
            .expect("whitelisted directory must be removable");
        assert!(!staging.exists(), "staging directory should be gone");
    }

    #[test]
    fn removing_absent_whitelisted_path_succeeds() {
        let temp = TempRoot::new("absent");
        let root = temp.canonical();
        let staging = root.join(layout::UPDATE_STAGING_DIR);

        assert!(remove_dir_all_guarded(&staging, &root, &[staging.clone()]).is_ok());
    }

    // 兄弟ディレクトリが接頭辞一致で通ってしまわないことを確認する。
    #[test]
    fn sibling_with_shared_prefix_is_not_treated_as_allowed() {
        let temp = TempRoot::new("prefix");
        let root = temp.canonical();
        let allowed = vec![root.join(layout::UPDATE_STAGING_DIR)];

        let sibling = root.join(format!("{}-evil", layout::UPDATE_STAGING_DIR));
        fs::create_dir_all(&sibling).expect("sibling must be creatable");

        let error = remove_dir_all_guarded(&sibling, &root, &allowed)
            .expect_err("sibling directory must be refused");
        assert!(
            error.contains("non-whitelisted"),
            "unexpected error: {error}"
        );
        assert!(sibling.exists(), "refused delete must not remove sibling");
    }
}
