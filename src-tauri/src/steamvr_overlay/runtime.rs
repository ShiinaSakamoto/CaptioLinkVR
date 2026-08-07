//! OpenVR の Context / OverlayHandle を保持し、Tauriコマンドから再利用する実行時状態。

#[cfg(feature = "steamvr-overlay")]
use std::sync::Arc;

#[cfg(feature = "steamvr-overlay")]
use ovr_overlay::overlay::{EVROverlayError, OverlayHandle};
#[cfg(feature = "steamvr-overlay")]
use ovr_overlay::{sys, Context};

use super::error::OverlayError;
#[cfg(all(windows, feature = "steamvr-overlay"))]
use super::d3d11_texture::D3d11OverlayTexture;
#[cfg(feature = "steamvr-overlay")]
use super::transform;

#[cfg(feature = "steamvr-overlay")]
const OVERLAY_KEY: &str = "dev.captiolinkvr.subtitle-overlay\0";
#[cfg(feature = "steamvr-overlay")]
const OVERLAY_NAME: &str = "CaptioLinkVR Subtitles\0";

#[cfg(feature = "steamvr-overlay")]
#[derive(Clone)]
struct PendingFrame {
    pixels: Arc<[u8]>,
    width: u32,
    height: u32,
    width_meters: f32,
    sequence: u64,
}

// JSから渡されるオーバーレイ設定。Rust側では符号反転せず、OpenVRへ渡す生の値として扱う。
#[derive(Clone, Copy)]
#[cfg_attr(not(feature = "steamvr-overlay"), allow(dead_code))]
pub struct OverlayConfig {
    pub width: u32,
    pub height: u32,
    pub width_meters: f32,
    pub position_x: f32,
    pub position_y: f32,
    pub position_z: f32,
    pub rotation_x: f32,
    pub rotation_y: f32,
    pub rotation_z: f32,
}

pub struct OverlayRuntime {
    #[cfg(feature = "steamvr-overlay")]
    context: Option<Context>,
    #[cfg(feature = "steamvr-overlay")]
    handle: Option<OverlayHandle>,
    config: OverlayConfig,
    last_frame_sequence: u64,
    /// 前回の OpenVR 再起動（または初期化）以降に成功したテクスチャ送信回数。
    frames_since_restart: u64,
    #[cfg(feature = "steamvr-overlay")]
    pending_frame: Option<PendingFrame>,
    #[cfg(feature = "steamvr-overlay")]
    visible: bool,
    /// SetOverlayTexture 用の D3D11 バックバッファ（寸法は字幕ごとに可変）。
    #[cfg(all(windows, feature = "steamvr-overlay"))]
    d3d11_texture: Option<D3d11OverlayTexture>,
}

impl Default for OverlayRuntime {
    fn default() -> Self {
        Self {
            #[cfg(feature = "steamvr-overlay")]
            context: None,
            #[cfg(feature = "steamvr-overlay")]
            handle: None,
            config: OverlayConfig {
                width: 1024,
                height: 256,
                width_meters: 1.45,
                position_x: 0.0,
                position_y: -0.3,
                position_z: -1.2,
                rotation_x: -8.0,
                rotation_y: 0.0,
                rotation_z: 0.0,
            },
            last_frame_sequence: 0,
            frames_since_restart: 0,
            #[cfg(feature = "steamvr-overlay")]
            pending_frame: None,
            #[cfg(feature = "steamvr-overlay")]
            visible: true,
            #[cfg(all(windows, feature = "steamvr-overlay"))]
            d3d11_texture: None,
        }
    }
}

impl OverlayRuntime {
    #[cfg(feature = "steamvr-overlay")]
    pub fn initialize(&mut self, config: OverlayConfig) -> Result<(), OverlayError> {
        self.config = config;

        if self.context.is_none() {
            self.context =
                Some(Context::init().map_err(|error| OverlayError::SteamVr(error.to_string()))?);
        }

        self.with_context(|runtime, manager| {
            runtime.ensure_overlay(manager)?;
            runtime.apply_overlay_config(manager)
        })
    }

    // steamvr-overlay featureなしのビルドでは、デスクトッププレビューだけ動かす。
    #[cfg(not(feature = "steamvr-overlay"))]
    pub fn initialize(&mut self, config: OverlayConfig) -> Result<(), OverlayError> {
        self.config = config;
        Err(OverlayError::SteamVr(
            "built without the steamvr-overlay feature; desktop preview is still available"
                .to_string(),
        ))
    }

