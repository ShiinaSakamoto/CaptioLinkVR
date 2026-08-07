use std::collections::HashMap;
use std::ffi::c_void;
use std::path::PathBuf;
use std::ptr::null_mut;
use std::sync::{Mutex, OnceLock};

use super::super::font_path::{self, SUBTITLE_FONT_FACE};
use super::ffi::*;
use super::geometry::Rect;
use super::types::*;

pub(super) struct TextMeasurer {
    pub(super) dib: DibSection,
    pub(super) font: GdiFont,
}

impl TextMeasurer {
    pub(super) fn new(font_size: u32) -> Result<Self, String> {
        let dib = DibSection::new(8, 8)?;
        let font = GdiFont::new(font_size)?;
        unsafe {
            SelectObject(dib.hdc, font.handle as Hgdiobj);
        }
        Ok(Self { dib, font })
    }

    pub(super) fn measure_width(&mut self, text: &str) -> Result<i32, String> {
        let _ = self.font.handle;
        measure_width(self.dib.hdc, text)
    }
}

pub(super) struct DibSection {
    pub(super) hdc: Hdc,
    pub(super) bitmap: Hbitmap,
    pub(super) old_bitmap: Hgdiobj,
    pub(super) bits: *mut u8,
    pub(super) len: usize,
    pub(super) width: u32,
    pub(super) height: u32,
}

impl DibSection {
    pub(super) fn new(width: u32, height: u32) -> Result<Self, String> {
        let screen = unsafe { GetDC(0) };
        if screen == 0 {
            return Err("GDI GetDC failed".to_string());
        }

        let hdc = unsafe { CreateCompatibleDC(screen) };
        unsafe {
            ReleaseDC(0, screen);
        }
        if hdc == 0 {
            return Err("GDI CreateCompatibleDC failed".to_string());
        }

        let mut bits: *mut c_void = null_mut();
        let mut info = BITMAPINFO {
            bmi_header: BITMAPINFOHEADER {
                bi_size: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                bi_width: width as i32,
                bi_height: -(height as i32),
                bi_planes: 1,
                bi_bit_count: 32,
                bi_compression: BI_RGB,
                bi_size_image: width * height * 4,
                bi_x_pels_per_meter: 0,
                bi_y_pels_per_meter: 0,
                bi_clr_used: 0,
                bi_clr_important: 0,
            },
            bmi_colors: [RGBQUAD {
                rgb_blue: 0,
                rgb_green: 0,
                rgb_red: 0,
                rgb_reserved: 0,
            }],
        };

        let bitmap = unsafe { CreateDIBSection(hdc, &mut info, DIB_RGB_COLORS, &mut bits, 0, 0) };
        if bitmap == 0 || bits.is_null() {
            unsafe {
                DeleteDC(hdc);
            }
            return Err("GDI CreateDIBSection failed".to_string());
        }

        let old_bitmap = unsafe { SelectObject(hdc, bitmap as Hgdiobj) };
        let mut section = Self {
            hdc,
            bitmap,
            old_bitmap,
            bits: bits.cast::<u8>(),
            len: width as usize * height as usize * 4,
            width,
            height,
        };
        section.clear();
        Ok(section)
    }

    pub(super) fn clear(&mut self) {
        unsafe {
            std::ptr::write_bytes(self.bits, 0, self.len);
        }
    }

    pub(super) fn clear_rect(&mut self, rect: Rect) {
        let Some(rect) = rect.clamp_to_image(self.width, self.height) else {
            return;
        };
        let stride = self.width as usize * 4;
        let row_len = rect.width as usize * 4;
        for y in rect.y as usize..rect.bottom() as usize {
            unsafe {
                std::ptr::write_bytes(self.bits.add(y * stride + rect.x as usize * 4), 0, row_len);
            }
        }
    }

    pub(super) fn bytes(&self) -> &[u8] {
        unsafe { std::slice::from_raw_parts(self.bits, self.len) }
    }
}

impl Drop for DibSection {
    fn drop(&mut self) {
        unsafe {
            if self.old_bitmap != 0 {
                SelectObject(self.hdc, self.old_bitmap);
            }
            DeleteObject(self.bitmap as Hgdiobj);
            DeleteDC(self.hdc);
        }
    }
}

#[derive(Clone, Copy)]
pub(super) struct GdiFont {
    pub(super) handle: Hfont,
    pub(super) size: u32,
    pub(super) height: i32,
    /// セル上端から実インク上端までの空き（TA_TOP 基準）。
    pub(super) top_bearing: i32,
    /// 実インク下端からセル下端までの空き。
    pub(super) bottom_bearing: i32,
}

impl GdiFont {
    pub(super) fn new(size: u32) -> Result<Self, String> {
        cached_gdi_font(size)
    }

    /// 実インクの高さ（セル内の描画される部分）。
    pub(super) fn ink_height(&self) -> i32 {
        (self.height - self.top_bearing - self.bottom_bearing).max(1)
    }
}

