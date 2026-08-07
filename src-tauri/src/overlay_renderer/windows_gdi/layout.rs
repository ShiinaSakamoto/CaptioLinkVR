use super::gdi::{GdiFont, TextMeasurer};
use super::scale::{
    calc_body_line_height, calc_ruby_font_size, effective_font_size, max_texture_dimension,
    scale_i32, scale_u32,
};
use super::super::ruby::{parse_text_lines, ParsedLine, ParsedSegment};
use super::super::settings::RenderSettings;

/// ルビ自然幅を本文幅へ寄せる割合（1.0で完全一致。完全には広げない）。
const RUBY_WIDTH_BLEND_TOWARD_BASE: f32 = 0.75;

pub(super) struct TextLayout {
    pub(super) font_size: u32,
    pub(super) ruby_font_size: u32,
    pub(super) ruby_distance: u32,
    /// 最終行以外のルビを上に置くための余白。
    pub(super) ruby_above_extra: u32,
    /// 最終行（2行以上のとき）のルビを下に置くための余白。
    pub(super) ruby_below_extra: u32,
    /// 本文の行送り（ルビ帯を含まない）。
    pub(super) body_line_height: u32,
    pub(super) padding_x: u32,
    pub(super) padding_y: u32,
    pub(super) lines: Vec<TextLine>,
    pub(super) widths: Vec<i32>,
    pub(super) block_height: u32,
}

pub(super) struct TextLine {
    pub(super) segments: Vec<TextSegment>,
    pub(super) width: i32,
}

pub(super) enum TextSegment {
    Plain {
        text: String,
        width: i32,
    },
    Ruby {
        base: String,
        ruby: String,
        base_width: i32,
        ruby_width: i32,
        /// 描画時にルビを広げる目標幅（自然幅〜本文幅の間）。
        ruby_draw_width: i32,
        width: i32,
    },
}

pub(super) fn calculate_texture_width(settings: &RenderSettings, scale: f32, layout: &TextLayout) -> u32 {
    let min_width = scale_u32(settings.width, scale);
    let max_width = max_texture_dimension(settings.max_texture_width);
    let max_line_width = layout.widths.iter().copied().max().unwrap_or(0).max(0) as u32;
    if max_line_width == 0 {
        return min_width.min(max_width).max(1);
    }

    texture_width_for_line(settings, scale, layout.padding_x, max_line_width)
        .max(min_width.min(max_width))
        .min(max_width)
        .max(1)
}

pub(super) fn calculate_texture_height(
    settings: &RenderSettings,
    block_height: u32,
    padding_y: u32,
    scale: f32,
) -> u32 {
    let min_height = scale_u32(settings.height, scale);
    let max_height = max_texture_dimension(settings.max_texture_height);
    if block_height == 0 {
        return min_height.min(max_height).max(1);
    }

    texture_height_for_block(settings, scale, padding_y, block_height)
        .max(min_height.min(max_height))
        .min(max_height)
        .max(1)
}

pub(super) fn texture_width_for_line(
    settings: &RenderSettings,
    scale: f32,
    padding_x: u32,
    max_line_width: u32,
) -> u32 {
    let side_margin = padding_x.saturating_add(horizontal_effect_margin(settings, scale));
    let offset_margin = scale_i32(settings.text_offset_x, scale)
        .unsigned_abs()
        .saturating_mul(2);
    max_line_width
        .saturating_add(side_margin.saturating_mul(2))
        .saturating_add(offset_margin)
}

pub(super) fn texture_height_for_block(
    settings: &RenderSettings,
    scale: f32,
    padding_y: u32,
    block_height: u32,
) -> u32 {
    let vertical_margin = padding_y.saturating_add(vertical_effect_margin(settings, scale));
    let offset_margin = scale_i32(settings.text_offset_y, scale)
        .unsigned_abs()
        .saturating_mul(2);
    block_height
        .saturating_add(vertical_margin.saturating_mul(2))
        .saturating_add(offset_margin)
}
pub(super) fn horizontal_effect_margin(settings: &RenderSettings, scale: f32) -> u32 {
    let mut margin = 8_u32;
    if settings.background_enabled {
        margin = margin.max(scale_u32(settings.background_padding, scale));
    }
    if settings.outline_enabled {
        margin = margin.max(scale_u32(settings.outline_width, scale).min(24));
    }
    if settings.shadow_enabled {
        let blur = scale_u32(settings.shadow_blur, scale);
        if blur > 0 {
            let offset = ((blur as f32) / 3.0).round().clamp(2.0, 12.0) as u32;
            margin = margin.max(offset);
            if blur >= 8 {
                margin = margin.max(offset + blur / 6);
            }
        }
    }
    margin
}

