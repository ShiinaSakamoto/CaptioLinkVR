use super::ffi::{SelectObject, SetBkMode, SetTextAlign, SetTextColor, TextOutW};
use super::gdi::{to_wide, DibSection, GdiFont, TextMeasurer};
use super::geometry::Rect;
use super::layout::{
    base_top_for_line, line_uses_ruby_below, optical_ruby_top_above, optical_ruby_top_below,
    TextLine, TextSegment,
};
use super::types::*;

pub(super) struct TextMask {
    pub(super) dib: DibSection,
    pub(super) font: GdiFont,
    pub(super) ruby_font: GdiFont,
    pub(super) last_rect: Option<Rect>,
}

impl TextMask {
    pub(super) fn new(width: u32, height: u32, font_size: u32, ruby_font_size: u32) -> Result<Self, String> {
        let dib = DibSection::new(width, height)?;
        let font = GdiFont::new(font_size)?;
        let ruby_font = GdiFont::new(ruby_font_size)?;
        unsafe {
            SelectObject(dib.hdc, font.handle as Hgdiobj);
            // TextOutW の y を文字セル上端として扱う（既定だが明示する）。
            SetTextAlign(dib.hdc, TA_TOP | TA_LEFT);
            SetBkMode(dib.hdc, TRANSPARENT);
            SetTextColor(dib.hdc, 0x00ff_ffff);
        }
        Ok(Self {
            dib,
            font,
            ruby_font,
            last_rect: None,
        })
    }

    pub(super) fn draw_lines(
        &mut self,
        lines: &[TextLine],
        widths: &[i32],
        x_center: i32,
        first_base_top: i32,
        body_line_height: u32,
        ruby_above_extra: u32,
        ruby_below_extra: u32,
        ruby_distance: u32,
    ) -> Result<(Rect, Option<Rect>), String> {
        if let Some(rect) = self.last_rect.take() {
            self.dib.clear_rect(rect);
        }

        let base_cell_height = self.font.height.max(self.font.size as i32).max(1);
        let line_count = lines.len().max(1);

        let mut draw_rect = text_bounds(
            widths,
            x_center,
            first_base_top,
            base_cell_height,
            ruby_above_extra,
            ruby_below_extra,
            body_line_height,
            line_count,
            self.dib.width,
            self.dib.height,
        )
        // 折り返し後も行が極端に長い場合（単一ルビなど）は描画を続行する。
        .unwrap_or(Rect {
            x: 0,
            y: 0,
            width: self.dib.width.max(1) as i32,
            height: self.dib.height.max(1) as i32,
        });

        let mut cell_union: Option<Rect> = None;
        let mut ruby_measurer = TextMeasurer::new(self.ruby_font.size)?;

        for (index, line) in lines.iter().enumerate() {
            let mut x = x_center - line.width / 2;
            // TextOutW(TA_TOP): y はセル上端。
            let base_top = base_top_for_line(
                first_base_top,
                index,
                body_line_height,
                ruby_above_extra,
                line_count,
            );
            // 最終行のみ下ルビ。それ以外は上ルビ。
            let ruby_top = if line_uses_ruby_below(index, line_count) {
                optical_ruby_top_below(base_top, &self.font, &self.ruby_font, ruby_distance)
            } else {
                optical_ruby_top_above(base_top, &self.font, &self.ruby_font, ruby_distance)
            };

            for segment in &line.segments {
                match segment {
                    TextSegment::Plain { text, width } => {
                        self.draw_text(&self.font, x, base_top, text)?;
                        include_cell_run(&mut cell_union, x, base_top, *width, &self.font);
                        x += *width;
                    }
                    TextSegment::Ruby {
                        base,
                        ruby,
                        base_width,
                        ruby_width,
                        ruby_draw_width,
                        width,
                    } => {
                        let base_x = x + (*width - *base_width) / 2;
                        let ruby_x = x + (*width - *ruby_draw_width) / 2;
                        self.draw_ruby_expanded(
                            &mut ruby_measurer,
                            ruby_x,
                            ruby_top,
                            ruby,
                            *ruby_width,
                            *ruby_draw_width,
                        )?;
                        self.draw_text(&self.font, base_x, base_top, base)?;
                        include_cell_run(
                            &mut cell_union,
                            ruby_x,
                            ruby_top,
                            *ruby_draw_width,
                            &self.ruby_font,
                        );
                        include_cell_run(
                            &mut cell_union,
                            base_x,
                            base_top,
                            *base_width,
                            &self.font,
                        );
                        x += *width;
                    }
                }
            }
        }

        draw_rect = draw_rect
            .inflate(2)
            .clamp_to_image(self.dib.width, self.dib.height)
            .unwrap_or(draw_rect);
        self.last_rect = Some(draw_rect);
        Ok((draw_rect, cell_union))
    }

