//! SteamVR オーバーレイ連携。OpenVRの実行時状態、姿勢計算、起動判定を分けて持つ。

#[cfg(all(windows, feature = "steamvr-overlay"))]
mod d3d11_texture;
mod detect;
mod error;
mod runtime;
mod transform;

pub use detect::is_steamvr_running;
pub use error::OverlayError;
pub use runtime::{OverlayConfig, OverlayRuntime};