pub(super) fn vertical_effect_margin(settings: &RenderSettings, scale: f32) -> u32 {
    horizontal_effect_margin(settings, scale)
}

pub(super) fn calculate_text_layout(
    text: &str,
    settings: &RenderSettings,
    scale: f32,
) -> Result<TextLayout, String> {
    // フォントサイズは設定値のみ。テクスチャ上限に合わせて縮小しない。
    // 長い行は最大テクスチャ幅まで広げ、それでも足りなければ折り返す。
    // VR 見かけの文字サイズは frame_width_meters がテクスチャ幅に比例して保つ。
    let font_size = effective_font_size(settings, scale);
    let parsed_lines = parse_text_lines(text, settings.ruby_enabled);
    let has_ruby = parsed_lines.iter().any(|line| line.has_ruby);

    let ruby_font_size = calc_ruby_font_size(font_size);
    let ruby_distance = scale_u32(settings.ruby_distance, scale);
    let mut ruby_measurer = TextMeasurer::new(ruby_font_size)?;
    let mut measurer = TextMeasurer::new(font_size)?;
    // セル同士ではなく実インク同士の距離にする（CSS の見た目に近づける）。
    let ruby_above_extra = if has_ruby {
        optical_ruby_extra_above(&measurer.font, &ruby_measurer.font, ruby_distance)
    } else {
        0
    };
    let ruby_below_extra = if has_ruby {
        optical_ruby_extra_below(&measurer.font, &ruby_measurer.font, ruby_distance)
    } else {
        0
    };
    let body_line_height = calc_body_line_height(font_size);
    let padding_x = 96_u32.max((font_size as f32 * 1.8).round() as u32);
    let padding_y = 72_u32.max((font_size as f32 * 1.4).round() as u32);
    let wrap_width = available_content_width(settings, scale, padding_x)
        .max(font_size.max(1)) as i32;

    let mut lines = Vec::new();
    for parsed in &parsed_lines {
        lines.extend(wrap_parsed_line(
            parsed,
            wrap_width,
            &mut measurer,
            &mut ruby_measurer,
        )?);
    }
    let widths = lines.iter().map(|line| line.width).collect::<Vec<_>>();
    let line_count = lines.len().max(1) as u32;
    // 最終行だけ下ルビ。それ以外（1行だけのときも含む）は上ルビ。
    let above_band_count = if line_count <= 1 {
        1_u32
    } else {
        line_count - 1
    };
    let below_band_count = if line_count > 1 { 1_u32 } else { 0_u32 };
    let block_height = above_band_count
        .saturating_mul(ruby_above_extra)
        .saturating_add(line_count.saturating_mul(body_line_height))
        .saturating_add(below_band_count.saturating_mul(ruby_below_extra));

    Ok(TextLayout {
        font_size,
        ruby_font_size,
        ruby_distance,
        ruby_above_extra,
        ruby_below_extra,
        body_line_height,
        padding_x,
        padding_y,
        lines,
        widths,
        block_height,
    })
}

/// ルビ実インク下端と本文実インク上端の間隔が ruby_distance になるよう、
/// 本文セル上端より上に必要な余白を返す。
pub(super) fn optical_ruby_extra_above(base: &GdiFont, ruby: &GdiFont, ruby_distance: u32) -> u32 {
    let gap = optical_ruby_gap_above_base(base, ruby, ruby_distance);
    gap.max(1) as u32
}

/// 本文実インク下端とルビ実インク上端の間隔が ruby_distance になるよう、
/// 本文セル上端から下方向に確保する余白を返す。
pub(super) fn optical_ruby_extra_below(base: &GdiFont, ruby: &GdiFont, ruby_distance: u32) -> u32 {
    let gap = optical_ruby_gap_below_base(base, ruby, ruby_distance);
    gap.max(1) as u32
}

