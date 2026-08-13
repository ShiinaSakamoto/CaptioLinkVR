use std::ffi::c_void;

use super::types::{Hbitmap, Hdc, Hfont, Hgdiobj};

#[repr(C)]
pub(super) struct BITMAPINFOHEADER {
    pub(super) bi_size: u32,
    pub(super) bi_width: i32,
    pub(super) bi_height: i32,
    pub(super) bi_planes: u16,
    pub(super) bi_bit_count: u16,
    pub(super) bi_compression: u32,
    pub(super) bi_size_image: u32,
    pub(super) bi_x_pels_per_meter: i32,
    pub(super) bi_y_pels_per_meter: i32,
    pub(super) bi_clr_used: u32,
    pub(super) bi_clr_important: u32,
}

#[repr(C)]
pub(super) struct RGBQUAD {
    pub(super) rgb_blue: u8,
    pub(super) rgb_green: u8,
    pub(super) rgb_red: u8,
    pub(super) rgb_reserved: u8,
}

#[repr(C)]
pub(super) struct BITMAPINFO {
    pub(super) bmi_header: BITMAPINFOHEADER,
    pub(super) bmi_colors: [RGBQUAD; 1],
}

#[repr(C)]
pub(super) struct SIZE {
    pub(super) cx: i32,
    pub(super) cy: i32,
}

#[repr(C)]
pub(super) struct TEXTMETRICW {
    pub(super) tm_height: i32,
    pub(super) tm_ascent: i32,
    pub(super) tm_descent: i32,
    pub(super) tm_internal_leading: i32,
    pub(super) tm_external_leading: i32,
    pub(super) tm_ave_char_width: i32,
    pub(super) tm_max_char_width: i32,
    pub(super) tm_weight: i32,
    pub(super) tm_overhang: i32,
    pub(super) tm_digitized_aspect_x: i32,
    pub(super) tm_digitized_aspect_y: i32,
    pub(super) tm_first_char: u16,
    pub(super) tm_last_char: u16,
    pub(super) tm_default_char: u16,
    pub(super) tm_break_char: u16,
    pub(super) tm_italic: u8,
    pub(super) tm_underlined: u8,
    pub(super) tm_struck_out: u8,
    pub(super) tm_pitch_and_family: u8,
    pub(super) tm_char_set: u8,
    pub(super) tm_reserved: u8,
    pub(super) tm_padding: u16,
}

#[link(name = "gdi32")]
extern "system" {
    pub(super) fn CreateCompatibleDC(hdc: Hdc) -> Hdc;
    pub(super) fn DeleteDC(hdc: Hdc) -> i32;
    pub(super) fn CreateDIBSection(
        hdc: Hdc,
        pbmi: *const BITMAPINFO,
        usage: u32,
        ppv_bits: *mut *mut c_void,
        h_section: isize,
        offset: u32,
    ) -> Hbitmap;
    pub(super) fn SelectObject(hdc: Hdc, h: Hgdiobj) -> Hgdiobj;
    pub(super) fn DeleteObject(ho: Hgdiobj) -> i32;
    pub(super) fn CreateFontW(
        c_height: i32,
        c_width: i32,
        c_escapement: i32,
        c_orientation: i32,
        c_weight: i32,
        b_italic: u32,
        b_underline: u32,
        b_strike_out: u32,
        i_char_set: u32,
        i_out_precision: u32,
        i_clip_precision: u32,
        i_quality: u32,
        i_pitch_and_family: u32,
        psz_face_name: *const u16,
    ) -> Hfont;
    pub(super) fn SetBkMode(hdc: Hdc, mode: i32) -> i32;
    pub(super) fn SetTextAlign(hdc: Hdc, align: u32) -> u32;
    pub(super) fn SetTextColor(hdc: Hdc, color: u32) -> u32;
    pub(super) fn GetTextExtentPoint32W(
        hdc: Hdc,
        lp_string: *const u16,
        c: i32,
        psizl: *mut SIZE,
    ) -> i32;
    pub(super) fn GetTextMetricsW(hdc: Hdc, lptm: *mut TEXTMETRICW) -> i32;
    pub(super) fn TextOutW(hdc: Hdc, x: i32, y: i32, lp_string: *const u16, c: i32) -> i32;
    pub(super) fn AddFontResourceExW(name: *const u16, fl: u32, res: *mut c_void) -> i32;
}

#[link(name = "user32")]
extern "system" {
    pub(super) fn GetDC(hwnd: isize) -> Hdc;
    pub(super) fn ReleaseDC(hwnd: isize, hdc: Hdc) -> i32;
}
