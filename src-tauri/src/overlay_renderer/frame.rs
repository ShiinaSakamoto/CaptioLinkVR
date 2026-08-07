// OpenVRへ渡すRGBAフレーム。pixelsは幅 * 高さ * 4のRGBA順。
#[derive(Debug, Clone)]
pub struct OverlayFrame {
    pub pixels: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

impl OverlayFrame {
    pub fn transparent_1px() -> Self {
        Self {
            pixels: vec![0, 0, 0, 0],
            width: 1,
            height: 1,
        }
    }
}
