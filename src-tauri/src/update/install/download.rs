//! 更新パッケージの取得と完全性検証。

use std::fs::File;
use std::io::{copy, Read};
use std::path::Path;

use sha2::{Digest, Sha256};

use crate::update::manifest;

pub fn download_file(
    url: &str,
    destination: &Path,
    expected_size: Option<u64>,
) -> Result<(), String> {
    // 公開リリースのアセットは認証なしで取得できる。
    // URLはGitHubの配布ホストに限定されるため、改ざんされたジョブでも別サーバーへは取りに行かない。
    let response = manifest::download_release_package(url, manifest::USER_AGENT_APPLY)?;

    if !manifest::is_http_success(response.status()) {
        return Err(format!(
            "update package download returned unexpected status: {}",
            response.status()
        ));
    }

    let mut reader = response.into_reader();
    let mut file = File::create(destination)
        .map_err(|error| format!("failed to create download file: {error}"))?;
    let written = copy(&mut reader, &mut file)
        .map_err(|error| format!("failed to write download file: {error}"))?;

    if let Some(expected) = expected_size {
        if written != expected {
            return Err(format!(
                "downloaded size mismatch: expected {expected} bytes, got {written} bytes"
            ));
        }
    }

    Ok(())
}

pub fn verify_file_hash(path: &Path, expected_sha256: &str) -> Result<(), String> {
    let expected = normalize_expected_sha256(expected_sha256)?;

    let mut file =
        File::open(path).map_err(|error| format!("failed to open downloaded file: {error}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|error| format!("failed to read downloaded file: {error}"))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }

    let actual = format!("{:x}", hasher.finalize());
    if actual != expected {
        return Err("downloaded package failed sha256 verification".to_string());
    }

    Ok(())
}

// マニフェストのsha256は64桁の16進数のみ受け付ける。
// 短い値や非16進を通すと、比較が常に不一致になるだけでなく検証の意図が曖昧になる。
fn normalize_expected_sha256(expected_sha256: &str) -> Result<String, String> {
    let expected = expected_sha256.trim().to_ascii_lowercase();
    if expected.len() != 64 || !expected.chars().all(|ch| ch.is_ascii_hexdigit()) {
        return Err("manifest sha256 is invalid".to_string());
    }
    Ok(expected)
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    #[test]
    fn uppercase_and_padded_hash_is_normalized() {
        let normalized = normalize_expected_sha256(&format!("  {}  ", VALID.to_ascii_uppercase()))
            .expect("valid hash must be accepted");
        assert_eq!(normalized, VALID);
    }

    #[test]
    fn hash_with_wrong_length_is_rejected() {
        assert!(normalize_expected_sha256(&VALID[..63]).is_err());
        assert!(normalize_expected_sha256(&format!("{VALID}0")).is_err());
        assert!(normalize_expected_sha256("").is_err());
    }

    #[test]
    fn hash_with_non_hex_characters_is_rejected() {
        let mut tampered = VALID.to_string();
        tampered.replace_range(0..1, "z");
        assert!(normalize_expected_sha256(&tampered).is_err());
    }
}