    // 表示サイズは submit_frame がテクスチャ実寸に合わせる。
    // ここで base meters を入れると、古い広いテクスチャのまま物理幅だけ縮み一瞬小さく見える。
    #[cfg(feature = "steamvr-overlay")]
    pub fn update_config(&mut self, config: OverlayConfig) -> Result<(), OverlayError> {
        self.copy_pose_from(config);

        let context = self.context.as_ref().ok_or(OverlayError::NotInitialized)?;
        let handle = self.handle.ok_or(OverlayError::NotInitialized)?;
        let mut manager = context.overlay_mngr();
        self.apply_overlay_config(&mut manager)?;
        if self.visible {
            manager
                .set_visibility(handle, true)
                .map_err(map_overlay_error)?;
        }
        Ok(())
    }

    #[cfg(not(feature = "steamvr-overlay"))]
    pub fn update_config(&mut self, config: OverlayConfig) -> Result<(), OverlayError> {
        self.copy_pose_from(config);
        Err(OverlayError::NotInitialized)
    }

    // 位置と回転だけを取り込む。表示サイズは submit_frame 側が決める。
    fn copy_pose_from(&mut self, config: OverlayConfig) {
        self.config.position_x = config.position_x;
        self.config.position_y = config.position_y;
        self.config.position_z = config.position_z;
        self.config.rotation_x = config.rotation_x;
        self.config.rotation_y = config.rotation_y;
        self.config.rotation_z = config.rotation_z;
    }

    // 作成済みオーバーレイの表示状態だけを切り替える。
    #[cfg(feature = "steamvr-overlay")]
    pub fn set_visible(&mut self, visible: bool) -> Result<(), OverlayError> {
        self.visible = visible;
        let context = self.context.as_ref().ok_or(OverlayError::NotInitialized)?;
        let handle = self.handle.ok_or(OverlayError::NotInitialized)?;
        context
            .overlay_mngr()
            .set_visibility(handle, visible)
            .map_err(map_overlay_error)
    }

    #[cfg(not(feature = "steamvr-overlay"))]
    pub fn set_visible(&mut self, _visible: bool) -> Result<(), OverlayError> {
        Err(OverlayError::SteamVr(
            "built without the steamvr-overlay feature".to_string(),
        ))
    }

    // RGBAフレームをSteamVRへ送る。失敗時は（許可されていれば）OpenVRを再初期化し再送する。
    #[cfg(feature = "steamvr-overlay")]
    pub fn submit_frame(
        &mut self,
        frame: &[u8],
        width: u32,
        height: u32,
        width_meters: f32,
        sequence: u64,
        allow_full_restart: bool,
    ) -> Result<(), OverlayError> {
        if sequence <= self.last_frame_sequence {
            return Ok(());
        }

        validate_frame_len(frame, width, height)?;

        self.store_pending_frame(frame, width, height, width_meters.max(0.01), sequence);

        match self.try_submit_pending() {
            Ok(()) => Ok(()),
            Err(first_error) => {
                if !allow_full_restart {
                    return Err(first_error);
                }
                self.restart_overlay_context()?;
                self.try_submit_pending().map_err(|retry_error| {
                    OverlayError::SteamVr(format!(
                        "{first_error}; retry after OpenVR restart failed: {retry_error}"
                    ))
                })
            }
        }
    }

    // featureなしでもフレーム長の検証だけは行い、フロント側の不整合を検出する。
    #[cfg(not(feature = "steamvr-overlay"))]
    pub fn submit_frame(
        &mut self,
        frame: &[u8],
        width: u32,
        height: u32,
        width_meters: f32,
        sequence: u64,
        _allow_full_restart: bool,
    ) -> Result<(), OverlayError> {
        let _ = width_meters;
        if sequence <= self.last_frame_sequence {
            return Ok(());
        }

        validate_frame_len(frame, width, height)?;

        self.last_frame_sequence = sequence;
        self.frames_since_restart = self.frames_since_restart.saturating_add(1);
        Ok(())
    }

    /// 予防再起動。`force` または送信回数が `min_frames` 以上のときだけ実行する。
    pub fn proactive_restart(
        &mut self,
        force: bool,
        min_frames: u64,
    ) -> Result<bool, OverlayError> {
        if !should_proactive_restart(force, self.frames_since_restart, min_frames) {
            return Ok(false);
        }

        #[cfg(feature = "steamvr-overlay")]
        {
            if self.context.is_none() {
                return Ok(false);
            }
            self.restart_overlay_context()?;
            Ok(true)
        }
        #[cfg(not(feature = "steamvr-overlay"))]
        {
            Ok(false)
        }
    }

    #[cfg(feature = "steamvr-overlay")]
    fn store_pending_frame(
        &mut self,
        frame: &[u8],
        width: u32,
        height: u32,
        width_meters: f32,
        sequence: u64,
    ) {
        self.pending_frame = Some(PendingFrame {
            pixels: Arc::from(frame),
            width,
            height,
            width_meters,
            sequence,
        });
    }

