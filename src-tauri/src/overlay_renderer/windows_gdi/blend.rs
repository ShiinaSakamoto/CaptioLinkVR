use super::geometry::Rect;

pub(super) fn draw_rounded_rect(
    pixels: &mut [u8],
    width: u32,
    height: u32,
    rect: Rect,
    radius: i32,
    color: [u8; 3],
    alpha: u8,
) {
    if rect.width <= 0 || rect.height <= 0 || alpha == 0 {
        return;
    }

    let left = rect.x.max(0);
    let top = rect.y.max(0);
    let right = (rect.x + rect.width).min(width as i32);
    let bottom = (rect.y + rect.height).min(height as i32);
    if right <= left || bottom <= top {
        return;
    }
    let radius = radius.min(rect.width / 2).min(rect.height / 2).max(0);

    // 角丸なしは行単位で塗る（長い字幕の背景コストを抑える）。
    if radius == 0 {
        for y in top..bottom {
            for x in left..right {
                let index = (y as usize * width as usize + x as usize) * 4;
                write_or_blend_pixel(&mut pixels[index..index + 4], color, alpha);
            }
        }
        return;
    }

    // 中央の矩形は判定なし、四隅だけ角丸判定。
    let inner_left = (rect.x + radius).max(left);
    let inner_right = (rect.x + rect.width - radius).min(right);
    let inner_top = (rect.y + radius).max(top);
    let inner_bottom = (rect.y + rect.height - radius).min(bottom);

    if inner_right > inner_left && inner_bottom > inner_top {
        for y in inner_top..inner_bottom {
            for x in inner_left..inner_right {
                let index = (y as usize * width as usize + x as usize) * 4;
                write_or_blend_pixel(&mut pixels[index..index + 4], color, alpha);
            }
        }
    }

    for y in top..bottom {
        for x in left..right {
            let in_inner = x >= inner_left && x < inner_right && y >= inner_top && y < inner_bottom;
            if in_inner {
                continue;
            }
            if !inside_rounded_rect(x, y, &rect, radius) {
                continue;
            }
            let index = (y as usize * width as usize + x as usize) * 4;
            write_or_blend_pixel(&mut pixels[index..index + 4], color, alpha);
        }
    }
}

pub(super) fn inside_rounded_rect(x: i32, y: i32, rect: &Rect, radius: i32) -> bool {
    if radius == 0 {
        return true;
    }

    let right = rect.x + rect.width - 1;
    let bottom = rect.y + rect.height - 1;
    let cx = if x < rect.x + radius {
        rect.x + radius
    } else if x > right - radius {
        right - radius
    } else {
        x
    };
    let cy = if y < rect.y + radius {
        rect.y + radius
    } else if y > bottom - radius {
        bottom - radius
    } else {
        y
    };
    let dx = x - cx;
    let dy = y - cy;
    dx * dx + dy * dy <= radius * radius
}

pub(super) fn composite_mask_shifted(
    pixels: &mut [u8],
    mask: &[u8],
    image_width: u32,
    image_height: u32,
    source_rect: Rect,
    offset_x: i32,
    offset_y: i32,
    color: [u8; 3],
    layer_alpha: u8,
) {
    if layer_alpha == 0 {
        return;
    }

    let stride = image_width as usize * 4;
    for source_y in source_rect.y..source_rect.bottom() {
        let dest_y = source_y + offset_y;
        if dest_y < 0 || dest_y >= image_height as i32 {
            continue;
        }

        let source_row_start = source_y as usize * stride;
        let dest_row_start = dest_y as usize * stride;
        for source_x in source_rect.x..source_rect.right() {
            let dest_x = source_x + offset_x;
            if dest_x < 0 || dest_x >= image_width as i32 {
                continue;
            }

            let source_index = source_row_start + source_x as usize * 4;
            let bgra = &mask[source_index..source_index + 4];
            let coverage = bgra[0].max(bgra[1]).max(bgra[2]);
            if coverage == 0 {
                continue;
            }

            let alpha = ((coverage as u16 * layer_alpha as u16) / 255) as u8;
            let dest_index = dest_row_start + dest_x as usize * 4;
            blend_pixel(&mut pixels[dest_index..dest_index + 4], color, alpha);
        }
    }
}

pub(super) fn blend_pixel(dst: &mut [u8], color: [u8; 3], alpha: u8) {
    if alpha == 0 {
        return;
    }

    let src_alpha = alpha as u32;
    let dst_alpha = dst[3] as u32;
    let out_alpha = src_alpha + (dst_alpha * (255 - src_alpha) + 127) / 255;
    if out_alpha == 0 {
        return;
    }

    for channel in 0..3 {
        let src = color[channel] as u32;
        let dst_premul = dst[channel] as u32 * dst_alpha;
        let out_premul = src * src_alpha + (dst_premul * (255 - src_alpha) + 127) / 255;
        dst[channel] = ((out_premul + out_alpha / 2) / out_alpha).min(255) as u8;
    }
    dst[3] = out_alpha.min(255) as u8;
}

/// 透明バッファへの初回塗りはブレンド不要（背景の主経路）。
pub(super) fn write_or_blend_pixel(dst: &mut [u8], color: [u8; 3], alpha: u8) {
    if alpha == 0 {
        return;
    }
    if dst[3] == 0 {
        dst[0] = color[0];
        dst[1] = color[1];
        dst[2] = color[2];
        dst[3] = alpha;
        return;
    }
    blend_pixel(dst, color, alpha);
}