    /// ルビを目標幅へ広げて描く。1文字、または広げ不要なら通常描画。
    fn draw_ruby_expanded(
        &self,
        measurer: &mut TextMeasurer,
        x: i32,
        y: i32,
        ruby: &str,
        natural_width: i32,
        draw_width: i32,
    ) -> Result<(), String> {
        let chars: Vec<char> = ruby.chars().collect();
        if chars.len() <= 1 || draw_width <= natural_width || natural_width <= 0 {
            return self.draw_text(&self.ruby_font, x, y, ruby);
        }

        let extra = draw_width - natural_width;
        let gaps = (chars.len() - 1) as i32;
        let mut cursor = x;
        for (index, ch) in chars.iter().enumerate() {
            let piece = ch.to_string();
            self.draw_text(&self.ruby_font, cursor, y, &piece)?;
            let piece_width = measurer.measure_width(&piece)?;
            cursor += piece_width;
            if index + 1 < chars.len() {
                // 余りは先頭ギャップから配る。
                let pad = extra / gaps + if index < (extra % gaps) as usize { 1 } else { 0 };
                cursor += pad;
            }
        }
        Ok(())
    }

    pub(super) fn draw_text(&self, font: &GdiFont, x: i32, y: i32, text: &str) -> Result<(), String> {
        if text.is_empty() {
            return Ok(());
        }

        let wide = to_wide(text);
        unsafe {
            SelectObject(self.dib.hdc, font.handle as Hgdiobj);
            if TextOutW(self.dib.hdc, x, y, wide.as_ptr(), wide.len() as i32 - 1) == 0 {
                return Err("GDI TextOutW failed".to_string());
            }
        }
        Ok(())
    }

    pub(super) fn bytes(&self) -> &[u8] {
        self.dib.bytes()
    }
}

pub(super) fn text_bounds(
    widths: &[i32],
    x_center: i32,
    first_base_top: i32,
    base_cell_height: i32,
    ruby_above_extra: u32,
    ruby_below_extra: u32,
    body_line_height: u32,
    line_count: usize,
    image_width: u32,
    image_height: u32,
) -> Option<Rect> {
    if widths.is_empty() {
        return None;
    }

    let max_width = widths.iter().copied().max().unwrap_or_default().max(1);
    let line_count = line_count.max(1);
    let left = x_center - max_width / 2 - 4;
    // 先頭行の上ルビ帯（中間行の上ルビは行間に含まれる）。
    let top = first_base_top - ruby_above_extra as i32 - 4;
    let last_base_top = base_top_for_line(
        first_base_top,
        line_count - 1,
        body_line_height,
        ruby_above_extra,
        line_count,
    );
    // 最終行が下ルビのときだけ下帯を見込む。
    let below_pad = if line_uses_ruby_below(line_count - 1, line_count) {
        ruby_below_extra as i32
    } else {
        0
    };
    let bottom = last_base_top + base_cell_height.max(1) + below_pad + 4;

    Rect {
        x: left,
        y: top,
        width: max_width + 8,
        height: bottom - top,
    }
    .clamp_to_image(image_width, image_height)
}

pub(super) fn include_cell_run(
    bounds: &mut Option<Rect>,
    x: i32,
    cell_top: i32,
    width: i32,
    font: &GdiFont,
) {
    if width <= 0 {
        return;
    }
    // TextOutW(TA_TOP) の y がセル上端。走査用セルはそこから height 分。
    let run = Rect {
        x,
        y: cell_top,
        width,
        height: font.height.max(font.size as i32).max(1),
    };
    *bounds = Some(match *bounds {
        Some(existing) => existing.union(run),
        None => run,
    });
}
