use std::fs;
use std::path::{Path, PathBuf};

use crate::portable::layout;
use crate::update::manifest::UpdateManifest;

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateJob {
    pub root_dir: PathBuf,
    pub manifest: UpdateManifest,
}

pub fn write_update_job(root: &Path, manifest: UpdateManifest) -> Result<PathBuf, String> {
    let update_dir = root.join(layout::UPDATE_DIR);
    fs::create_dir_all(&update_dir).map_err(|error| {
        format!(
            "failed to create update directory {}: {error}",
            update_dir.display()
        )
    })?;

    let job_path = update_dir.join(layout::UPDATE_JOB_FILE);
    let job = UpdateJob {
        root_dir: root.to_path_buf(),
        manifest,
    };
    let job_json = serde_json::to_string_pretty(&job)
        .map_err(|error| format!("failed to serialize update job: {error}"))?;
    fs::write(&job_path, job_json).map_err(|error| {
        format!(
            "failed to write update job {}: {error}",
            job_path.display()
        )
    })?;

    Ok(job_path)
}
