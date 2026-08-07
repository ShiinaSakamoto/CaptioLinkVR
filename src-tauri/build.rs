use std::{env, fs, path::PathBuf};

use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PackageJson {
    version: String,
}

/// 更新チェック先のリポジトリ設定。
/// 公開リポジトリのリリースを未認証で参照するため、トークンは持たない。
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct UpdateConfig {
    #[serde(default)]
    github_owner: String,
    #[serde(default)]
    github_repo: String,
}

// Tauriのビルド補助処理を実行し、OpenVRの実行時DLLをexe横へ配置する。
fn main() {
    embed_build_metadata();
    copy_openvr_runtime_dll();

    let bin_name = env::var("CARGO_BIN_NAME").unwrap_or_default();
    if bin_name.is_empty() || bin_name == "captiolink-vr" {
        tauri_build::build();
    }

    #[cfg(target_os = "windows")]
    embed_portable_manifest(&bin_name);
}

fn embed_build_metadata() {
    let manifest_dir =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set"));
    let package_json_path = manifest_dir.join("../package.json");
    let update_config_path = manifest_dir.join("../update.config.json");
    let update_config_local_path = manifest_dir.join("../update.config.local.json");

    println!("cargo:rerun-if-changed={}", package_json_path.display());
    println!("cargo:rerun-if-changed={}", update_config_path.display());
    println!("cargo:rerun-if-changed={}", update_config_local_path.display());

    let captions_dir = manifest_dir.join("../captions");
    println!("cargo:rerun-if-changed={}", captions_dir.display());
    let fonts_dir = manifest_dir.join("../fonts");
    println!("cargo:rerun-if-changed={}", fonts_dir.display());

    let package_json = fs::read_to_string(&package_json_path)
        .expect("package.json should be readable for version embedding");
    let package: PackageJson = serde_json::from_str(&package_json)
        .expect("package.json should contain a valid version field");
    println!("cargo:rustc-env=APP_VERSION={}", package.version);

    let update_config = fs::read_to_string(&update_config_path)
        .unwrap_or_else(|_| "{\"githubOwner\":\"\",\"githubRepo\":\"CaptioLinkVR\"}".to_string());
    let mut config: UpdateConfig = serde_json::from_str(&update_config).unwrap_or_default();
    if config.github_repo.trim().is_empty() {
        config.github_repo = "CaptioLinkVR".to_string();
    }

    if let Ok(local_config) = fs::read_to_string(&update_config_local_path) {
        if let Ok(local) = serde_json::from_str::<UpdateConfig>(&local_config) {
            if !local.github_owner.trim().is_empty() {
                config.github_owner = local.github_owner;
            }
            if !local.github_repo.trim().is_empty() {
                config.github_repo = local.github_repo;
            }
        }
    }

    println!("cargo:rustc-env=GITHUB_OWNER={}", config.github_owner);
    println!("cargo:rustc-env=GITHUB_REPO={}", config.github_repo);
}

#[cfg(target_os = "windows")]
fn copy_openvr_runtime_dll() {
    let manifest_dir =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set"));
    let dll_source = manifest_dir.join("../vendor/ovr_overlay_sys/openvr/bin/win64/openvr_api.dll");
    println!("cargo:rerun-if-changed={}", dll_source.display());

    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR is set"));
    let Some(profile_dir) = out_dir.ancestors().nth(3) else {
        return;
    };

    let dll_target = profile_dir.join("openvr_api.dll");
    fs::copy(&dll_source, &dll_target).unwrap_or_else(|err| {
        panic!(
            "Failed to copy OpenVR runtime DLL from {} to {}: {err}",
            dll_source.display(),
            dll_target.display()
        )
    });
}

#[cfg(not(target_os = "windows"))]
fn copy_openvr_runtime_dll() {}

#[cfg(target_os = "windows")]
fn embed_portable_manifest(bin_name: &str) {
    if bin_name != "captiolink-vr-apply" && bin_name != "portable-launcher" {
        return;
    }

    let manifest_dir =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set"));
    let manifest_path = manifest_dir.join("windows/as-invoker.manifest.xml");
    println!("cargo:rerun-if-changed={}", manifest_path.display());

    embed_manifest::embed_manifest_file(manifest_path).unwrap_or_else(|error| {
        panic!("failed to embed Windows manifest for {bin_name}: {error}");
    });
}
