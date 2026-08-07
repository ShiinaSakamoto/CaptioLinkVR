use super::blend::{draw_rounded_rect, write_or_blend_pixel};
use super::color::{effective_background_opacity, parse_hex_rgb};
use super::edt::euclidean_edt_with_coverage;
use super::geometry::Rect;
use super::scale::scale_u32;
use super::super::settings::RenderSettings;

pub(super) fn draw_text_background(
    pixels: &mut [u8],
    width: u32,
    height: u32,
    ink_bounds: Rect,
    settings: &RenderSettings,
    scale: f32,
) {
    let Some(color) = parse_hex_rgb(&settings.background_color) else {
        return;
    };
    let padding = scale_u32(settings.background_padding, scale) as i32;
    let box_rect = Rect {
        x: ink_bounds.x - padding,
        y: ink_bounds.y - padding,
        width: ink_bounds.width + padding * 2,
        height: ink_bounds.height + padding * 2,
    };
    // padding=0 のときは角丸にせず文字輪郭に密着させる。
    let radius = if padding <= 0 {
        0
    } else {
        (padding / 2).clamp(2, 8)
    };
    let alpha = (effective_background_opacity(settings) * 255.0).round() as u8;

    draw_rounded_rect(pixels, width, height, box_rect, radius, color, alpha);
}

/// 文字セル近傍だけを走査し、実インクの外接矩形を返す。
pub(super) fn mask_ink_bounds(mask: &[u8], width: u32, height: u32, search: Rect) -> Option<Rect> {
    let left = search.x.max(0);
    let top = search.y.max(0);
    let right = search.right().min(width as i32);
    let bottom = search.bottom().min(height as i32);
    if right <= left || bottom <= top {
        return None;
    }

    let stride = width as usize * 4;
    let mut min_x = right;
    let mut min_y = bottom;
    let mut max_x = left;
    let mut max_y = top;
    let mut found = false;

    for y in top..bottom {
        let row = y as usize * stride;
        for x in left..right {
            let index = row + x as usize * 4;
            let coverage = mask[index].max(mask[index + 1]).max(mask[index + 2]);
            if coverage == 0 {
                continue;
            }
            found = true;
            min_x = min_x.min(x);
            min_y = min_y.min(y);
            max_x = max_x.max(x);
            max_y = max_y.max(y);
        }
    }

    if !found {
        return None;
    }

    Some(Rect {
        x: min_x,
        y: min_y,
        width: max_x - min_x + 1,
        height: max_y - min_y + 1,
    })
}

/// 円盤膨張と同等の袋文字を、ユークリッド距離変換で O(画素数) で作る。
///
/// 袋文字は不透明な縁であるべきなので、マスクの AA カバレッジをアルファに使わない。
/// （小さいフォント／低い画質では AA 縁の比率が大きく、半透明の「スタンプ重ね」に見えるため）
pub(super) fn apply_dilated_outline(
    pixels: &mut [u8],
    mask: &[u8],
    image_width: u32,
    image_height: u32,
    ink_bounds: Rect,
    radius: i32,
    color: [u8; 3],
    outline_alpha: u8,
) {
    if radius <= 0 || outline_alpha == 0 {
        return;
    }

    let Some(out_rect) = ink_bounds
        .inflate(radius)
        .clamp_to_image(image_width, image_height)
    else {
        return;
    };

    let out_w = out_rect.width as usize;
    let out_h = out_rect.height as usize;
    if out_w == 0 || out_h == 0 {
        return;
    }

    let stride = image_width as usize * 4;
    let radius_sq = (radius as i64) * (radius as i64);

    // 膨張用マスクは二値化する（AA の薄い縁をサイトにしない）。
    let mut src = vec![0u8; out_w * out_h];
    let src_left = ink_bounds.x.max(out_rect.x);
    let src_top = ink_bounds.y.max(out_rect.y);
    let src_right = ink_bounds.right().min(out_rect.right());
    let src_bottom = ink_bounds.bottom().min(out_rect.bottom());

    for y in src_top..src_bottom {
        let row = y as usize * stride;
        let local_row = (y - out_rect.y) as usize * out_w;
        for x in src_left..src_right {
            let index = row + x as usize * 4;
            let cov = mask[index].max(mask[index + 1]).max(mask[index + 2]);
            // 十分濃いインクだけを本体とみなす。
            if cov < 128 {
                continue;
            }
            src[local_row + (x - out_rect.x) as usize] = 255;
        }
    }

    let (dist_sq, coverage) = euclidean_edt_with_coverage(&src, out_w, out_h);

    for y in 0..out_h {
        let dest_y = out_rect.y + y as i32;
        let dest_row = dest_y as usize * stride;
        let local_row = y * out_w;
        for x in 0..out_w {
            if coverage[local_row + x] == 0 || dist_sq[local_row + x] > radius_sq {
                continue;
            }
            let dest_x = out_rect.x + x as i32;
            let dest_index = dest_row + dest_x as usize * 4;
            write_or_blend_pixel(
                &mut pixels[dest_index..dest_index + 4],
                color,
                outline_alpha,
            );
        }
    }
}
