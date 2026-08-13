use super::super::ruby::{ParsedLine, ParsedSegment};
use super::gdi::TextMeasurer;
use super::text_line::{expanded_ruby_draw_width, TextLine, TextSegment};

/// 折り返し幅の下限/上限（設定スライダーと一致）。
pub(super) const WRAP_WIDTH_PERCENT_MIN: u32 = 30;
pub(super) const WRAP_WIDTH_PERCENT_MAX: u32 = 100;

/// レイアウト用の折返し単位。ルビは分割しない。
#[derive(Debug, Clone)]
enum WrapUnit {
    Char {
        ch: char,
        width: i32,
    },
    Ruby {
        base: String,
        ruby: String,
        base_width: i32,
        ruby_width: i32,
        ruby_draw_width: i32,
        width: i32,
    },
}

impl WrapUnit {
    fn width(&self) -> i32 {
        match self {
            Self::Char { width, .. } | Self::Ruby { width, .. } => *width,
        }
    }
}

/// 最大テクスチャ由来の本文幅に、ユーザーの折り返し幅%を掛けた実折返し幅。
/// フォント縮小はせず、長い行はここで折り返してテクスチャ/オーバーレイ幅の膨張を抑える。
pub(super) fn content_wrap_width(
    hard_limit_px: u32,
    wrap_width_percent: u32,
    font_size: u32,
) -> i32 {
    let percent =
        wrap_width_percent.clamp(WRAP_WIDTH_PERCENT_MIN, WRAP_WIDTH_PERCENT_MAX) as f32 / 100.0;
    let soft_limit = ((hard_limit_px as f32) * percent).round() as u32;
    soft_limit
        .max(font_size.max(1))
        .min(hard_limit_px.max(1))
        .max(1) as i32
}

/// 明示改行後の1行を、wrap_width を超えないよう必要なら複数行へ分割する。
/// ルビセグメントは分割せず、平文は禁則を踏まえた位置で折り返す。
pub(super) fn wrap_parsed_line(
    line: &ParsedLine,
    wrap_width: i32,
    measurer: &mut TextMeasurer,
    ruby_measurer: &mut TextMeasurer,
) -> Result<Vec<TextLine>, String> {
    let wrap_width = wrap_width.max(1);
    let units = collect_wrap_units(line, measurer, ruby_measurer)?;
    let lines_of_units = wrap_units(&units, wrap_width);
    let mut lines = lines_of_units
        .into_iter()
        .map(units_to_text_line)
        .collect::<Vec<_>>();

    // 空行（ASS の連続改行など）は行高さを残す。
    if lines.is_empty() {
        lines.push(TextLine {
            segments: Vec::new(),
            width: 0,
        });
    }

    Ok(lines)
}

fn collect_wrap_units(
    line: &ParsedLine,
    measurer: &mut TextMeasurer,
    ruby_measurer: &mut TextMeasurer,
) -> Result<Vec<WrapUnit>, String> {
    let mut units = Vec::new();
    for segment in &line.segments {
        match segment {
            ParsedSegment::Plain(text) => {
                for ch in text.chars() {
                    let piece = ch.to_string();
                    let width = measurer.measure_width(&piece)?;
                    units.push(WrapUnit::Char { ch, width });
                }
            }
            ParsedSegment::Ruby { base, ruby } => {
                let base_width = measurer.measure_width(base)?;
                let ruby_width = ruby_measurer.measure_width(ruby)?;
                let ruby_draw_width = expanded_ruby_draw_width(ruby_width, base_width);
                let width = base_width.max(ruby_draw_width);
                units.push(WrapUnit::Ruby {
                    base: base.clone(),
                    ruby: ruby.clone(),
                    base_width,
                    ruby_width,
                    ruby_draw_width,
                    width,
                });
            }
        }
    }
    Ok(units)
}