/// base_top から見て、ルビセル上端をどれだけ上に置くか（正の値）。
pub(super) fn optical_ruby_gap_above_base(base: &GdiFont, ruby: &GdiFont, ruby_distance: u32) -> i32 {
    // ルビ実インク下端 = ruby_top + (ruby.height - ruby.bottom_bearing)
    // 本文実インク上端 = base_top + base.top_bearing
    // 距離0なら両者が接する:
    // ruby_top = base_top + base.top_bearing - (ruby.height - ruby.bottom_bearing)
    let ruby_to_ink_bottom = ruby.height - ruby.bottom_bearing;
    let gap = ruby_to_ink_bottom - base.top_bearing + ruby_distance as i32;
    gap.max(ruby.ink_height().max(1) / 2)
}

/// base_top から見て、下ルビのセル上端をどれだけ下に置くか（正の値）。
pub(super) fn optical_ruby_gap_below_base(base: &GdiFont, ruby: &GdiFont, ruby_distance: u32) -> i32 {
    // 本文実インク下端 = base_top + (base.height - base.bottom_bearing)
    // ルビ実インク上端 = ruby_top + ruby.top_bearing
    // 距離0なら両者が接する:
    // ruby_top = base_top + (base.height - base.bottom_bearing) - ruby.top_bearing
    let base_to_ink_bottom = base.height - base.bottom_bearing;
    let gap = base_to_ink_bottom - ruby.top_bearing + ruby_distance as i32;
    gap.max(ruby.ink_height().max(1) / 2)
}

/// TextOutW(TA_TOP) の本文セル上端から、上ルビセル上端を求める。
pub(super) fn optical_ruby_top_above(
    base_top: i32,
    base: &GdiFont,
    ruby: &GdiFont,
    ruby_distance: u32,
) -> i32 {
    base_top - optical_ruby_gap_above_base(base, ruby, ruby_distance)
}

/// TextOutW(TA_TOP) の本文セル上端から、下ルビセル上端を求める。
pub(super) fn optical_ruby_top_below(
    base_top: i32,
    base: &GdiFont,
    ruby: &GdiFont,
    ruby_distance: u32,
) -> i32 {
    base_top + optical_ruby_gap_below_base(base, ruby, ruby_distance)
}

/// 表示行 index に応じた本文セル上端。
/// 最終行以外は上ルビ帯を手前に確保する。最終行（2行以上のとき）は下ルビのみ。
pub(super) fn line_uses_ruby_below(line_index: usize, line_count: usize) -> bool {
    line_count > 1 && line_index + 1 == line_count
}

pub(super) fn base_top_for_line(
    first_base_top: i32,
    line_index: usize,
    body_line_height: u32,
    ruby_above_extra: u32,
    line_count: usize,
) -> i32 {
    let mut y = first_base_top;
    let line_count = line_count.max(1);
    for index in 1..=line_index {
        y += body_line_height as i32;
        // この行が上ルビなら、本文の手前に上ルビ帯を足す。
        if !line_uses_ruby_below(index, line_count) {
            y += ruby_above_extra as i32;
        }
    }
    y
}

/// ルビの描画幅。自然幅が本文より短いとき、本文幅へある程度寄せる。
pub(super) fn expanded_ruby_draw_width(ruby_width: i32, base_width: i32) -> i32 {
    if ruby_width <= 0 {
        return 0;
    }
    if ruby_width >= base_width {
        return ruby_width;
    }
    let delta = base_width - ruby_width;
    ruby_width + ((delta as f32) * RUBY_WIDTH_BLEND_TOWARD_BASE).round() as i32
}

/// テクスチャ最大幅から余白を除いた、1行に載せられる本文幅。
pub(super) fn available_content_width(settings: &RenderSettings, scale: f32, padding_x: u32) -> u32 {
    let max_width = max_texture_dimension(settings.max_texture_width);
    let side_margin = padding_x.saturating_add(horizontal_effect_margin(settings, scale));
    let offset_margin = scale_i32(settings.text_offset_x, scale)
        .unsigned_abs()
        .saturating_mul(2);
    max_width
        .saturating_sub(side_margin.saturating_mul(2))
        .saturating_sub(offset_margin)
        .max(1)
}