    #[cfg(feature = "steamvr-overlay")]
    fn try_submit_pending(&mut self) -> Result<(), OverlayError> {
        let pending = self
            .pending_frame
            .as_ref()
            .ok_or(OverlayError::NotInitialized)?;

        if pending.sequence <= self.last_frame_sequence {
            return Ok(());
        }

        let pixels = Arc::clone(&pending.pixels);
        let width = pending.width;
        let height = pending.height;
        let width_meters = pending.width_meters;
        let sequence = pending.sequence;

        self.config.width = width;
        self.config.height = height;
        self.config.width_meters = width_meters.max(0.01);
        self.submit_frame_once(&pixels, width, height)?;
        self.last_frame_sequence = sequence;
        self.frames_since_restart = self.frames_since_restart.saturating_add(1);
        Ok(())
    }

    #[cfg(feature = "steamvr-overlay")]
    fn submit_frame_once(
        &mut self,
        frame: &[u8],
        width: u32,
        height: u32,
    ) -> Result<(), OverlayError> {
        #[cfg(all(windows, feature = "steamvr-overlay"))]
        let texture_ptr = {
            if self.d3d11_texture.is_none() {
                self.d3d11_texture = Some(
                    D3d11OverlayTexture::new().map_err(|error| OverlayError::SteamVr(error))?,
                );
            }
            self.d3d11_texture
                .as_mut()
                .ok_or_else(|| OverlayError::SteamVr("D3D11 texture missing".to_string()))?
                .upload_rgba(frame, width, height)
                .map_err(OverlayError::SteamVr)?
        };

        self.with_context(|runtime, manager| {
            runtime.ensure_overlay(manager)?;
            runtime.apply_overlay_config(manager)?;

            let handle = runtime.handle.ok_or(OverlayError::NotInitialized)?;
            #[cfg(all(windows, feature = "steamvr-overlay"))]
            {
                manager
                    .set_texture_d3d11(handle, texture_ptr)
                    .map_err(|error| OverlayError::SteamVr(error.to_string()))?;
            }
            #[cfg(not(all(windows, feature = "steamvr-overlay")))]
            {
                manager
                    .set_raw_data(handle, frame, width as usize, height as usize, 4)
                    .map_err(|error| OverlayError::SteamVr(error.to_string()))?;
            }
            Ok(())
        })?;

        #[cfg(all(windows, feature = "steamvr-overlay"))]
        if let Some(d3d) = self.d3d11_texture.as_ref() {
            d3d.flush();
        }
        Ok(())
    }

    #[cfg(feature = "steamvr-overlay")]
    fn restart_overlay_context(&mut self) -> Result<(), OverlayError> {
        if let Some(context) = self.context.take() {
            {
                let mut manager = context.overlay_mngr();
                if let Some(handle) = self.handle.take() {
                    let _ = manager.destroy_overlay(handle);
                }
            }
            unsafe { context.shutdown() };
        }
        self.handle = None;
        self.context =
            Some(Context::init().map_err(|error| OverlayError::SteamVr(error.to_string()))?);

        self.with_context(|runtime, manager| {
            runtime.ensure_overlay(manager)?;
            if runtime.visible {
                if let Some(handle) = runtime.handle {
                    manager
                        .set_visibility(handle, true)
                        .map_err(map_overlay_error)?;
                }
            }
            Ok(())
        })?;
        self.frames_since_restart = 0;
        Ok(())
    }

    // OverlayManager が Context を借用するため take/restore する（早期 return でも落とさない）。
    #[cfg(feature = "steamvr-overlay")]
    fn with_context<F>(&mut self, operation: F) -> Result<(), OverlayError>
    where
        F: FnOnce(
            &mut Self,
            &mut ovr_overlay::overlay::OverlayManager<'_>,
        ) -> Result<(), OverlayError>,
    {
        let context = self.context.take().ok_or(OverlayError::NotInitialized)?;
        let result = {
            let mut manager = context.overlay_mngr();
            operation(self, &mut manager)
        };
        self.context = Some(context);
        result
    }

    #[cfg(feature = "steamvr-overlay")]
    fn ensure_overlay(
        &mut self,
        manager: &mut ovr_overlay::overlay::OverlayManager<'_>,
    ) -> Result<(), OverlayError> {
        if self.handle.is_some() {
            return Ok(());
        }

        let handle = match manager.create_overlay(OVERLAY_KEY, OVERLAY_NAME) {
            Ok(handle) => handle,
            Err(error) if is_overlay_key_in_use(&error) => manager
                .find_overlay(OVERLAY_KEY)
                .map_err(|find_error| OverlayError::SteamVr(find_error.to_string()))?,
            Err(error) => return Err(OverlayError::SteamVr(error.to_string())),
        };
        self.handle = Some(handle);
        self.apply_overlay_config(manager)
    }

