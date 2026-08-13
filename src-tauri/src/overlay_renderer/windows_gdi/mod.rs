mod blend;
mod color;
mod composite;
mod edt;
mod ffi;
mod gdi;
mod geometry;
mod layout;
mod mask;
mod scale;
mod text_line;
mod types;
mod wrap;

use blend::composite_mask_shifted;
use color::{parse_hex_rgb, scale_text_alpha};
use composite::{apply_dilated_outline, draw_text_background, mask_ink_bounds};
use layout::{calculate_text_layout, calculate_texture_height, calculate_texture_width};
use mask::TextMask;
use scale::{clamp_i32, render_scale, scale_i32, scale_u32};

use super::frame::OverlayFrame;
use super::settings::RenderSettings;

// Windows GDIでテキストだけを描き、生成したマスクからRGBAへ合成する。
pub fn render_subtitle_frame(
    text: &str,
    settings: &RenderSettings,
) -> Result<OverlayFrame, String> {
    let scale = render_scale(settings);
    let layout = calculate_text_layout(text, settings, scale)?;
    let width = calculate_texture_width(settings, scale, &layout);
    let height = calculate_texture_height(settings, layout.block_height, layout.padding_y, scale);

    let mut pixels = vec![0; width as usize * height as usize * 4];
    if text.is_empty() {
        return Ok(OverlayFrame {
            pixels,
            width,
            height,
        });
    }

    let mut mask = TextMask::new(width, height, layout.font_size, layout.ruby_font_size)?;
    let x_center = width as i32 / 2 + scale_i32(settings.text_offset_x, scale);
    let y_center = height as i32 / 2 + scale_i32(settings.text_offset_y, scale);
    let block_top = clamp_i32(
        y_center - layout.block_height as i32 / 2,
        layout.padding_y as i32 / 2,
        height as i32 - layout.padding_y as i32 / 2 - layout.block_height as i32,
    );
    // TextOutW は既定 TA_TOP。y は文字セルの上端。
    // 1行目本文セル上端 = 行枠上端 + 上ルビ帯。
    let first_base_top = block_top + layout.ruby_above_extra as i32;

    // 先に文字マスクを作り、セル近傍だけ画素スキャンしてインク境界を取る。
    let (text_rect, cell_union) = mask.draw_lines(
        &layout.lines,
        &layout.widths,
        x_center,
        first_base_top,
        layout.body_line_height,
        layout.ruby_above_extra,
        layout.ruby_below_extra,
        layout.ruby_distance,
    )?;

    let search = cell_union
        .unwrap_or(text_rect)
        .inflate(1)
        .clamp_to_image(width, height)
        .unwrap_or(text_rect);
    // メトリクス近似ではなく実画素。走査範囲は文字セル近傍のみ。
    let ink_bounds = mask_ink_bounds(mask.bytes(), width, height, search).unwrap_or(search);

    // 合成は実インク付近だけ（長い行でも全テクスチャを何度も舐めない）。
    let effect_pad = scale_u32(settings.outline_width, scale)
        .max(scale_u32(settings.shadow_blur, scale))
        .max(2) as i32;
    let composite_rect = ink_bounds
        .inflate(effect_pad)
        .clamp_to_image(width, height)
        .unwrap_or(text_rect);

    if settings.background_enabled {
        draw_text_background(&mut pixels, width, height, ink_bounds, settings, scale);
    }

    let text_color = parse_hex_rgb(&settings.text_color).unwrap_or([255, 255, 255]);
    let outline_color = parse_hex_rgb(&settings.outline_color).unwrap_or([0, 0, 0]);
    let shadow_color = parse_hex_rgb(&settings.shadow_color).unwrap_or([0, 0, 0]);
    let text_alpha = scale_text_alpha(255, settings);

    let shadow_blur = scale_u32(settings.shadow_blur, scale);
    if settings.shadow_enabled && shadow_blur > 0 {
        let offset = (shadow_blur as i32 / 3).clamp(2, 12);
        composite_mask_shifted(
            &mut pixels,
            mask.bytes(),
            width,
            height,
            composite_rect,
            offset,
            offset,
            shadow_color,
            scale_text_alpha(160, settings),
        );

        // ぼかしは複数方向の薄い合成で近似し、GDI依存のアルファ問題を避ける。
        if shadow_blur >= 8 {
            for (dx, dy) in [(offset / 2, 0), (0, offset / 2), (offset, offset / 2)] {
                composite_mask_shifted(
                    &mut pixels,
                    mask.bytes(),
                    width,
                    height,
                    composite_rect,
                    dx,
                    dy,
                    shadow_color,
                    scale_text_alpha(70, settings),
                );
            }
        }
    }

    let outline_width = scale_u32(settings.outline_width, scale);
    if settings.outline_enabled && outline_width > 0 {
        let radius = outline_width.min(24) as i32;
        // 円盤膨張と同等の見た目を距離変換で作る（O(画素数)、太さに強い）。
        // 袋文字は不透明（字幕透過設定のみ反映）。AAカバレッジは使わない。
        apply_dilated_outline(
            &mut pixels,
            mask.bytes(),
            width,
            height,
            ink_bounds,
            radius,
            outline_color,
            text_alpha,
        );
    }

    composite_mask_shifted(
        &mut pixels,
        mask.bytes(),
        width,
        height,
        composite_rect,
        0,
        0,
        text_color,
        text_alpha,
    );

    Ok(OverlayFrame {
        pixels,
        width,
        height,
    })
}

