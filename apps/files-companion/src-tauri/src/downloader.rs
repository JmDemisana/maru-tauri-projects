use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use reqwest::Client;
use sevenz_rust;

#[derive(Clone)]
pub struct SplitPart {
    pub url: String,
    pub name: String,
    pub part_num: usize,
}

pub async fn download_and_combine(
    client: &Client,
    parts: Vec<SplitPart>,
    cache_dir: &Path,
    archive_name: &str,
    target_filename: &str,
    is_raw: bool,
) -> Result<PathBuf, String> {
    let mut sorted_parts = parts;
    sorted_parts.sort_by_key(|p| p.part_num);

    if sorted_parts.is_empty() {
        return Err("No parts to download".to_string());
    }

    let final_file_path = cache_dir.join(target_filename);
    
    if let Err(e) = fs::create_dir_all(cache_dir) {
        return Err(format!("Failed to create cache dir: {}", e));
    }

    if final_file_path.exists() {
        if let Ok(meta) = final_file_path.metadata() {
            if meta.len() > 0 {
                return Ok(final_file_path);
            }
        }
    }

    let mut download_futures = Vec::new();
    for part in &sorted_parts {
        let client_clone = client.clone();
        let url = part.url.clone();
        let part_name = part.name.clone();
        download_futures.push(tokio::spawn(async move {
            let res = client_clone.get(&url).send().await;
            match res {
                Ok(resp) => {
                    if resp.status().is_success() {
                        match resp.bytes().await {
                            Ok(bytes) => Ok(bytes),
                            Err(e) => Err(format!("Failed to read bytes for {}: {}", part_name, e)),
                        }
                    } else {
                        Err(format!("Failed to download {}: status {}", part_name, resp.status()))
                    }
                }
                Err(e) => Err(format!("Request failed for {}: {}", part_name, e)),
            }
        }));
    }

    let mut part_bytes = Vec::new();
    for handle in download_futures {
        match handle.await {
            Ok(Ok(bytes)) => part_bytes.push(bytes),
            Ok(Err(e)) => return Err(e),
            Err(e) => return Err(format!("Download thread join failed: {}", e)),
        }
    }

    if is_raw {
        let mut file = File::create(&final_file_path)
            .map_err(|e| format!("Failed to create output file: {}", e))?;
        for bytes in part_bytes {
            file.write_all(&bytes)
                .map_err(|e| format!("Failed to write to output file: {}", e))?;
        }
        Ok(final_file_path)
    } else {
        let temp_archive_path = cache_dir.join(format!("{}.temp_join.7z", archive_name));
        let mut file = File::create(&temp_archive_path)
            .map_err(|e| format!("Failed to create temp archive file: {}", e))?;
        for bytes in part_bytes {
            file.write_all(&bytes)
                .map_err(|e| format!("Failed to write to temp archive: {}", e))?;
        }
        drop(file);

        let extract_dir = cache_dir.join(format!("extract_{}", archive_name));
        if let Err(e) = fs::create_dir_all(&extract_dir) {
            let _ = fs::remove_file(&temp_archive_path);
            return Err(format!("Failed to create extraction dir: {}", e));
        }

        if let Err(e) = sevenz_rust::decompress_file(&temp_archive_path, &extract_dir) {
            let _ = fs::remove_file(&temp_archive_path);
            return Err(format!("Failed to extract 7z: {}", e));
        }

        let _ = fs::remove_file(&temp_archive_path);

        let mut extracted_file_path = None;
        if let Ok(entries) = fs::read_dir(&extract_dir) {
            let mut files = Vec::new();
            for entry in entries.flatten() {
                if let Ok(meta) = entry.metadata() {
                    if meta.is_file() {
                        files.push(entry.path());
                    }
                }
            }

            for f in &files {
                if let Some(name) = f.file_name().and_then(|n| n.to_str()) {
                    if name.eq_ignore_ascii_case(target_filename) {
                        extracted_file_path = Some(f.clone());
                        break;
                    }
                }
            }

            if extracted_file_path.is_none() && files.len() == 1 {
                extracted_file_path = Some(files[0].clone());
            }
        }

        match extracted_file_path {
            Some(path) => {
                if let Err(e) = fs::copy(&path, &final_file_path) {
                    return Err(format!("Failed to copy extracted file: {}", e));
                }
                let _ = fs::remove_dir_all(&extract_dir);
                Ok(final_file_path)
            }
            None => {
                let _ = fs::remove_dir_all(&extract_dir);
                Err(format!("Could not find extracted file matching '{}'", target_filename))
            }
        }
    }
}

pub async fn download_direct_file(
    client: &Client,
    url: &str,
    cache_dir: &Path,
    target_filename: &str,
) -> Result<PathBuf, String> {
    let final_file_path = cache_dir.join(target_filename);
    
    if let Err(e) = fs::create_dir_all(cache_dir) {
        return Err(format!("Failed to create cache dir: {}", e));
    }

    if final_file_path.exists() {
        if let Ok(meta) = final_file_path.metadata() {
            if meta.len() > 0 {
                return Ok(final_file_path);
            }
        }
    }

    let resp = client.get(url).send().await
        .map_err(|e| format!("Failed to send download request: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Download failed with status: {}", resp.status()));
    }

    let bytes = resp.bytes().await
        .map_err(|e| format!("Failed to read response bytes: {}", e))?;

    fs::write(&final_file_path, &bytes)
        .map_err(|e| format!("Failed to write file to cache: {}", e))?;

    Ok(final_file_path)
}
