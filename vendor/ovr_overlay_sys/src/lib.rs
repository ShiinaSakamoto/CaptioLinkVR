#![allow(unused_imports)]
#![allow(unused_unsafe)] // autocxx生成コード由来の警告を抑える。

use autocxx::prelude::*; // autocxxの主要マクロを使う。

// OpenVR C++ APIから、このプロジェクトで必要な型と関数だけRustバインディング化する。
include_cpp! {
    #include "openvr.h"

    generate!("vr::VR_Init")
    generate_pod!("vr::EVRApplicationType")
    generate!("vr::VR_Shutdown")

    generate!("vr::IVRSystem")
    generate!("vr::VRSystem")

    generate!("vr::IVROverlay")
    generate!("vr::VROverlay")
    generate_pod!("vr::EVROverlayError")
    generate_pod!("vr::VROverlayHandle_t")

    generate_pod!("vr::EVRInitError")

    generate_pod!("vr::ETrackingUniverseOrigin")
    generate!("vr::HmdMatrix34_t")
}

// autocxxが生成したvr名前空間の型を、上位crateからそのまま使えるように再公開する。
pub use ffi::vr::*;
pub use ffi::{make_string, ToCppString};
