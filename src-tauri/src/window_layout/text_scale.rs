//! Windows アクセシビリティの「テキストサイズ」倍率。
//!
//! 表示スケール（DPI）とは別物。WebView2 は中身だけこの倍率で拡大するため、
//! ウィンドウ枠を同じ倍率で広げないと CSS 上の利用領域が狭くなる。
//!
//! 値の所在: `HKCU\Software\Microsoft\Accessibility\TextScaleFactor`（DWORD、百分率）。
//! キーが無い／読めない場合は 100%（倍率 1.0）扱い。

/// Windows のテキストサイズ上限（設定 UI は概ね 225%）。
const MAX_TEXT_SCALE_PERCENT: u32 = 225;
const MIN_TEXT_SCALE_PERCENT: u32 = 100;

/// 現在のテキスト倍率（1.0 = 100%）。非 Windows は常に 1.0。
pub fn current_factor() -> f64 {
    #[cfg(target_os = "windows")]
    {
        normalize_percent(read_text_scale_percent().unwrap_or(MIN_TEXT_SCALE_PERCENT))
    }

    #[cfg(not(target_os = "windows"))]
    {
        1.0
    }
}

/// 百分率（100〜225）を倍率へ正規化する。
pub fn normalize_percent(percent: u32) -> f64 {
    let clamped = percent.clamp(MIN_TEXT_SCALE_PERCENT, MAX_TEXT_SCALE_PERCENT);
    f64::from(clamped) / 100.0
}

#[cfg(target_os = "windows")]
fn read_text_scale_percent() -> Option<u32> {
    use windows::core::w;
    use windows::Win32::Foundation::ERROR_SUCCESS;
    use windows::Win32::System::Registry::{
        RegGetValueW, HKEY_CURRENT_USER, REG_VALUE_TYPE, RRF_RT_REG_DWORD,
    };

    let mut data = 0u32;
    let mut data_size = std::mem::size_of::<u32>() as u32;
    let mut data_type = REG_VALUE_TYPE::default();

    // SAFETY: 出力バッファは DWORD 用に正しくサイズ指定している。
    let status = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            w!("Software\\Microsoft\\Accessibility"),
            w!("TextScaleFactor"),
            RRF_RT_REG_DWORD,
            Some(&mut data_type),
            Some((&raw mut data).cast()),
            Some(&mut data_size),
        )
    };

    if status != ERROR_SUCCESS {
        return None;
    }
    Some(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_percent_maps_common_values() {
        assert!((normalize_percent(100) - 1.0).abs() < f64::EPSILON);
        assert!((normalize_percent(159) - 1.59).abs() < f64::EPSILON);
        assert!((normalize_percent(225) - 2.25).abs() < f64::EPSILON);
    }

    #[test]
    fn normalize_percent_clamps_out_of_range() {
        assert!((normalize_percent(50) - 1.0).abs() < f64::EPSILON);
        assert!((normalize_percent(300) - 2.25).abs() < f64::EPSILON);
    }
}
