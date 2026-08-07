#[derive(Debug, PartialEq, Eq)]
pub(crate) struct ParsedLine {
    pub(crate) segments: Vec<ParsedSegment>,
    pub(crate) has_ruby: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum ParsedSegment {
    Plain(String),
    Ruby { base: String, ruby: String },
}

// 明示的な改行だけで行を分け、{親文字|ルビ}を描画用セグメントへ変換する。
pub(crate) fn parse_text_lines(text: &str, ruby_enabled: bool) -> Vec<ParsedLine> {
    if text.is_empty() {
        return Vec::new();
    }

    text.split('\n')
        .map(|line| parse_ruby_segments(line, ruby_enabled))
        .collect()
}

fn parse_ruby_segments(line: &str, ruby_enabled: bool) -> ParsedLine {
    let mut segments = Vec::new();
    let mut cursor = 0;
    let mut has_ruby = false;

    while cursor < line.len() {
        let Some(open_offset) = line[cursor..].find('{') else {
            push_plain_segment(&mut segments, &line[cursor..]);
            break;
        };
        let open_index = cursor + open_offset;
        push_plain_segment(&mut segments, &line[cursor..open_index]);

        let content_start = open_index + 1;
        let Some(close_offset) = line[content_start..].find('}') else {
            push_plain_segment(&mut segments, &line[open_index..]);
            break;
        };
        let close_index = content_start + close_offset;
        let body = &line[content_start..close_index];

        if let Some((base, ruby)) = body.split_once('|') {
            if !base.is_empty() && !ruby.is_empty() {
                if ruby_enabled {
                    segments.push(ParsedSegment::Ruby {
                        base: base.to_string(),
                        ruby: ruby.to_string(),
                    });
                    has_ruby = true;
                } else {
                    push_plain_segment(&mut segments, base);
                }
                cursor = close_index + 1;
                continue;
            }
        }

        push_plain_segment(&mut segments, &line[open_index..=close_index]);
        cursor = close_index + 1;
    }

    ParsedLine { segments, has_ruby }
}

fn push_plain_segment(segments: &mut Vec<ParsedSegment>, text: &str) {
    if text.is_empty() {
        return;
    }

    match segments.last_mut() {
        Some(ParsedSegment::Plain(previous)) => previous.push_str(text),
        _ => segments.push(ParsedSegment::Plain(text.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_text_lines, ParsedLine, ParsedSegment};

    #[test]
    fn parses_ruby_segments_when_enabled() {
        assert_eq!(
            parse_text_lines("二人 {物の怪|もののけ}になるまで", true),
            vec![ParsedLine {
                has_ruby: true,
                segments: vec![
                    ParsedSegment::Plain("二人 ".to_string()),
                    ParsedSegment::Ruby {
                        base: "物の怪".to_string(),
                        ruby: "もののけ".to_string(),
                    },
                    ParsedSegment::Plain("になるまで".to_string()),
                ],
            }]
        );
    }

    #[test]
    fn keeps_only_base_text_when_ruby_is_disabled() {
        assert_eq!(
            parse_text_lines("一万人飲み込み{黄泉|よみ}の国", false),
            vec![ParsedLine {
                has_ruby: false,
                segments: vec![ParsedSegment::Plain("一万人飲み込み黄泉の国".to_string())],
            }]
        );
    }

    #[test]
    fn keeps_malformed_tokens_as_plain_text() {
        assert_eq!(
            parse_text_lines("{黄泉|}の国", true),
            vec![ParsedLine {
                has_ruby: false,
                segments: vec![ParsedSegment::Plain("{黄泉|}の国".to_string())],
            }]
        );
    }
}
