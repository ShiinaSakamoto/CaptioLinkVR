use std::path::PathBuf;

use normpath::PathExt;

// autocxxでOpenVRバインディングを生成し、実行に必要なOpenVR DLL/ライブラリを出力先へコピーする。
fn main() {
    let include_path = relative("openvr/headers");
    let mut b = autocxx_build::Builder::new(relative("src/lib.rs"), &[&include_path])
        .build()
        .expect("Could not autogenerate bindings");
    b.flag_if_supported("-std=c++14").compile("foobar");
    println!("cargo:rerun-if-changed=src/lib.rs");

    // ターゲットOSごとにOpenVRの実体ライブラリを選ぶ。
    #[cfg(target_os = "windows")]
    let input_files = [
        relative("openvr/bin/win64/openvr_api.dll"),
        relative("openvr/lib/win64/openvr_api.lib"),
    ];
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    let input_files = [relative("openvr/bin/linux64/libopenvr_api.so")];
    #[cfg(all(target_os = "linux", target_arch = "x86"))]
    let input_files = [relative("openvr/bin/linux32/libopenvr_api.so")];
    #[cfg(target_os = "macos")]
    let input_files = [panic!("Have not yet tested on mac")];

    let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    for f in input_files {
        let file_name = f.file_name().unwrap();
        std::fs::copy(&f, out_dir.join(file_name))
            .unwrap_or_else(|_| panic!("Failed to copy {:?} to {:?}", file_name, &out_dir));
    }

    println!("cargo:rustc-link-lib=dylib=openvr_api");
    println!("cargo:rustc-link-search=native={:?}", out_dir);
}

// crateルートからの相対パスを正規化して返す。
fn relative(s: &str) -> std::path::PathBuf {
    let result = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    result.join(s).normalize().unwrap().into_path_buf()
}
