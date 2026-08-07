pub mod commands;
pub mod install;
pub mod job;
pub mod launch;
pub mod manifest;

pub use commands::{check_for_updates, get_app_version, start_update};
pub use install::{relaunch_app, run_update_job};
pub use job::UpdateJob;
pub use manifest::{fetch_latest_manifest, is_newer_version, UpdateManifest};