/// 測定済み単位列を wrap_width で折り返す（テストしやすい純関数側）。
fn wrap_units(units: &[WrapUnit], wrap_width: i32) -> Vec<Vec<WrapUnit>> {
    if units.is_empty() {
        return Vec::new();
    }

    let wrap_width = wrap_width.max(1);
    let mut lines = Vec::new();
    let mut index = 0;

    while index < units.len() {
        let mut width = 0_i32;
        let mut end = index;

        while end < units.len() {
            let next_width = units[end].width();
            if width > 0 && width + next_width > wrap_width {
                break;
            }
            width += next_width;
            end += 1;
        }

        if end == units.len() {
            lines.push(units[index..].to_vec());
            break;
        }

        let break_at = find_break_index(units, index, end);
        if break_at <= index {
            let force_end = (index + 1).max(end.min(units.len()));
            lines.push(units[index..force_end].to_vec());
            index = force_end;
            continue;
        }

        lines.push(units[index..break_at].to_vec());
        index = break_at;
    }

    lines
}

fn find_break_index(units: &[WrapUnit], line_start: usize, overflow_at: usize) -> usize {
    if overflow_at <= line_start || overflow_at > units.len() {
        return overflow_at.max(line_start);
    }

    for split in (line_start + 1..=overflow_at).rev() {
        if !is_valid_split(units, split) {
            continue;
        }
        let preferred = can_break_after(&units[split - 1]) || prefers_break_before(&units[split]);
        if preferred {
            return split;
        }
    }

    let mut split = overflow_at;
    while split < units.len() && split > line_start && forbids_line_start(&units[split]) {
        split += 1;
    }
    if split > line_start && split <= units.len() && is_valid_split(units, split) {
        return split;
    }

    overflow_at
}

fn is_valid_split(units: &[WrapUnit], split: usize) -> bool {
    if split == 0 || split > units.len() {
        return false;
    }
    if split < units.len() && forbids_line_start(&units[split]) {
        return false;
    }
    if split > 0 && forbids_line_end(&units[split - 1]) {
        return false;
    }
    true
}

fn can_break_after(unit: &WrapUnit) -> bool {
    match unit {
        // 句読点・空白などだけを「好ましい切れ目」にする。
        // ルビ境界は分割不可の固まりだが、直後を優先改行候補にはしない
        // （「調節してください」の途中で切れて句読点より優先されるのを防ぐ）。
        WrapUnit::Char { ch, .. } => is_break_after_char(*ch),
        WrapUnit::Ruby { .. } => false,
    }
}

fn prefers_break_before(unit: &WrapUnit) -> bool {
    match unit {
        WrapUnit::Char { ch, .. } => is_break_before_char(*ch),
        WrapUnit::Ruby { .. } => false,
    }
}

fn forbids_line_start(unit: &WrapUnit) -> bool {
    match unit {
        WrapUnit::Char { ch, .. } => is_line_start_forbidden(*ch),
        WrapUnit::Ruby { .. } => false,
    }
}

fn forbids_line_end(unit: &WrapUnit) -> bool {
    match unit {
        WrapUnit::Char { ch, .. } => is_line_end_forbidden(*ch),
        WrapUnit::Ruby { .. } => false,
    }
}

pub(super) fn is_break_after_char(ch: char) -> bool {
    matches!(
        ch,
        ' ' | '\t'
            | '　'
            | '、'
            | '。'
            | '，'
            | '．'
            | ','
            | '.'
            | '！'
            | '？'
            | '!'
            | '?'
            | '・'
            | '…'
            | '‥'
            | '：'
            | ':'
            | '；'
            | ';'
            | '」'
            | '』'
            | '）'
            | ')'
            | '】'
            | '］'
            | ']'
            | '〉'
            | '》'
            | '”'
            | '\''
            | '’'
            | 'ー'
            | '～'
            | '〜'
    )
}

pub(super) fn is_break_before_char(ch: char) -> bool {
    matches!(
        ch,
        '「' | '『' | '（' | '(' | '【' | '［' | '[' | '〈' | '《' | '“' | '"'
    )
}

pub(super) fn is_line_start_forbidden(ch: char) -> bool {
    matches!(
        ch,
        '、' | '。'
            | '，'
            | '．'
            | ','
            | '.'
            | '！'
            | '？'
            | '!'
            | '?'
            | '」'
            | '』'
            | '）'
            | ')'
            | '】'
            | '］'
            | ']'
            | '〉'
            | '》'
            | '”'
            | '\''
            | '’'
            | 'ー'
            | 'ぁ'
            | 'ぃ'
            | 'ぅ'
            | 'ぇ'
            | 'ぉ'
            | 'っ'
            | 'ゃ'
            | 'ゅ'
            | 'ょ'
            | 'ァ'
            | 'ィ'
            | 'ゥ'
            | 'ェ'
            | 'ォ'
            | 'ッ'
            | 'ャ'
            | 'ュ'
            | 'ョ'
    )
}