pub(super) fn cached_gdi_font(size: u32) -> Result<GdiFont, String> {
    ensure_bundled_subtitle_font()?;
    static CACHE: OnceLock<Mutex<HashMap<u32, GdiFont>>> = OnceLock::new();
    let cache = CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    let mut map = cache
        .lock()
        .map_err(|_| "font cache lock failed".to_string())?;
    if let Some(font) = map.get(&size) {
        return Ok(*font);
    }

    let face = to_wide(SUBTITLE_FONT_FACE);
    let handle = unsafe {
        CreateFontW(
            -(size as i32),
            0,
            0,
            0,
            FW_NORMAL,
            0,
            0,
            0,
            DEFAULT_CHARSET,
            OUT_DEFAULT_PRECIS,
            CLIP_DEFAULT_PRECIS,
            ANTIALIASED_QUALITY,
            DEFAULT_PITCH | FF_DONTCARE,
            face.as_ptr(),
        )
    };
    if handle == 0 {
        return Err("GDI CreateFontW failed".to_string());
    }

    let metrics = load_font_metrics(handle)?;
    let bearings = measure_font_ink_bearings(handle, metrics.height)?;
    let font = GdiFont {
        handle,
        size,
        height: metrics.height,
        top_bearing: bearings.0,
        bottom_bearing: bearings.1,
    };
    map.insert(size, font);
    Ok(font)
}

pub(super) struct FontMetrics {
    pub(super) height: i32,
}

/// 代表字形の実インクから、セル上下の空きを測る（ルビ間隔を視覚基準にするため）。
pub(super) fn measure_font_ink_bearings(handle: Hfont, cell_height: i32) -> Result<(i32, i32), String> {
    let cell_height = cell_height.max(1);
    let width = (cell_height * 2).max(8) as u32;
    let height = (cell_height + 4).max(8) as u32;
    let mut dib = DibSection::new(width, height)?;
    unsafe {
        SelectObject(dib.hdc, handle as Hgdiobj);
        SetTextAlign(dib.hdc, TA_TOP | TA_LEFT);
        SetBkMode(dib.hdc, TRANSPARENT);
        SetTextColor(dib.hdc, 0x00ff_ffff);
    }

    // ひらがな・漢字の両方を試し、先にインクが出た方を使う。
    for sample in ["あ", "国", "A"] {
        let wide = to_wide(sample);
        dib.clear();
        unsafe {
            if TextOutW(dib.hdc, 2, 0, wide.as_ptr(), wide.len() as i32 - 1) == 0 {
                continue;
            }
        }

        let bytes = dib.bytes();
        let stride = width as usize * 4;
        let mut min_y = height as i32;
        let mut max_y = -1_i32;
        for y in 0..height as i32 {
            let row = y as usize * stride;
            for x in 0..width as usize {
                let i = row + x * 4;
                let coverage = bytes[i].max(bytes[i + 1]).max(bytes[i + 2]);
                if coverage < 24 {
                    continue;
                }
                min_y = min_y.min(y);
                max_y = max_y.max(y);
            }
        }

        if max_y < min_y {
            continue;
        }

        let top_bearing = min_y.max(0);
        let bottom_bearing = (cell_height - 1 - max_y).max(0);
        // おかしすぎる値は捨ててメトリクス無し扱いにする。
        if top_bearing + bottom_bearing >= cell_height {
            continue;
        }
        return Ok((top_bearing, bottom_bearing));
    }

    Ok((0, 0))
}

pub(super) fn load_font_metrics(handle: Hfont) -> Result<FontMetrics, String> {
    let screen = unsafe { GetDC(0) };
    if screen == 0 {
        return Err("GDI GetDC failed".to_string());
    }

    let hdc = unsafe { CreateCompatibleDC(screen) };
    unsafe {
        ReleaseDC(0, screen);
    }
    if hdc == 0 {
        return Err("GDI CreateCompatibleDC failed".to_string());
    }

    unsafe {
        SelectObject(hdc, handle as Hgdiobj);
        let mut metrics = std::mem::zeroed::<TEXTMETRICW>();
        if GetTextMetricsW(hdc, &mut metrics) == 0 {
            DeleteDC(hdc);
            return Err("GDI GetTextMetricsW failed".to_string());
        }
        DeleteDC(hdc);
        Ok(FontMetrics {
            height: metrics.tm_height,
        })
    }
}

pub(super) fn measure_width(hdc: Hdc, text: &str) -> Result<i32, String> {
    let wide = to_wide(text);
    let mut size = SIZE { cx: 0, cy: 0 };
    unsafe {
        if GetTextExtentPoint32W(hdc, wide.as_ptr(), wide.len() as i32 - 1, &mut size) == 0 {
            return Err("GDI GetTextExtentPoint32W failed".to_string());
        }
    }
    Ok(size.cx)
}

pub(super) fn to_wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

/// プロセス内で一度だけ同梱フォントをプライベート登録する。
pub(super) fn ensure_bundled_subtitle_font() -> Result<(), String> {
    static REGISTERED: OnceLock<Result<PathBuf, String>> = OnceLock::new();
    let registered = REGISTERED.get_or_init(|| {
        let path = font_path::resolve_subtitle_font_path()?;
        let wide = to_wide(path.to_string_lossy().as_ref());
        let added = unsafe { AddFontResourceExW(wide.as_ptr(), FR_PRIVATE, null_mut()) };
        if added == 0 {
            return Err(format!(
                "AddFontResourceExW failed for {}",
                path.display()
            ));
        }
        Ok(path)
    });
    match registered {
        Ok(_) => Ok(()),
        Err(message) => Err(message.clone()),
    }
}
