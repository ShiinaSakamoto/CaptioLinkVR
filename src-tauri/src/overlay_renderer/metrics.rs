use super::settings::RenderSettings;

const DEFAULT_FONT_SIZE: u32 = 96; // overlay_width_meters の設計参照px（実フォント既定53とは別）

/// この距離ではユーザー画質 × 品質底上げがそのまま有効スケールになる（デフォルト |z|≈1.2）。
pub const RENDER_SCALE_REF_DISTANCE_M: f32 = 1.2;

/// ユーザー「1倍」時の実質基準。距離 LOD の前に乗せる底上げ（見た目サイズは別途補償）。
///
/// GDI は ANTIALIASED_QUALITY 済み。ClearType は VR 平面で色縁が出るので使わない。
/// ぼやけの主因は HMD 画素に対するテクスチャ密度不足。1.2〜1.5 では体感しにくかったため
/// 既定 1 倍を約 2 倍相当の密度へ寄せる（遠い位置の LOD 軽減は維持）。
pub const RENDER_SCALE_QUALITY_BASELINE: f32 = 2.0;

/// 実効スケール上限。底上げ後もスライダー上限（1.5倍）に頭打ち余白を残す。
const EFFECTIVE_RENDER_SCALE_MAX: f32 = 3.0;
const EFFECTIVE_RENDER_SCALE_MIN: f32 = 0.35;

// 生成テクスチャ幅に合わせてVR内の物理幅も伸縮し、文字の見かけサイズを一定に保つ。
// フォントpxを文字数で変えない前提。長い字幕はテクスチャが広がり、ここが同じ見た目を維持する。
pub fn frame_width_meters(settings: &RenderSettings, frame_width: u32) -> f32 {
    let base_width_meters = effective_base_width_meters(settings);
    if frame_width <= 1 {
        return base_width_meters;
    }

    let base_texture_width = scaled_base_texture_width(settings) as f32;
    base_width_meters * (frame_width as f32 / base_texture_width.max(1.0))
}

fn effective_base_width_meters(settings: &RenderSettings) -> f32 {
    let font_scale = (settings.font_size.max(1) as f32 / DEFAULT_FONT_SIZE as f32).max(0.1);
    let percent_scale = (settings.font_size_percent.max(1) as f32 / 100.0).max(0.1);
    (settings.overlay_width_meters * font_scale * percent_scale).max(0.01)
}

fn scaled_base_texture_width(settings: &RenderSettings) -> u32 {
    ((settings.width.max(1) as f32) * effective_render_scale(settings))
        .round()
        .max(1.0) as u32
}

/// ユーザー設定の画質を基準に、視距離へ合わせて実レンダースケールを決める。
///
/// 字幕の見かけ角に対するピクセル密度をだいたい一定にし、
/// 遠いときは軽く、近いときは基準以上（上限あり）にする。
/// サイズ%はフォントpx側で既に比例するため、ここでの LOD は主に距離補正。
///
/// 実効値 = ユーザー画質 × 品質底上げ × 距離LOD（上下限あり）。
/// VR内の見かけサイズは `frame_width_meters` がテクスチャ幅に合わせて保つ。
pub fn effective_render_scale(settings: &RenderSettings) -> f32 {
    let user = settings.render_scale.clamp(0.5, 1.5);
    let distance = overlay_view_distance_meters(settings);
    let lod = (RENDER_SCALE_REF_DISTANCE_M / distance).clamp(0.5, 1.25);
    (user * RENDER_SCALE_QUALITY_BASELINE * lod)
        .clamp(EFFECTIVE_RENDER_SCALE_MIN, EFFECTIVE_RENDER_SCALE_MAX)
}

fn overlay_view_distance_meters(settings: &RenderSettings) -> f32 {
    let x = settings.position_x;
    let y = settings.position_y;
    let z = settings.position_z;
    (x * x + y * y + z * z).sqrt().max(0.25)
}

#[cfg(test)]
mod tests {
    use super::{
        effective_render_scale, RENDER_SCALE_QUALITY_BASELINE, RENDER_SCALE_REF_DISTANCE_M,
    };
    use crate::overlay_renderer::settings::RenderSettings;

    fn settings_at_distance(distance: f32, render_scale: f32) -> RenderSettings {
        RenderSettings {
            render_scale,
            position_x: 0.0,
            position_y: 0.0,
            position_z: -distance,
            ..RenderSettings::default()
        }
    }

    #[test]
    fn render_scale_applies_quality_baseline_at_reference_distance() {
        let settings = settings_at_distance(RENDER_SCALE_REF_DISTANCE_M, 1.0);
        let scale = effective_render_scale(&settings);
        assert!((scale - RENDER_SCALE_QUALITY_BASELINE).abs() < 0.001);
    }

    #[test]
    fn render_scale_decreases_when_farther() {
        let near = effective_render_scale(&settings_at_distance(RENDER_SCALE_REF_DISTANCE_M, 1.0));
        let far = effective_render_scale(&settings_at_distance(RENDER_SCALE_REF_DISTANCE_M * 2.0, 1.0));
        assert!(far < near);
        // 遠い側 LOD 下限 0.5 × 品質底上げ
        assert!((far - RENDER_SCALE_QUALITY_BASELINE * 0.5).abs() < 0.001);
    }

    #[test]
    fn render_scale_respects_user_baseline() {
        let settings = settings_at_distance(RENDER_SCALE_REF_DISTANCE_M, 0.8);
        let scale = effective_render_scale(&settings);
        assert!((scale - 0.8 * RENDER_SCALE_QUALITY_BASELINE).abs() < 0.001);
    }

    #[test]
    fn render_scale_preserves_slider_headroom_above_one() {
        let at_one = effective_render_scale(&settings_at_distance(RENDER_SCALE_REF_DISTANCE_M, 1.0));
        let at_max = effective_render_scale(&settings_at_distance(RENDER_SCALE_REF_DISTANCE_M, 1.5));
        assert!(at_max > at_one + 0.2);
        assert!((at_max - 1.5 * RENDER_SCALE_QUALITY_BASELINE).abs() < 0.001);
    }

    #[test]
    fn default_pose_is_near_quality_baseline() {
        // 既定位置は y=-0.3 があるため |z|=1.2 よりわずかに遠い。それでも 1 倍付近の底上げが効くこと。
        let scale = effective_render_scale(&RenderSettings::default());
        assert!(scale > 1.8);
        assert!(scale < RENDER_SCALE_QUALITY_BASELINE);
    }
}
