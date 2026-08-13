/// ルビ自然幅を本文幅へ寄せる割合（1.0で完全一致。完全には広げない）。
const RUBY_WIDTH_BLEND_TOWARD_BASE: f32 = 0.75;

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expanded_ruby_draw_width_blends_toward_base() {
        assert_eq!(
            expanded_ruby_draw_width(40, 100),
            40 + ((60.0_f32 * 0.75).round() as i32)
        );
        assert_eq!(expanded_ruby_draw_width(100, 80), 100);
        assert_eq!(expanded_ruby_draw_width(0, 80), 0);
    }
}
