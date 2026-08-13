// リリースビルドだけ GUI サブシステムにしてコンソール窓を出さない。dev はコンソール付きで tauri dev の終了と連動しやすくする。
#![cfg_attr(
    all(target_os = "windows", not(debug_assertions)),
    windows_subsystem = "windows"
)]

fn main() {
    captiolink_vr_lib::run()
}
