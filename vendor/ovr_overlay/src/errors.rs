// OpenVRのエラーコードをRustのError型として扱うための変換群。
use crate::sys;

use derive_more::From;
use std::fmt::Display;

#[derive(Clone, PartialEq, Eq, thiserror::Error)]
pub struct EVRInitError(sys::EVRInitError);
impl std::fmt::Debug for EVRInitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("EVRInitError")
            .field(&self.description())
            .finish()
    }
}
impl EVRInitError {
    pub fn new(err: sys::EVRInitError) -> Result<(), Self> {
        if err == sys::EVRInitError::VRInitError_None {
            Ok(())
        } else {
            Err(Self(err))
        }
    }

    pub fn description(&self) -> &'static str {
        "OpenVR initialization failed"
    }

    pub fn inner(&self) -> sys::EVRInitError {
        self.0.clone()
    }
}
impl Display for EVRInitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let desc = self.description();
        write!(f, "EVRInitError: {desc}")
    }
}

#[derive(Clone, PartialEq, Eq, thiserror::Error)]
pub struct EVROverlayError(sys::EVROverlayError);
impl std::fmt::Debug for EVROverlayError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("EVROverlayError")
            .field(&self.description())
            .finish()
    }
}
impl EVROverlayError {
    pub fn new(err: sys::EVROverlayError) -> Result<(), Self> {
        if err == sys::EVROverlayError::VROverlayError_None {
            Ok(())
        } else {
            Err(Self(err))
        }
    }

    pub fn description(&self) -> &'static str {
        match self.0 {
            sys::EVROverlayError::VROverlayError_None => "no error",
            sys::EVROverlayError::VROverlayError_UnknownOverlay => "unknown overlay",
            sys::EVROverlayError::VROverlayError_InvalidHandle => "invalid overlay handle",
            sys::EVROverlayError::VROverlayError_PermissionDenied => "overlay permission denied",
            sys::EVROverlayError::VROverlayError_OverlayLimitExceeded => "overlay limit exceeded",
            sys::EVROverlayError::VROverlayError_WrongVisibilityType => "wrong overlay visibility type",
            sys::EVROverlayError::VROverlayError_KeyTooLong => "overlay key too long",
            sys::EVROverlayError::VROverlayError_NameTooLong => "overlay name too long",
            sys::EVROverlayError::VROverlayError_KeyInUse => "overlay key already in use",
            sys::EVROverlayError::VROverlayError_WrongTransformType => "wrong overlay transform type",
            sys::EVROverlayError::VROverlayError_InvalidTrackedDevice => "invalid tracked device",
            sys::EVROverlayError::VROverlayError_InvalidParameter => "invalid overlay parameter",
            sys::EVROverlayError::VROverlayError_ThumbnailCantBeDestroyed => "overlay thumbnail cannot be destroyed",
            sys::EVROverlayError::VROverlayError_ArrayTooSmall => "overlay array too small",
            sys::EVROverlayError::VROverlayError_RequestFailed => "overlay request failed",
            sys::EVROverlayError::VROverlayError_InvalidTexture => "invalid overlay texture",
            sys::EVROverlayError::VROverlayError_UnableToLoadFile => "unable to load overlay file",
            sys::EVROverlayError::VROverlayError_KeyboardAlreadyInUse => "overlay keyboard already in use",
            sys::EVROverlayError::VROverlayError_NoNeighbor => "overlay neighbor not found",
            sys::EVROverlayError::VROverlayError_TooManyMaskPrimitives => "too many overlay mask primitives",
            sys::EVROverlayError::VROverlayError_BadMaskPrimitive => "bad overlay mask primitive",
            sys::EVROverlayError::VROverlayError_TextureAlreadyLocked => "overlay texture already locked",
            sys::EVROverlayError::VROverlayError_TextureLockCapacityReached => "overlay texture lock capacity reached",
            sys::EVROverlayError::VROverlayError_TextureNotLocked => "overlay texture not locked",
        }
    }

    pub fn inner(&self) -> sys::EVROverlayError {
        self.0.clone()
    }
}
impl Display for EVROverlayError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let desc = self.description();
        write!(f, "EVROverlayError: {desc}")
    }
}

#[derive(Debug, From, thiserror::Error)]
pub enum InitError {
    #[error("OpenVR already initialized")]
    AlreadyInitialized,
    #[error("sys::{0}")]
    Sys(EVRInitError),
}
