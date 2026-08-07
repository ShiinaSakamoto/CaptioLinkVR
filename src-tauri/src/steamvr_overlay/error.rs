use std::error::Error;
use std::fmt::{Display, Formatter};

// Tauriコマンドへ返すためのオーバーレイ関連エラー。
#[derive(Debug)]
#[cfg_attr(not(feature = "steamvr-overlay"), allow(dead_code))]
pub enum OverlayError {
    NotInitialized,
    InvalidFrame { actual: usize, expected: usize },
    SteamVr(String),
}

impl Display for OverlayError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotInitialized => write!(formatter, "SteamVR overlay is not initialized"),
            Self::InvalidFrame { actual, expected } => {
                write!(
                    formatter,
                    "invalid RGBA frame length: got {actual}, expected {expected}"
                )
            }
            Self::SteamVr(message) => write!(formatter, "SteamVR overlay error: {message}"),
        }
    }
}

impl Error for OverlayError {}
