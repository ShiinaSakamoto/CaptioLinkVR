use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

const MAX_CACHED_OVERLAY_FRAMES: usize = 96;

// Rust側に保持するRGBAフレーム。JSから大きな配列を毎回送らないために使う。
#[derive(Clone)]
pub struct CachedOverlayFrame {
    pub frame: Arc<[u8]>,
    pub width: u32,
    pub height: u32,
}

// 登録済みIDからフレームを取り出せるようにし、古いものから捨てる簡易LRU風キャッシュ。
#[derive(Default)]
pub struct OverlayFrameCache {
    frames: HashMap<String, CachedOverlayFrame>,
    order: VecDeque<String>,
}

impl OverlayFrameCache {
    pub fn insert(&mut self, id: String, frame: Vec<u8>, width: u32, height: u32) {
        if !self.frames.contains_key(&id) {
            self.order.push_back(id.clone());
        }
        self.frames.insert(
            id,
            CachedOverlayFrame {
                frame: Arc::from(frame),
                width,
                height,
            },
        );

        while self.frames.len() > MAX_CACHED_OVERLAY_FRAMES {
            if let Some(old_id) = self.order.pop_front() {
                self.frames.remove(&old_id);
            } else {
                break;
            }
        }
    }

    // 登録済みIDからフレームを取り出す。Arcなので送信中もキャッシュロックを保持しない。
    pub fn get_cloned(&self, id: &str) -> Option<CachedOverlayFrame> {
        self.frames.get(id).cloned()
    }
}
