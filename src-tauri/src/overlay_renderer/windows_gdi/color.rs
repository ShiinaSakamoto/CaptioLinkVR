use super::super::settings::RenderSettings;

pub(super) fn text_opacity_factor(settings: &RenderSettings) -> f32 {
    settings.text_opacity_percent.clamp(10, 100) as f32 / 100.0
}

pub(super) fn effective_background_opacity(settings: &RenderSettings) -> f32 {
    let bg_percent = settings.background_opacity_percent.clamp(10, 100) as f32 / 100.0;
    (text_opacity_factor(settings) * bg_percent).clamp(0.0, 1.0)
}

pub(super) fn scale_text_alpha(base: u8, settings: &RenderSettings) -> u8 {
    ((base as f32) * text_opacity_factor(settings))
        .round()
        .clamp(0.0, 255.0) as u8
}

pub(super) fn parse_hex_rgb(value: &str) -> Option<[u8; 3]> {
    let hex = value.strip_prefix('#').unwrap_or(value);
    if hex.len() != 6 {
        return None;
    }
    let red = u8::from_str_radix(&hex[0..2], 16).ok()?;
    let green = u8::from_str_radix(&hex[2..4], 16).ok()?;
    let blue = u8::from_str_radix(&hex[4..6], 16).ok()?;
    Some([red, green, blue])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings_with_opacity(
        text_opacity_percent: u32,
        background_opacity_percent: u32,
    ) -> RenderSettings {
        RenderSettings {
            text_opacity_percent,
            background_opacity_percent,
            ..RenderSettings::default()
        }
    }

    #[test]
    fn text_opacity_factor_has_a_10_percent_floor() {
        // UI側（subtitleOpacity.js）と同じく下限10%を下回らない。
        let settings = settings_with_opacity(0, 100);
        assert_eq!(text_opacity_factor(&settings), 0.1);
    }

    #[test]
    fn text_opacity_factor_caps_at_100_percent() {
        let settings = settings_with_opacity(150, 100);
        assert_eq!(text_opacity_factor(&settings), 1.0);
    }

    #[test]
    fn text_opacity_factor_passes_through_mid_range_values() {
        let settings = settings_with_opacity(62, 100);
        assert!((text_opacity_factor(&settings) - 0.62).abs() < f32::EPSILON);
    }

    #[test]
    fn effective_background_opacity_multiplies_text_and_background_factors() {
        let settings = settings_with_opacity(50, 50);
        assert!((effective_background_opacity(&settings) - 0.25).abs() < f32::EPSILON);
    }

    #[test]
    fn effective_background_opacity_has_a_10_percent_floor_on_background_alone() {
        let settings = settings_with_opacity(100, 0);
        assert_eq!(effective_background_opacity(&settings), 0.1);
    }

    #[test]
    fn scale_text_alpha_scales_and_rounds_to_u8_range() {
        let settings = settings_with_opacity(50, 100);
        assert_eq!(scale_text_alpha(255, &settings), 128);
        assert_eq!(scale_text_alpha(0, &settings), 0);
    }

    #[test]
    fn parse_hex_rgb_accepts_with_and_without_hash() {
        assert_eq!(parse_hex_rgb("#ffffff"), Some([255, 255, 255]));
        assert_eq!(parse_hex_rgb("000000"), Some([0, 0, 0]));
        assert_eq!(parse_hex_rgb("9ca6e6"), Some([156, 166, 230]));
    }

    #[test]
    fn parse_hex_rgb_rejects_invalid_input() {
        assert_eq!(parse_hex_rgb("#fff"), None);
        assert_eq!(parse_hex_rgb("#gggggg"), None);
        assert_eq!(parse_hex_rgb(""), None);
    }
}