#[cfg(test)]
mod integration_tests {
    use super::mask::text_bounds;

    #[test]
    fn text_bounds_contains_ruby_band_above_base_top() {
        let first_base_top = 120;
        let base_cell_height = 96;
        let ruby_above_extra = 50;
        let ruby_below_extra = 40;
        let body_line_height = 120;
        let rect = text_bounds(
            &[200],
            256,
            first_base_top,
            base_cell_height,
            ruby_above_extra,
            ruby_below_extra,
            body_line_height,
            1,
            512,
            512,
        )
        .expect("bounds");
        let ruby_top = first_base_top - ruby_above_extra as i32;
        assert!(rect.y <= ruby_top);
        assert!(rect.bottom() >= first_base_top + base_cell_height);
    }

    #[test]
    fn text_bounds_includes_below_ruby_for_second_line() {
        let first_base_top = 100;
        let base_cell_height = 80;
        let ruby_above_extra = 40;
        let ruby_below_extra = 50;
        let body_line_height = 100;
        let rect = text_bounds(
            &[200, 180],
            256,
            first_base_top,
            base_cell_height,
            ruby_above_extra,
            ruby_below_extra,
            body_line_height,
            2,
            512,
            512,
        )
        .expect("bounds");
        // 2行目は最終行なので下ルビ。手前に上ルビ帯は入らない。
        let second_base = first_base_top + body_line_height as i32;
        assert!(rect.bottom() >= second_base + base_cell_height + ruby_below_extra as i32);
    }

    #[test]
    fn ruby_line_keeps_ink_inside_texture() {
        use crate::overlay_renderer::settings::RenderSettings;

        let settings = RenderSettings {
            width: 1024,
            height: 256,
            max_texture_width: 4096,
            max_texture_height: 4096,
            render_scale: 1.0,
            font_size: 96,
            font_size_percent: 100,
            ruby_enabled: true,
            ruby_distance: 0,
            background_enabled: true,
            background_padding: 8,
            outline_enabled: false,
            shadow_enabled: false,
            text_offset_x: 0,
            text_offset_y: 0,
            position_x: 0.0,
            position_y: -0.35,
            position_z: -1.2,
            ..RenderSettings::default()
        };

        let frame = super::render_subtitle_frame("二人{物の怪|もののけ}になるまで", &settings)
            .expect("render");
        assert!(frame.width > 1);
        assert!(frame.height > 1);

        let stride = frame.width as usize * 4;
        let mut min_y = frame.height as i32;
        let mut max_y = 0_i32;
        let mut ink_count = 0_u32;
        for y in 0..frame.height as i32 {
            for x in 0..frame.width as i32 {
                let i = y as usize * stride + x as usize * 4;
                let a = frame.pixels[i + 3];
                if a < 16 {
                    continue;
                }
                ink_count += 1;
                min_y = min_y.min(y);
                max_y = max_y.max(y);
            }
        }

        assert!(ink_count > 200, "expected visible glyphs, got {ink_count}");
        // 本文が見切れず、上下に余白があること（端に貼り付いていない）。
        assert!(min_y > 4, "ink too close to top: {min_y}");
        assert!(
            max_y + 4 < frame.height as i32,
            "ink clipped at bottom: max_y={max_y}, height={}",
            frame.height
        );
        // 背景だけ上に伸びて文字が下端に潰れていないこと。
        let ink_span = max_y - min_y + 1;
        assert!(
            ink_span > (settings.font_size as i32 / 2),
            "ink span too thin ({ink_span}); text likely clipped"
        );
    }

