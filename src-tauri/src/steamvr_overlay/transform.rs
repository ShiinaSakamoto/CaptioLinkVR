//! オーバーレイの姿勢計算。オイラー角と平行移動を OpenVR の 3x4 行列へ変換する。

use super::OverlayConfig;

#[cfg(feature = "steamvr-overlay")]
use ovr_overlay::overlay::OverlayHandle;
#[cfg(feature = "steamvr-overlay")]
use ovr_overlay::pose::Matrix3x4;

#[cfg(feature = "steamvr-overlay")]
use super::OverlayError;

/// UIから来たオイラー角（度）を回転行列へ変換し、4列目に平行移動を入れた3x4行を返す。
/// OpenVR の型に依存しない純粋計算なので、feature なしでも検証できる。
#[cfg_attr(not(feature = "steamvr-overlay"), allow(dead_code))]
pub fn transform_rows(config: OverlayConfig) -> [[f32; 4]; 3] {
    let (sx, cx) = config.rotation_x.to_radians().sin_cos();
    let (sy, cy) = config.rotation_y.to_radians().sin_cos();
    let (sz, cz) = config.rotation_z.to_radians().sin_cos();

    let r00 = cy * cz;
    let r01 = cz * sx * sy - cx * sz;
    let r02 = sx * sz + cx * cz * sy;
    let r10 = cy * sz;
    let r11 = cx * cz + sx * sy * sz;
    let r12 = cx * sy * sz - cz * sx;
    let r20 = -sy;
    let r21 = cy * sx;
    let r22 = cx * cy;

    [
        [r00, r01, r02, config.position_x],
        [r10, r11, r12, config.position_y],
        [r20, r21, r22, config.position_z],
    ]
}

// 字幕オーバーレイをHMD本体からの相対位置として配置する。
#[cfg(feature = "steamvr-overlay")]
pub fn set_hmd_relative_transform(
    manager: &mut ovr_overlay::overlay::OverlayManager<'_>,
    handle: OverlayHandle,
    config: OverlayConfig,
) -> Result<(), OverlayError> {
    const HMD_TRACKED_DEVICE_INDEX: u32 = 0;

    manager
        .set_transform_tracked_device_relative(
            handle,
            HMD_TRACKED_DEVICE_INDEX,
            &Matrix3x4(transform_rows(config)),
        )
        .map_err(|error| OverlayError::SteamVr(error.description().to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config_with(rotation: (f32, f32, f32), position: (f32, f32, f32)) -> OverlayConfig {
        OverlayConfig {
            width: 1024,
            height: 256,
            width_meters: 1.45,
            position_x: position.0,
            position_y: position.1,
            position_z: position.2,
            rotation_x: rotation.0,
            rotation_y: rotation.1,
            rotation_z: rotation.2,
        }
    }

    fn assert_close(actual: f32, expected: f32) {
        assert!(
            (actual - expected).abs() < 1e-5,
            "expected {expected}, got {actual}"
        );
    }

    #[test]
    fn no_rotation_yields_identity_rotation_and_keeps_translation() {
        let rows = transform_rows(config_with((0.0, 0.0, 0.0), (0.1, -0.35, -1.2)));

        assert_close(rows[0][0], 1.0);
        assert_close(rows[1][1], 1.0);
        assert_close(rows[2][2], 1.0);
        assert_close(rows[0][1], 0.0);
        assert_close(rows[1][0], 0.0);
        assert_close(rows[2][0], 0.0);
    }

    #[test]
    fn translation_is_placed_in_the_fourth_column() {
        let rows = transform_rows(config_with((12.0, 34.0, 56.0), (0.25, -0.5, -1.75)));

        assert_close(rows[0][3], 0.25);
        assert_close(rows[1][3], -0.5);
        assert_close(rows[2][3], -1.75);
    }

    // ヨー90度で前方(-Z)がどこを向くかを確認し、回転軸の取り違えを検出する。
    #[test]
    fn yaw_90_degrees_maps_forward_axis_to_x() {
        let rows = transform_rows(config_with((0.0, 90.0, 0.0), (0.0, 0.0, 0.0)));

        assert_close(rows[0][2], 1.0);
        assert_close(rows[2][0], -1.0);
        assert_close(rows[1][1], 1.0);
    }

    #[test]
    fn pitch_90_degrees_rotates_around_x_axis() {
        let rows = transform_rows(config_with((90.0, 0.0, 0.0), (0.0, 0.0, 0.0)));

        assert_close(rows[0][0], 1.0);
        assert_close(rows[1][2], -1.0);
        assert_close(rows[2][1], 1.0);
    }

    #[test]
    fn roll_90_degrees_rotates_around_z_axis() {
        let rows = transform_rows(config_with((0.0, 0.0, 90.0), (0.0, 0.0, 0.0)));

        assert_close(rows[0][1], -1.0);
        assert_close(rows[1][0], 1.0);
        assert_close(rows[2][2], 1.0);
    }

    // 回転行列は各行・各列が単位長で直交する。数式を壊すと崩れる性質を突く。
    #[test]
    fn rotation_part_stays_orthonormal_for_combined_angles() {
        let rows = transform_rows(config_with((23.0, -47.0, 111.0), (1.0, 2.0, 3.0)));

        for row in &rows {
            let length = (row[0] * row[0] + row[1] * row[1] + row[2] * row[2]).sqrt();
            assert_close(length, 1.0);
        }

        for column in 0..3 {
            let length = (0..3)
                .map(|row| rows[row][column] * rows[row][column])
                .sum::<f32>()
                .sqrt();
            assert_close(length, 1.0);
        }

        let dot_first_second = (0..3)
            .map(|axis| rows[0][axis] * rows[1][axis])
            .sum::<f32>();
        assert_close(dot_first_second, 0.0);
    }
}