    #[cfg(feature = "steamvr-overlay")]
    fn apply_overlay_config(
        &self,
        manager: &mut ovr_overlay::overlay::OverlayManager<'_>,
    ) -> Result<(), OverlayError> {
        let handle = self.handle.ok_or(OverlayError::NotInitialized)?;
        let config = self.config;

        manager
            .set_width(handle, config.width_meters)
            .map_err(map_overlay_error)?;
        manager
            .set_texel_aspect(handle, 1.0)
            .map_err(map_overlay_error)?;
        manager
            .set_opacity(handle, 1.0)
            .map_err(map_overlay_error)?;
        transform::set_hmd_relative_transform(manager, handle, config)
    }
}

// RGBAは1ピクセル4バイト。フロントが送ってくる寸法と実データの食い違いを弾く。
fn validate_frame_len(frame: &[u8], width: u32, height: u32) -> Result<(), OverlayError> {
    let expected = width as usize * height as usize * 4;
    if frame.len() != expected {
        return Err(OverlayError::InvalidFrame {
            actual: frame.len(),
            expected,
        });
    }
    Ok(())
}

fn should_proactive_restart(force: bool, frames_since_restart: u64, min_frames: u64) -> bool {
    force || frames_since_restart >= min_frames
}

#[cfg(feature = "steamvr-overlay")]
fn map_overlay_error(error: EVROverlayError) -> OverlayError {
    OverlayError::SteamVr(error.description().to_string())
}

#[cfg(feature = "steamvr-overlay")]
fn is_overlay_key_in_use(error: &EVROverlayError) -> bool {
    error.inner() == sys::EVROverlayError::VROverlayError_KeyInUse
}

unsafe impl Send for OverlayRuntime {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frame_length_matching_dimensions_is_accepted() {
        let frame = vec![0u8; 2 * 3 * 4];
        assert!(validate_frame_len(&frame, 2, 3).is_ok());
    }

    #[test]
    fn frame_length_mismatch_reports_both_sizes() {
        let frame = vec![0u8; 10];
        let error =
            validate_frame_len(&frame, 2, 3).expect_err("mismatched frame must be rejected");

        match error {
            OverlayError::InvalidFrame { actual, expected } => {
                assert_eq!(actual, 10);
                assert_eq!(expected, 24);
            }
            other => panic!("unexpected error: {other}"),
        }
    }

    // 同じsequenceの再送を受け付けると、字幕が巻き戻ったように見える。
    #[test]
    fn submit_frame_ignores_non_advancing_sequence() {
        let mut runtime = OverlayRuntime::default();
        let frame = vec![0u8; 4];

        assert!(runtime.submit_frame(&frame, 1, 1, 1.0, 0, true).is_ok());
        assert_eq!(runtime.last_frame_sequence, 0);
    }

    #[test]
    fn frames_since_restart_starts_at_zero() {
        assert_eq!(OverlayRuntime::default().frames_since_restart, 0);
    }

    #[test]
    fn proactive_restart_is_noop_when_not_initialized() {
        let mut runtime = OverlayRuntime::default();
        runtime.frames_since_restart = 200;

        let restarted = runtime
            .proactive_restart(false, 50)
            .expect("uninitialized proactive restart");
        assert!(!restarted);
        assert_eq!(runtime.frames_since_restart, 200);

        let forced = runtime
            .proactive_restart(true, 0)
            .expect("forced proactive restart without context");
        assert!(!forced);
        assert_eq!(runtime.frames_since_restart, 200);
    }

    #[test]
    fn proactive_restart_gate_requires_min_frames_unless_forced() {
        assert!(!should_proactive_restart(false, 49, 50));
        assert!(should_proactive_restart(false, 50, 50));
        assert!(should_proactive_restart(true, 0, 150));
        assert!(!should_proactive_restart(false, 149, 150));
        assert!(should_proactive_restart(false, 150, 150));
    }

    #[test]
    fn copy_pose_from_keeps_texture_dimensions() {
        let mut runtime = OverlayRuntime::default();
        let original_width = runtime.config.width;
        let original_meters = runtime.config.width_meters;

        runtime.copy_pose_from(OverlayConfig {
            width: 4,
            height: 4,
            width_meters: 0.1,
            position_x: 1.0,
            position_y: 2.0,
            position_z: 3.0,
            rotation_x: 10.0,
            rotation_y: 20.0,
            rotation_z: 30.0,
        });

        assert_eq!(runtime.config.width, original_width);
        assert_eq!(runtime.config.width_meters, original_meters);
        assert_eq!(runtime.config.position_x, 1.0);
        assert_eq!(runtime.config.rotation_z, 30.0);
    }
}