    #[test]
    fn ruby_distance_controls_optical_gap() {
        use crate::overlay_renderer::metrics::effective_render_scale;
        use crate::overlay_renderer::settings::RenderSettings;

        let base_settings = RenderSettings {
            width: 1024,
            height: 256,
            max_texture_width: 4096,
            max_texture_height: 4096,
            render_scale: 1.0,
            font_size: 96,
            font_size_percent: 100,
            ruby_enabled: true,
            background_enabled: false,
            outline_enabled: false,
            shadow_enabled: false,
            text_offset_x: 0,
            text_offset_y: 0,
            position_x: 0.0,
            position_y: -0.35,
            position_z: -1.2,
            ..RenderSettings::default()
        };

        let ink_span = |distance: u32| {
            let settings = RenderSettings {
                ruby_distance: distance,
                ..base_settings.clone()
            };
            let frame = super::render_subtitle_frame("{漢字|かんじ}", &settings).expect("render");
            let stride = frame.width as usize * 4;
            let mut min_y = frame.height as i32;
            let mut max_y = 0_i32;
            for y in 0..frame.height as i32 {
                for x in 0..frame.width as i32 {
                    let i = y as usize * stride + x as usize * 4;
                    if frame.pixels[i + 3] < 24 {
                        continue;
                    }
                    min_y = min_y.min(y);
                    max_y = max_y.max(y);
                }
            }
            max_y - min_y + 1
        };

        let span0 = ink_span(0);
        let span20 = ink_span(20);
        let scale = effective_render_scale(&base_settings);
        // 距離を広げると縦のインク範囲が増える（ルビが上に離れる）。
        let lift_min = (12.0_f32 * scale).round() as i32;
        assert!(
            span20 >= span0 + lift_min,
            "distance 20 should lift ruby; span0={span0}, span20={span20}, lift_min={lift_min}"
        );

        // 距離0はセル高さ足し合わせより明らかに短い（空きを詰めた証拠）。
        // 実フォントpxは画質×距離LOD後のスケールを反映する。
        let font_px = (96.0_f32 * scale).round();
        let loose_span = (font_px * 0.42).round() as i32 + font_px as i32;
        assert!(
            span0 < loose_span - 8,
            "distance 0 should be optically tight; span0={span0}, loose≈{loose_span}"
        );
    }

    #[test]
    fn multiline_ruby_keeps_ink_inside_texture() {
        use crate::overlay_renderer::settings::RenderSettings;

        let settings = RenderSettings {
            width: 1024,
            height: 512,
            max_texture_width: 4096,
            max_texture_height: 4096,
            render_scale: 1.0,
            font_size: 96,
            font_size_percent: 100,
            ruby_enabled: true,
            ruby_distance: 10,
            background_enabled: false,
            outline_enabled: false,
            shadow_enabled: false,
            text_offset_x: 0,
            text_offset_y: 0,
            ..RenderSettings::default()
        };

        // 2行目の下ルビがテクスチャ下端で欠けないこと。
        let frame =
            super::render_subtitle_frame("{位置|いち}を確認\n{文字|もじ}も下ルビ", &settings)
                .expect("render");

        let stride = frame.width as usize * 4;
        let mut min_y = frame.height as i32;
        let mut max_y = 0_i32;
        let mut ink_count = 0_u32;
        for y in 0..frame.height as i32 {
            for x in 0..frame.width as i32 {
                let i = y as usize * stride + x as usize * 4;
                if frame.pixels[i + 3] < 16 {
                    continue;
                }
                ink_count += 1;
                min_y = min_y.min(y);
                max_y = max_y.max(y);
            }
        }

        assert!(ink_count > 200, "expected visible glyphs, got {ink_count}");
        assert!(min_y > 4, "ink too close to top: {min_y}");
        assert!(
            max_y + 4 < frame.height as i32,
            "ink clipped at bottom: max_y={max_y}, height={}",
            frame.height
        );
    }
}