pub(super) fn is_line_end_forbidden(ch: char) -> bool {
    is_break_before_char(ch)
}

fn units_to_text_line(units: Vec<WrapUnit>) -> TextLine {
    let mut segments = Vec::new();
    let mut width = 0_i32;

    for unit in units {
        match unit {
            WrapUnit::Char {
                ch,
                width: piece_width,
            } => {
                match segments.last_mut() {
                    Some(TextSegment::Plain {
                        text: plain,
                        width: plain_width,
                    }) => {
                        plain.push(ch);
                        *plain_width += piece_width;
                    }
                    _ => {
                        segments.push(TextSegment::Plain {
                            text: ch.to_string(),
                            width: piece_width,
                        });
                    }
                }
                width += piece_width;
            }
            WrapUnit::Ruby {
                base,
                ruby,
                base_width,
                ruby_width,
                ruby_draw_width,
                width: unit_width,
            } => {
                segments.push(TextSegment::Ruby {
                    base,
                    ruby,
                    base_width,
                    ruby_width,
                    ruby_draw_width,
                    width: unit_width,
                });
                width += unit_width;
            }
        }
    }

    TextLine { segments, width }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chars(text: &str, width_each: i32) -> Vec<WrapUnit> {
        text.chars()
            .map(|ch| WrapUnit::Char {
                ch,
                width: width_each,
            })
            .collect()
    }

    fn line_text(line: &[WrapUnit]) -> String {
        line.iter()
            .map(|u| match u {
                WrapUnit::Char { ch, .. } => *ch,
                _ => '?',
            })
            .collect()
    }

    #[test]
    fn content_wrap_width_scales_with_percent_under_hard_limit() {
        let wrap = content_wrap_width(1984, 50, 10);
        assert_eq!(wrap, ((1984.0_f32 * 0.5).round() as i32).max(10));
    }

    #[test]
    fn content_wrap_width_at_100_matches_hard_limit() {
        assert_eq!(content_wrap_width(984, 100, 20), 984);
    }

    #[test]
    fn prefers_break_after_japanese_punctuation() {
        let units = chars("あいうえ、かき", 10);
        let lines = wrap_units(&units, 45);
        assert_eq!(lines.len(), 2);
        assert_eq!(line_text(&lines[0]), "あいうえ、");
    }

    #[test]
    fn prefers_punctuation_over_ruby_boundary() {
        // 「…ように、折り返し幅を{調節}してください。」相当。
        // 溢れる直前がルビ直後でも、より手前の「、」で切る。
        let mut units = chars("長文でも読みやすい幅に収まるように、折り返し幅を", 10);
        units.push(WrapUnit::Ruby {
            base: "調節".into(),
            ruby: "ちょうせつ".into(),
            base_width: 20,
            ruby_width: 40,
            ruby_draw_width: 40,
            width: 40,
        });
        units.extend(chars("してください。", 10));

        // 「…を調節」までは収まり、「して…」で溢れる幅。
        let lines = wrap_units(&units, 280);
        assert!(lines.len() >= 2);
        assert_eq!(line_text(&lines[0]), "長文でも読みやすい幅に収まるように、");
        assert!(
            !line_text(&lines[0]).ends_with('を'),
            "ルビ直前で切らず、読点後を優先すること"
        );
    }

    #[test]
    fn prefers_break_before_opening_bracket() {
        let units = chars("表示（テスト）", 10);
        let lines = wrap_units(&units, 40);
        assert!(lines.len() >= 2);
        assert_eq!(line_text(&lines[0]), "表示");
    }

    #[test]
    fn avoids_line_start_with_closing_punctuation_when_possible() {
        let units = chars("あい。うえ", 10);
        let lines = wrap_units(&units, 25);
        assert!(!lines.iter().any(|line| line_text(line).starts_with('。')));
    }

    #[test]
    fn break_helpers_cover_common_marks() {
        assert!(is_break_after_char('、'));
        assert!(is_break_after_char('。'));
        assert!(is_break_after_char(' '));
        assert!(is_break_before_char('「'));
        assert!(is_line_start_forbidden('。'));
        assert!(is_line_end_forbidden('「'));
        assert!(!is_break_after_char('あ'));
    }
}
