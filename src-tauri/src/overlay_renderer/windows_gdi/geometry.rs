// 描画・走査用の整数矩形。

#[derive(Clone, Copy)]
pub(super) struct Rect {
    pub(super) x: i32,
    pub(super) y: i32,
    pub(super) width: i32,
    pub(super) height: i32,
}

impl Rect {
    pub(super) fn right(&self) -> i32 {
        self.x + self.width
    }

    pub(super) fn bottom(&self) -> i32 {
        self.y + self.height
    }

    pub(super) fn inflate(&self, amount: i32) -> Self {
        Self {
            x: self.x - amount,
            y: self.y - amount,
            width: self.width + amount * 2,
            height: self.height + amount * 2,
        }
    }

    pub(super) fn union(self, other: Self) -> Self {
        let left = self.x.min(other.x);
        let top = self.y.min(other.y);
        let right = self.right().max(other.right());
        let bottom = self.bottom().max(other.bottom());
        Self {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
        }
    }

    pub(super) fn clamp_to_image(&self, width: u32, height: u32) -> Option<Self> {
        let left = self.x.max(0);
        let top = self.y.max(0);
        let right = self.right().min(width as i32);
        let bottom = self.bottom().min(height as i32);
        if right <= left || bottom <= top {
            return None;
        }
        Some(Self {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
        })
    }
}