/// 明示改行後の1行を、wrap_width を超えないよう必要なら複数行へ分割する。
/// ルビセグメントは分割せず、平文は文字単位で折り返す。
pub(super) fn wrap_parsed_line(
    line: &ParsedLine,
    wrap_width: i32,
    measurer: &mut TextMeasurer,
    ruby_measurer: &mut TextMeasurer,
) -> Result<Vec<TextLine>, String> {
    let wrap_width = wrap_width.max(1);
    let mut lines = Vec::new();
    let mut current_segments = Vec::new();
    let mut current_width = 0_i32;

    let flush_line = |segments: &mut Vec<TextSegment>,
                      width: &mut i32,
                      lines: &mut Vec<TextLine>| {
        if segments.is_empty() {
            return;
        }
        lines.push(TextLine {
            segments: std::mem::take(segments),
            width: *width,
        });
        *width = 0;
    };

    for segment in &line.segments {
        match segment {
            ParsedSegment::Plain(text) => {
                for ch in text.chars() {
                    let piece = ch.to_string();
                    let piece_width = measurer.measure_width(&piece)?;
                    if current_width > 0 && current_width + piece_width > wrap_width {
                        flush_line(&mut current_segments, &mut current_width, &mut lines);
                    }
                    match current_segments.last_mut() {
                        Some(TextSegment::Plain {
                            text: plain,
                            width,
                        }) => {
                            plain.push(ch);
                            *width += piece_width;
                        }
                        _ => {
                            current_segments.push(TextSegment::Plain {
                                text: piece,
                                width: piece_width,
                            });
                        }
                    }
                    current_width += piece_width;
                }
            }
            ParsedSegment::Ruby { base, ruby } => {
                let base_width = measurer.measure_width(base)?;
                let ruby_width = ruby_measurer.measure_width(ruby)?;
                let ruby_draw_width = expanded_ruby_draw_width(ruby_width, base_width);
                let width = base_width.max(ruby_draw_width);
                if current_width > 0 && current_width + width > wrap_width {
                    flush_line(&mut current_segments, &mut current_width, &mut lines);
                }
                current_segments.push(TextSegment::Ruby {
                    base: base.clone(),
                    ruby: ruby.clone(),
                    base_width,
                    ruby_width,
                    ruby_draw_width,
                    width,
                });
                current_width += width;
            }
        }
    }

    flush_line(&mut current_segments, &mut current_width, &mut lines);

    // 空行（ASS の連続改行など）は行高さを残す。
    if lines.is_empty() {
        lines.push(TextLine {
            segments: Vec::new(),
            width: 0,
        });
    }

    Ok(lines)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expanded_ruby_draw_width_blends_toward_base() {
        assert_eq!(expanded_ruby_draw_width(40, 100), 40 + ((60.0_f32 * 0.75).round() as i32));
        assert_eq!(expanded_ruby_draw_width(100, 80), 100);
        assert_eq!(expanded_ruby_draw_width(0, 80), 0);
    }

    #[test]
    fn base_top_for_line_keeps_above_bands_until_last_line() {
        // 3行: 0,1 は上 / 2 は下。行1の手前に上ルビ帯が入る。
        assert_eq!(base_top_for_line(100, 0, 120, 40, 3), 100);
        assert_eq!(base_top_for_line(100, 1, 120, 40, 3), 260);
        assert_eq!(base_top_for_line(100, 2, 120, 40, 3), 380);
        // 2行: 最終行手前に上ルビ帯は不要。
        assert_eq!(base_top_for_line(100, 1, 120, 40, 2), 220);
    }

    #[test]
    fn line_uses_ruby_below_only_on_final_line_when_multiline() {
        assert!(!line_uses_ruby_below(0, 1));
        assert!(!line_uses_ruby_below(0, 3));
        assert!(!line_uses_ruby_below(1, 3));
        assert!(line_uses_ruby_below(2, 3));
    }
}
