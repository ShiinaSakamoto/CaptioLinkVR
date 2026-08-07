// OpenVRの低レベルバインディングを、Rust側で扱いやすいContext/Managerへ薄く包むcrate。
//! Create a [`Context`] to get started.
//!
//! **This library makes no semver guarantees until version 0.1.0 or greater.**

pub mod overlay;
pub mod pose;

mod errors;

pub use self::errors::{EVRInitError, InitError};
pub use ovr_overlay_sys as sys;

use self::overlay::OverlayManager;

use lazy_static::lazy_static;
use std::sync::Mutex;

lazy_static! {
    // Mutex instead of atomic allows for blocking on lock
    static ref INITIALIZED: Mutex<bool> = Mutex::new(false);
}

/// Represents an active OpenVR context.
///
/// Shutting down this context is unsafe, so if this is dropped, the context will
/// remain active, as leaking resources is better than accidentally causing unsafe
/// behavior. To actually shut down, call [`Self::shutdown()`]..
pub struct Context {}
impl Context {
    /// OpenVRをバックグラウンドアプリとして初期化する。SteamVRを勝手に起動しにくくするためOverlay種別は使わない。
    pub fn init() -> Result<Self, InitError> {
        if let Ok(mut guard) = INITIALIZED.try_lock() {
            if *guard {
                return Err(InitError::AlreadyInitialized);
            }
            let mut err = std::mem::MaybeUninit::<sys::EVRInitError>::uninit();
            let err = unsafe {
                let _ = sys::VR_Init(
                    err.as_mut_ptr(),
                    sys::EVRApplicationType::VRApplication_Background,
                    std::ptr::null(),
                );
                err.assume_init()
            };
            EVRInitError::new(err)?;
            *guard = true;
            Ok(Self {})
        } else {
            Err(InitError::AlreadyInitialized)
        }
    }

    // TODO: is this actually unsafe?
    // see https://docs.rs/openvr/latest/openvr/struct.Context.html#safety
    /// OpenVRを明示的に終了する。呼び出し側が安全性を保証する必要がある。
    pub unsafe fn shutdown(self) {
        sys::VR_Shutdown();
        if let Ok(mut guard) = INITIALIZED.lock() {
            *guard = false;
        }
    }

    /// オーバーレイ操作用のManagerを作る。
    pub fn overlay_mngr(&self) -> OverlayManager<'_> {
        OverlayManager::new(self)
    }
}

/// Tints each color channel by multiplying it with the given f32
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct ColorTint {
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub a: f32,
}
impl Default for ColorTint {
    fn default() -> Self {
        Self {
            r: 1.,
            g: 1.,
            b: 1.,
            a: 1.,
        }
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn ensure_testing_optional_features() {
        macro_rules! helper {
            ($($feature:literal),+ $(,)?) => {
                $(assert!(cfg!(feature = $feature), "use `cargo test --all-features` instead!"));+
            };
        }

        helper!("nalgebra");
    }
}
