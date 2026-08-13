#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::path::PathBuf;

use captiolink_vr_lib::platform::windows::message_box;
use captiolink_vr_lib::portable::layout;
use captiolink_vr_lib::update::{relaunch_app, run_update_job, UpdateJob, UpdateManifest};

fn main() {
    if let Err(error) = run() {
        message_box::show_error("CaptiolinkVR Apply", &error);
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let job_path = parse_job_path()?;
    let job = read_job(&job_path)?;
    let resolved_root = resolve_root_from_apply_location()?;
    if job.root_dir != resolved_root {
        return Err(format!(
            "update job root mismatch: expected {}, got {}",
            resolved_root.display(),
            job.root_dir.display()
        ));
    }
    run_update_job(&job)?;
    let _ = fs::remove_file(&job_path);
    relaunch_app()?;
    std::process::exit(0);
}

fn parse_job_path() -> Result<PathBuf, String> {
    let mut args = env::args().skip(1);
    let first = args
        .next()
        .ok_or_else(|| "update job path was not provided".to_string())?;
    if first == "--job" {
        args.next()
            .map(PathBuf::from)
            .ok_or_else(|| "update job path was not provided".to_string())
    } else {
        Ok(PathBuf::from(first))
    }
}

fn read_job(path: &PathBuf) -> Result<UpdateJob, String> {
    let raw = fs::read_to_string(path)
        .map_err(|error| format!("failed to read update job file: {error}"))?;
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct JobFile {
        root_dir: PathBuf,
        manifest: UpdateManifest,
    }

    let parsed: JobFile = serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse update job file: {error}"))?;
    Ok(UpdateJob {
        root_dir: parsed.root_dir,
        manifest: parsed.manifest,
    })
}

fn resolve_root_from_apply_location() -> Result<PathBuf, String> {
    let exe = env::current_exe()
        .map_err(|error| format!("failed to resolve apply executable path: {error}"))?;
    let maintenance_dir = exe
        .parent()
        .ok_or_else(|| "failed to resolve apply executable directory".to_string())?;
    if maintenance_dir.file_name().and_then(|name| name.to_str()) != Some(layout::MAINTENANCE_DIR) {
        return Err(format!(
            "apply helper is not running from {} directory: {}",
            layout::MAINTENANCE_DIR,
            maintenance_dir.display()
        ));
    }
    maintenance_dir
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "failed to resolve portable root from apply helper path".to_string())
}
