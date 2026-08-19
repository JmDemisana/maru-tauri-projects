use reqwest::Client;
use serde_json::{json, Value};

fn get_mime_type(filename: &str) -> &'static str {
    let ext = std::path::Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "pdf" => "application/pdf",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "txt" => "text/plain",
        "html" | "htm" => "text/html",
        "zip" => "application/zip",
        "7z" => "application/x-7z-compressed",
        "doc" | "docx" => "application/msword",
        _ => "application/octet-stream",
    }
}

pub async fn upload_file(
    client: &Client,
    backend_origin: &str,
    token: &str,
    scope: &str,
    directory: &str,
    filename: &str,
    data: &[u8],
) -> Result<(), String> {
    let is_complimentary = scope == "complimentary";
    let chunk_size = 4 * 1024 * 1024; // 4 MB

    if data.len() < chunk_size {
        // Direct POST upload for files < 4 MB
        let action = if is_complimentary {
            "create_Complimentary_entry"
        } else {
            "create_school_entry"
        };

        let mime = get_mime_type(filename);
        let part = reqwest::multipart::Part::bytes(data.to_vec())
            .file_name(filename.to_string())
            .mime_str(mime)
            .unwrap_or_else(|_| reqwest::multipart::Part::bytes(data.to_vec()).file_name(filename.to_string()));

        let form = reqwest::multipart::Form::new()
            .text("action", action.to_string())
            .text("directory", directory.to_string())
            .part("file", part);

        let res = client
            .post(format!("{}/api/notes", backend_origin))
            .header("Authorization", format!("Bearer {}", token))
            .multipart(form)
            .send()
            .await
            .map_err(|e| format!("Upload request failed: {}", e))?;

        let status = res.status();
        if status.is_success() {
            Ok(())
        } else {
            let err_txt = res.text().await.unwrap_or_default();
            Err(format!("Upload error ({}): {}", status, err_txt))
        }
    } else {
        // Split chunked upload for files >= 4 MB
        let total_parts = (data.len() + chunk_size - 1) / chunk_size;
        let mut upload_ids: Vec<String> = Vec::new();
        let mut archive_name = format!("{}.7z", filename);
        let ext = std::path::Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        for part_idx in 0..total_parts {
            let start = part_idx * chunk_size;
            let end = std::cmp::min(data.len(), start + chunk_size);
            let chunk_data = &data[start..end];
            let part_num = part_idx + 1;
            let part_filename = format!("{}.part{:03}", filename, part_num);

            let part = reqwest::multipart::Part::bytes(chunk_data.to_vec())
                .file_name(part_filename.clone())
                .mime_str("application/octet-stream")
                .unwrap_or_else(|_| reqwest::multipart::Part::bytes(chunk_data.to_vec()).file_name(part_filename.clone()));

            let form = reqwest::multipart::Form::new()
                .text("action", "create_school_upload_part".to_string())
                .text("originalFileName", filename.to_string())
                .text("partNumber", part_num.to_string())
                .part("file", part);

            let part_res = client
                .post(format!("{}/api/notes", backend_origin))
                .header("Authorization", format!("Bearer {}", token))
                .multipart(form)
                .send()
                .await
                .map_err(|e| format!("Part {} upload failed: {}", part_num, e))?;

            if !part_res.status().is_success() {
                let err_txt = part_res.text().await.unwrap_or_default();
                return Err(format!("Part {} upload error: {}", part_num, err_txt));
            }

            let part_json: Value = part_res
                .json()
                .await
                .map_err(|e| format!("Failed to parse part response: {}", e))?;

            if let Some(uid) = part_json["uploadId"].as_str() {
                upload_ids.push(uid.to_string());
            }
            if let Some(aname) = part_json["archiveName"].as_str() {
                archive_name = aname.to_string();
            }
        }

        // Finalize assemble request
        let finalize_action = if is_complimentary {
            "create_Complimentary_entry_from_parts"
        } else {
            "create_school_entry_from_parts"
        };

        let payload_json = json!({
            "action": finalize_action,
            "payload": {
                "directory": directory,
                "uploadIds": serde_json::to_string(&upload_ids).unwrap_or_default(),
                "archiveName": archive_name,
                "extension": ext,
                "ComplimentaryDb": is_complimentary
            }
        });

        let fin_res = client
            .post(format!("{}/api/notes", backend_origin))
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .body(serde_json::to_vec(&payload_json).unwrap())
            .send()
            .await
            .map_err(|e| format!("Finalize request failed: {}", e))?;

        if fin_res.status().is_success() {
            Ok(())
        } else {
            let err_txt = fin_res.text().await.unwrap_or_default();
            Err(format!("Finalize error: {}", err_txt))
        }
    }
}

pub async fn delete_entry(
    client: &Client,
    backend_origin: &str,
    token: &str,
    scope: &str,
    entry_id: &str,
) -> Result<(), String> {
    let url = format!(
        "{}/api/notes?id={}&scope={}",
        backend_origin, entry_id, scope
    );

    let res = client
        .delete(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Delete request failed: {}", e))?;

    let status = res.status();
    if status.is_success() {
        Ok(())
    } else {
        let err_txt = res.text().await.unwrap_or_default();
        Err(format!("Delete error ({}): {}", status, err_txt))
    }
}

pub async fn update_entry(
    client: &Client,
    backend_origin: &str,
    token: &str,
    scope: &str,
    entry_id: &str,
    new_directory: &str,
    new_archive_name: &str,
) -> Result<(), String> {
    let payload = json!({
        "action": "update_entry",
        "id": entry_id,
        "scope": scope,
        "directory": new_directory,
        "archiveName": new_archive_name
    });

    let res = client
        .post(format!("{}/api/notes", backend_origin))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(serde_json::to_vec(&payload).unwrap())
        .send()
        .await
        .map_err(|e| format!("Update request failed: {}", e))?;

    let status = res.status();
    if status.is_success() {
        Ok(())
    } else {
        let err_txt = res.text().await.unwrap_or_default();
        Err(format!("Update error ({}): {}", status, err_txt))
    }
}
