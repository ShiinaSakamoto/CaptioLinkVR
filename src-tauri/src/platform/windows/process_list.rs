//! 実行中プロセス名の列挙（Toolhelp32 スナップショット）。
//! SteamVR の起動判定など「特定プロセスが動いているか」を調べる用途に使う。

/// 実行中プロセス名を列挙する。スナップショット取得に失敗した場合は空になる。
pub fn running_process_names() -> impl Iterator<Item = String> {
    ProcessSnapshot::new().into_iter().flatten()
}

struct ProcessSnapshot {
    handle: Handle,
    entry: ProcessEntry32W,
    first: bool,
}

impl ProcessSnapshot {
    fn new() -> Option<Self> {
        const TH32CS_SNAPPROCESS: u32 = 0x00000002;
        let handle = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
        if handle == INVALID_HANDLE_VALUE {
            return None;
        }

        let mut entry = ProcessEntry32W::default();
        entry.dw_size = std::mem::size_of::<ProcessEntry32W>() as u32;
        Some(Self {
            handle: Handle(handle),
            entry,
            first: true,
        })
    }
}

impl Iterator for ProcessSnapshot {
    type Item = String;

    fn next(&mut self) -> Option<Self::Item> {
        let has_entry = unsafe {
            if self.first {
                self.first = false;
                Process32FirstW(self.handle.0, &mut self.entry) != 0
            } else {
                Process32NextW(self.handle.0, &mut self.entry) != 0
            }
        };

        if !has_entry {
            return None;
        }

        let len = self
            .entry
            .sz_exe_file
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(self.entry.sz_exe_file.len());
        Some(String::from_utf16_lossy(&self.entry.sz_exe_file[..len]))
    }
}

/// スナップショットハンドルをスコープ終了時に必ず閉じる。
struct Handle(isize);

impl Drop for Handle {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}

const INVALID_HANDLE_VALUE: isize = -1isize;

#[repr(C)]
struct ProcessEntry32W {
    dw_size: u32,
    cnt_usage: u32,
    th32_process_id: u32,
    th32_default_heap_id: usize,
    th32_module_id: u32,
    cnt_threads: u32,
    th32_parent_process_id: u32,
    pc_pri_class_base: i32,
    dw_flags: u32,
    sz_exe_file: [u16; 260],
}

impl Default for ProcessEntry32W {
    fn default() -> Self {
        Self {
            dw_size: 0,
            cnt_usage: 0,
            th32_process_id: 0,
            th32_default_heap_id: 0,
            th32_module_id: 0,
            cnt_threads: 0,
            th32_parent_process_id: 0,
            pc_pri_class_base: 0,
            dw_flags: 0,
            sz_exe_file: [0; 260],
        }
    }
}

#[link(name = "kernel32")]
extern "system" {
    fn CreateToolhelp32Snapshot(dw_flags: u32, th32_process_id: u32) -> isize;
    fn Process32FirstW(h_snapshot: isize, lppe: *mut ProcessEntry32W) -> i32;
    fn Process32NextW(h_snapshot: isize, lppe: *mut ProcessEntry32W) -> i32;
    fn CloseHandle(h_object: isize) -> i32;
}
