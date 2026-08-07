pub(super) type Hdc = isize;
pub(super) type Hbitmap = isize;
pub(super) type Hfont = isize;
pub(super) type Hgdiobj = isize;

pub(super) const BI_RGB: u32 = 0;
pub(super) const DIB_RGB_COLORS: u32 = 0;
pub(super) const TRANSPARENT: i32 = 1;
pub(super) const TA_LEFT: u32 = 0;
pub(super) const TA_TOP: u32 = 0;
pub(super) const FW_NORMAL: i32 = 400;
pub(super) const DEFAULT_CHARSET: u32 = 1;
pub(super) const OUT_DEFAULT_PRECIS: u32 = 0;
pub(super) const CLIP_DEFAULT_PRECIS: u32 = 0;
pub(super) const ANTIALIASED_QUALITY: u32 = 4;
pub(super) const DEFAULT_PITCH: u32 = 0;
pub(super) const FF_DONTCARE: u32 = 0;
pub(super) const FR_PRIVATE: u32 = 0x10;
