use std::collections::HashMap;
use std::fs;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Mutex;
use reqwest::Client;
use crate::downloader::{self, SplitPart};
use crate::mount;
use tauri::Emitter;

#[derive(serde::Deserialize, Clone, serde::Serialize)]
pub struct SchoolApiFile {
    pub id: String,
    pub name: String,
    pub url: String,
    pub extension: Option<String>,
    pub modified: Option<u64>,
}

#[derive(serde::Deserialize, Clone, serde::Serialize)]
pub struct SchoolApiEntry {
    pub id: String,
    pub directory: String,
    pub files: Vec<SchoolApiFile>,
}

#[derive(Clone, serde::Serialize)]
pub struct VirtualNode {
    pub name: String,
    pub is_dir: bool,
    pub path: String, // Normalized path, e.g. "/Network Storage 1/Folder/file.pdf"
    pub size: u64,
    pub modified: u64,
    pub direct_url: Option<String>,
    pub file_id: Option<String>,
    pub is_split: bool,
    pub split_parts: Vec<SplitPartPayload>,
    pub split_archive_name: Option<String>,
    pub is_raw_split: bool,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct SplitPartPayload {
    pub url: String,
    pub name: String,
    pub part_num: usize,
}

pub struct AppState {
    pub school_admin_token: Option<String>,
    pub sub_token: Option<String>,
    pub sub_user_display: Option<String>,
    pub elevation_user_display: Option<String>,
    pub port: u16,
    pub drive_letter: Option<char>,
    pub cache_dir: PathBuf,
    pub config_dir: PathBuf,
    pub path_map: HashMap<String, VirtualNode>,
    pub backend_origin: String,
    pub user_cleared: bool,
}

pub struct HttpRequest {
    pub method: String,
    pub path: String,
    pub headers: HashMap<String, String>,
    pub query: HashMap<String, String>,
}

fn percent_decode(s: &str) -> String {
    let mut res = Vec::new();
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(val) = u8::from_str_radix(&s[i+1..i+3], 16) {
                res.push(val);
                i += 3;
                continue;
            }
        }
        res.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&res).into_owned()
}

fn parse_query(query_str: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for pair in query_str.split('&') {
        let parts: Vec<&str> = pair.split('=').collect();
        if parts.len() == 2 {
            let key = percent_decode(parts[0]);
            let val = percent_decode(parts[1]);
            map.insert(key, val);
        }
    }
    map
}

fn parse_http_request(raw: &[u8]) -> Option<HttpRequest> {
    let mut header_end = None;
    for i in 0..raw.len().saturating_sub(3) {
        if raw[i] == b'\r' && raw[i+1] == b'\n' && raw[i+2] == b'\r' && raw[i+3] == b'\n' {
            header_end = Some(i);
            break;
        }
    }
    let header_end = header_end?;
    let header_part = &raw[..header_end];

    let header_str = std::str::from_utf8(header_part).ok()?;
    let mut lines = header_str.lines();
    let req_line = lines.next()?;
    let mut req_tokens = req_line.split_whitespace();
    let method = req_tokens.next()?.to_string();
    let full_path = req_tokens.next()?.to_string();

    let (raw_path, query_map) = if let Some(q_idx) = full_path.find('?') {
        let p = &full_path[..q_idx];
        let q = &full_path[q_idx + 1..];
        (p, parse_query(q))
    } else {
        (&full_path[..], HashMap::new())
    };

    let decoded_path = percent_decode(raw_path);

    let mut headers_map = HashMap::new();
    for line in lines {
        if let Some(colon_idx) = line.find(':') {
            let key = line[..colon_idx].trim().to_lowercase();
            let value = line[colon_idx + 1..].trim().to_string();
            headers_map.insert(key, value);
        }
    }

    Some(HttpRequest {
        method,
        path: decoded_path,
        headers: headers_map,
        query: query_map,
    })
}

// Parses Notion split archive parts
fn parse_split_info(name: &str) -> Option<(String, usize, bool)> {
    // Check for Pattern A: archive_name.partNNN.7z
    if name.ends_with(".7z") {
        if let Some(part_idx) = name.rfind(".part") {
            let num_str = &name[part_idx + 5..name.len() - 3];
            if let Ok(part_num) = num_str.parse::<usize>() {
                let archive_name = format!("{}.7z", &name[..part_idx]);
                return Some((archive_name, part_num, false));
            }
        }
    }
    
    // Check for Pattern B: archive_name.7z.NNN (Standard 7z split)
    let parts: Vec<&str> = name.split('.').collect();
    if parts.len() >= 3 {
        let last = parts[parts.len() - 1];
        let second_last = parts[parts.len() - 2];
        if second_last == "7z" && last.len() == 3 {
            if let Ok(part_num) = last.parse::<usize>() {
                let archive_name = parts[..parts.len() - 1].join(".");
                return Some((archive_name, part_num, false));
            }
        }
    }

    // Check for Pattern C: Raw split (e.g. MyFile.zip.001)
    if parts.len() >= 2 {
        let last = parts[parts.len() - 1];
        if last.len() == 3 {
            if let Ok(part_num) = last.parse::<usize>() {
                let archive_name = parts[..parts.len() - 1].join(".");
                return Some((archive_name, part_num, true));
            }
        }
    }

    None
}

// Normalizes WebDAV paths by decoding URL encoding and removing trailing slashes
fn normalize_path(path: &str) -> String {
    let decoded = percent_decode(path);
    let mut p = decoded.replace('\\', "/");
    if p.len() > 1 && p.ends_with('/') {
        p.pop();
    }
    p
}

pub async fn rebuild_file_tree(state: &mut AppState) -> Result<(), String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .unwrap_or_else(|_| Client::new());
    let mut new_map = HashMap::new();

    // Insert Root `/`
    new_map.insert("/".to_string(), VirtualNode {
        name: "".to_string(),
        is_dir: true,
        path: "/".to_string(),
        size: 0,
        modified: 0,
        direct_url: None,
        file_id: None,
        is_split: false,
        split_parts: Vec::new(),
        split_archive_name: None,
        is_raw_split: false,
    });

    // 1. Fetch Network Storage 1 if Elevated
    if let Some(ref token) = state.school_admin_token {
        // Create root category folder
        new_map.insert("/Network Storage 1".to_string(), VirtualNode {
            name: "Network Storage 1".to_string(),
            is_dir: true,
            path: "/Network Storage 1".to_string(),
            size: 0,
            modified: 0,
            direct_url: None,
            file_id: None,
            is_split: false,
            split_parts: Vec::new(),
            split_archive_name: None,
            is_raw_split: false,
        });

        match fetch_storage_entries(&client, token, "school", &state.backend_origin).await {
            Ok(entries) => {
                populate_tree_from_entries(&mut new_map, "/Network Storage 1", entries);
            }
            Err(e) => println!("Error fetching Network Storage 1: {}", e),
        }
    }

    // 2. Fetch Complimentary Storage if Subscribed
    if let Some(ref token) = state.sub_token {
        new_map.insert("/Complimentary Storage".to_string(), VirtualNode {
            name: "Complimentary Storage".to_string(),
            is_dir: true,
            path: "/Complimentary Storage".to_string(),
            size: 0,
            modified: 0,
            direct_url: None,
            file_id: None,
            is_split: false,
            split_parts: Vec::new(),
            split_archive_name: None,
            is_raw_split: false,
        });

        match fetch_storage_entries(&client, token, "complimentary", &state.backend_origin).await {
            Ok(entries) => {
                populate_tree_from_entries(&mut new_map, "/Complimentary Storage", entries);
            }
            Err(e) => println!("Error fetching Complimentary Storage: {}", e),
        }
    }

    state.path_map = new_map;
    Ok(())
}

async fn fetch_storage_entries(client: &Client, token: &str, scope: &str, backend_origin: &str) -> Result<Vec<SchoolApiEntry>, String> {
    let mut origins = Vec::new();
    
    // Normalize backend origin: if passed Vite dev port (5173-5179), redirect to Node backend 3001
    let mut primary_origin = backend_origin.to_string();
    if primary_origin.contains(":5173") || primary_origin.contains(":5174") || primary_origin.contains(":5175") {
        primary_origin = "http://localhost:3001".to_string();
    }
    origins.push(primary_origin);
    if !origins.contains(&"http://localhost:3001".to_string()) {
        origins.push("http://localhost:3001".to_string());
    }
    if !origins.contains(&"https://maruchansquigle.vercel.app".to_string()) {
        origins.push("https://maruchansquigle.vercel.app".to_string());
    }

    let mut last_error = String::new();

    for origin in &origins {
        let url = format!("{}/api/notes?scope={}", origin, scope);
        for _attempt in 1..=2 {
            match client.get(&url)
                .header("Authorization", format!("Bearer {}", token))
                .send().await
            {
                Ok(resp) => {
                    if resp.status().is_success() {
                        if let Ok(entries) = resp.json::<Vec<SchoolApiEntry>>().await {
                            return Ok(entries);
                        }
                    } else {
                        last_error = format!("Backend API returned status {}", resp.status());
                    }
                }
                Err(e) => {
                    last_error = format!("Backend connection error: {}", e);
                }
            }
            tokio::time::sleep(std::time::Duration::from_millis(400)).await;
        }
    }

    Err(last_error)
}

fn populate_tree_from_entries(map: &mut HashMap<String, VirtualNode>, root_name: &str, entries: Vec<SchoolApiEntry>) {
    for entry in entries {
        // Clean up directory path. e.g., "/Windows Files/Minecraft"
        let clean_dir = entry.directory.replace('\\', "/");
        let clean_dir = if clean_dir.starts_with('/') { &clean_dir[1..] } else { &clean_dir };
        
        let mut current_prefix = root_name.to_string();
        if !clean_dir.is_empty() {
            let segments: Vec<&str> = clean_dir.split('/').collect();
            for seg in segments {
                if seg.is_empty() { continue; }
                let parent = current_prefix.clone();
                current_prefix = format!("{}/{}", parent, seg);
                
                // Add directory node if not exists
                map.entry(current_prefix.clone()).or_insert_with(|| VirtualNode {
                    name: seg.to_string(),
                    is_dir: true,
                    path: current_prefix.clone(),
                    size: 0,
                    modified: 0,
                    direct_url: None,
                    file_id: None,
                    is_split: false,
                    split_parts: Vec::new(),
                    split_archive_name: None,
                    is_raw_split: false,
                });
            }
        }

        // Group files for split-archives
        let mut normal_files = Vec::new();
        let mut split_groups: HashMap<String, (Vec<SchoolApiFile>, Option<String>, bool)> = HashMap::new();

        for file in entry.files {
            if let Some((archive_name, _part_num, is_raw)) = parse_split_info(&file.name) {
                let entry = split_groups.entry(archive_name).or_insert((Vec::new(), None, is_raw));
                // Keep extension if provided
                if file.extension.is_some() {
                    entry.1 = file.extension.clone();
                }
                entry.0.push(file);
            } else {
                normal_files.push(file);
            }
        }

        // Populate normal files
        for file in normal_files {
            let file_path = format!("{}/{}", current_prefix, file.name);
            map.insert(file_path.clone(), VirtualNode {
                name: file.name.clone(),
                is_dir: false,
                path: file_path,
                size: 4096, // default/small indicator
                modified: file.modified.unwrap_or(0),
                direct_url: Some(file.url),
                file_id: Some(file.id),
                is_split: false,
                split_parts: Vec::new(),
                split_archive_name: None,
                is_raw_split: false,
            });
        }

        // Populate split groups as single combined files
        for (archive_name, (parts, ext, is_raw)) in split_groups {
            // Determine resolved filename
            let resolved_name = if let Some(ref ext_str) = ext {
                let base = archive_name.strip_suffix(".7z").unwrap_or(&archive_name);
                format!("{}.{}", base, ext_str)
            } else {
                archive_name.clone()
            };

            // Estimate total parts size
            let total_size = parts.len() as u64 * 4 * 1024 * 1024; // ~4MB per part
            
            let file_path = format!("{}/{}", current_prefix, resolved_name);
            let mut split_parts_payload = Vec::new();
            for part in parts {
                if let Some((_, part_num, _)) = parse_split_info(&part.name) {
                    split_parts_payload.push(SplitPartPayload {
                        url: part.url,
                        name: part.name,
                        part_num,
                    });
                }
            }

            map.insert(file_path.clone(), VirtualNode {
                name: resolved_name,
                is_dir: false,
                path: file_path,
                size: total_size,
                modified: 0,
                direct_url: None,
                file_id: None,
                is_split: true,
                split_parts: split_parts_payload,
                split_archive_name: Some(archive_name),
                is_raw_split: is_raw,
            });
        }
    }
}

pub async fn run_webdav_server(state: Arc<Mutex<AppState>>, app_handle: tauri::AppHandle) {
    let port = {
        let s = state.lock().await;
        s.port
    };

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = match TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            println!("Failed to bind WebDAV server to {}: {}", addr, e);
            return;
        }
    };

    println!("WebDAV server running on http://{}", addr);

    loop {
        match listener.accept().await {
            Ok((stream, _)) => {
                let state_clone = state.clone();
                let handle_clone = app_handle.clone();
                tokio::spawn(async move {
                    handle_connection(stream, state_clone, handle_clone).await;
                });
            }
            Err(e) => println!("Accept error: {}", e),
        }
    }
}

fn find_node_case_insensitive(map: &HashMap<String, VirtualNode>, target_path: &str) -> (Option<VirtualNode>, String) {
    if let Some(node) = map.get(target_path) {
        return (Some(node.clone()), target_path.to_string());
    }
    let target_lower = target_path.to_lowercase();
    for (k, v) in map {
        if k.to_lowercase() == target_lower {
            return (Some(v.clone()), k.clone());
        }
    }
    (None, target_path.to_string())
}

async fn handle_connection(mut stream: TcpStream, state: Arc<Mutex<AppState>>, app_handle: tauri::AppHandle) {
    let mut buf = vec![0; 8192];
    let n = match stream.read(&mut buf).await {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let req = match parse_http_request(&buf[..n]) {
        Some(r) => r,
        None => return,
    };

    println!("WebDAV Request: {} {} | headers: {:?}", req.method, req.path, req.headers);

    // Health check endpoint for the website to verify companion is running
    if req.path == "/ping" || req.path == "/health" {
        let body = r#"{"ok":true}"#;
        let response = format!(
            "HTTP/1.1 200 OK\r\n\
             Access-Control-Allow-Origin: *\r\n\
             Content-Type: application/json\r\n\
             Content-Length: {}\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(response.as_bytes()).await;
        return;
    }

    // Handoff Endpoint /auth?token=XYZ&type=elevation|subscription
    if req.path == "/auth" {
        handle_auth_handoff(stream, req, state, app_handle).await;
        return;
    }

    // Normal WebDAV handling
    let path = normalize_path(&req.path);
    let (node_opt, _canonical_path) = {
        let s = state.lock().await;
        find_node_case_insensitive(&s.path_map, &path)
    };

    match req.method.as_str() {
        "OPTIONS" => {
            let res = "HTTP/1.1 200 OK\r\n\
                       Allow: OPTIONS, GET, HEAD, PROPFIND, PROPPATCH, LOCK, UNLOCK\r\n\
                       DAV: 1, 2\r\n\
                       MS-Author-Via: DAV\r\n\
                       Content-Length: 0\r\n\r\n";
            let _ = stream.write_all(res.as_bytes()).await;
        }
        "PROPFIND" => {
            handle_propfind(stream, &path, &req, node_opt, state).await;
        }
        "PROPPATCH" => {
            // Dummy response
            let res_body = format!(
                r#"<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop><D:getlastmodified/></D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>"#, req.path);
            let response = format!(
                "HTTP/1.1 207 Multi-Status\r\n\
                 Content-Type: application/xml; charset=utf-8\r\n\
                 Content-Length: {}\r\n\r\n{}",
                res_body.len(),
                res_body
            );
            let _ = stream.write_all(response.as_bytes()).await;
        }
        "LOCK" => {
            // Dummy Lock response
            let res_body = format!(
                r#"<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:">
  <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:exclusive/></D:lockscope>
      <D:depth>Infinity</D:depth>
      <D:owner><D:href>Windows WebDAV Client</D:href></D:owner>
      <D:timeout>Second-3600</D:timeout>
      <D:locktoken><D:href>opaquelocktoken:dummy-lock-token</D:href></D:locktoken>
      <D:lockroot><D:href>{}</D:href></D:lockroot>
    </D:activelock>
  </D:lockdiscovery>
</D:prop>"#, req.path);
            let response = format!(
                "HTTP/1.1 200 OK\r\n\
                 Content-Type: application/xml; charset=utf-8\r\n\
                 Lock-Token: <opaquelocktoken:dummy-lock-token>\r\n\
                 Content-Length: {}\r\n\r\n{}",
                res_body.len(),
                res_body
            );
            let _ = stream.write_all(response.as_bytes()).await;
        }
        "UNLOCK" => {
            let res = "HTTP/1.1 204 No Content\r\n\
                       Content-Length: 0\r\n\r\n";
            let _ = stream.write_all(res.as_bytes()).await;
        }
        "PUT" => {
            let header_len = match buf[..n].windows(4).position(|w| w == b"\r\n\r\n") {
                Some(pos) => pos + 4,
                None => n,
            };
            handle_file_put(stream, req, &buf[..n], header_len, state, app_handle).await;
        }
        "DELETE" => {
            if let Some(node) = node_opt {
                handle_file_delete(stream, &path, node, state).await;
            } else {
                let res = "HTTP/1.1 204 No Content\r\nContent-Length: 0\r\n\r\n";
                let _ = stream.write_all(res.as_bytes()).await;
            }
        }
        "MKCOL" => {
            let res = "HTTP/1.1 201 Created\r\nContent-Length: 0\r\n\r\n";
            let _ = stream.write_all(res.as_bytes()).await;
        }
        "MOVE" => {
            let dest_header = req.headers.get("destination").cloned().unwrap_or_default();
            let raw_dest = dest_header.trim();
            let dest_path = if let Some(idx) = raw_dest.find("/DavWWWRoot") {
                raw_dest[idx + 11..].to_string()
            } else if let Some(idx) = raw_dest.find("://") {
                if let Some(path_start) = raw_dest[idx + 3..].find('/') {
                    raw_dest[idx + 3 + path_start..].to_string()
                } else {
                    raw_dest.to_string()
                }
            } else {
                raw_dest.to_string()
            };

            let dest_path = normalize_path(&dest_path);
            let dest_parts: Vec<&str> = dest_path.trim_matches('/').split('/').collect();

            if let (Some(node), false) = (node_opt, dest_parts.len() < 2) {
                let category = dest_parts[0];
                let new_filename = dest_parts[dest_parts.len() - 1];
                let new_directory = if dest_parts.len() > 2 {
                    dest_parts[1..dest_parts.len() - 1].join("/")
                } else {
                    "".to_string()
                };

                let (token, scope, backend_origin) = {
                    let s = state.lock().await;
                    let tok = if category == "Network Storage 1" {
                        s.school_admin_token.clone()
                    } else if category == "Complimentary Storage" {
                        s.sub_token.clone()
                    } else {
                        None
                    };
                    let scp = if category == "Network Storage 1" { "school" } else { "complimentary" };
                    (tok, scp.to_string(), s.backend_origin.clone())
                };

                if let (Some(token), Some(file_id)) = (token, node.file_id) {
                    let client = Client::new();
                    if new_filename != node.name {
                        // File rename: delete old entry and trigger reupload
                        let _ = crate::uploader::delete_entry(&client, &backend_origin, &token, &scope, &file_id).await;
                    } else {
                        // Folder move: fast directory cell update
                        let _ = crate::uploader::update_entry(
                            &client,
                            &backend_origin,
                            &token,
                            &scope,
                            &file_id,
                            &new_directory,
                            new_filename,
                        ).await;
                    }

                    let state_clone = state.clone();
                    tokio::spawn(async move {
                        let mut s = state_clone.lock().await;
                        let _ = rebuild_file_tree(&mut s).await;
                    });
                }
            }

            let res = "HTTP/1.1 201 Created\r\nContent-Length: 0\r\n\r\n";
            let _ = stream.write_all(res.as_bytes()).await;
        }
        "HEAD" | "GET" => {
            if let Some(node) = node_opt {
                if node.is_dir {
                    // Directories can return 403 or empty list
                    let body = "Directory browsing not allowed via GET.";
                    let response = format!(
                        "HTTP/1.1 403 Forbidden\r\n\
                         Content-Length: {}\r\n\r\n{}",
                        body.len(),
                        body
                    );
                    let _ = stream.write_all(response.as_bytes()).await;
                } else {
                    handle_file_get(stream, &req, node, state, app_handle).await;
                }
            } else {
                let body = "File not found.";
                let response = format!(
                    "HTTP/1.1 404 Not Found\r\n\
                     Content-Length: {}\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(response.as_bytes()).await;
            }
        }
        _ => {
            let res = "HTTP/1.1 501 Not Implemented\r\n\
                       Content-Length: 0\r\n\r\n";
            let _ = stream.write_all(res.as_bytes()).await;
        }
    }
}

async fn handle_auth_handoff(
    mut stream: TcpStream,
    req: HttpRequest,
    state: Arc<Mutex<AppState>>,
    app_handle: tauri::AppHandle,
) {
    if req.method == "OPTIONS" {
        let res = "HTTP/1.1 200 OK\r\n\
                   Access-Control-Allow-Origin: *\r\n\
                   Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
                   Access-Control-Allow-Headers: Authorization, Content-Type\r\n\
                   Content-Length: 0\r\n\r\n";
        let _ = stream.write_all(res.as_bytes()).await;
        return;
    }

    let token = req.query.get("token").cloned();
    let auth_type = req.query.get("type").cloned();

    if token.is_none() || auth_type.is_none() {
        let body = r#"{"ok":false,"error":"Missing parameters"}"#;
        let response = format!(
            "HTTP/1.1 400 Bad Request\r\n\
             Access-Control-Allow-Origin: *\r\n\
             Content-Type: application/json\r\n\
             Content-Length: {}\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(response.as_bytes()).await;
        return;
    }

    let token = token.unwrap();
    let auth_type = auth_type.unwrap();

    if is_jwt_expired(&token) {
        let body = r#"{"ok":false,"error":"Token expired. Please re-enter PIN on browser."}"#;
        let response = format!(
            "HTTP/1.1 401 Unauthorized\r\n\
             Access-Control-Allow-Origin: *\r\n\
             Content-Type: application/json\r\n\
             Content-Length: {}\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(response.as_bytes()).await;
        return;
    }

    let mut s = state.lock().await;

    let auto_sync = req.query.get("auto").map(|val| val == "true").unwrap_or(false);
    if auto_sync && s.user_cleared {
        let body = r#"{"ok":false,"error":"User cleared sessions"}"#;
        let response = format!(
            "HTTP/1.1 403 Forbidden\r\n\
             Access-Control-Allow-Origin: *\r\n\
             Content-Type: application/json\r\n\
             Content-Length: {}\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(response.as_bytes()).await;
        return;
    }

    s.user_cleared = false;

    let origin = req.query.get("origin").cloned().unwrap_or_else(|| "https://maruchansquigle.vercel.app".to_string());
    let mut clean_origin = origin;
    if clean_origin.ends_with('/') {
        clean_origin.pop();
    }
    s.backend_origin = clean_origin;

    let user_param = req.query.get("user").or_else(|| req.query.get("email")).cloned();
    let display_user = user_param.or_else(|| decode_jwt_user_display(&token));

    if auth_type == "elevation" {
        s.school_admin_token = Some(token.clone());
        s.elevation_user_display = display_user.or(Some("Elevated Admin".to_string()));
    } else if auth_type == "subscription" {
        s.sub_token = Some(token.clone());
        s.sub_user_display = display_user.or(Some("Subscriber Account".to_string()));
    } else {
        let body = r#"{"ok":false,"error":"Invalid type"}"#;
        let response = format!(
            "HTTP/1.1 400 Bad Request\r\n\
             Access-Control-Allow-Origin: *\r\n\
             Content-Type: application/json\r\n\
             Content-Length: {}\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(response.as_bytes()).await;
        return;
    }

    // Save configuration
    save_config(&s);
    let port = s.port;
    drop(s);

    // Emit event and respond IMMEDIATELY so the caller/unlock isn't blocked
    let _ = app_handle.emit("auth-updated", ());
    let body = r#"{"ok":true}"#;
    let response = format!(
        "HTTP/1.1 200 OK\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Content-Type: application/json\r\n\
         Content-Length: {}\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes()).await;

    // Rebuild tree and mount in background so Explorer has files ready
    let state_clone = state.clone();
    tokio::spawn(async move {
        let mut s = state_clone.lock().await;
        let _ = rebuild_file_tree(&mut s).await;
        if s.drive_letter.is_none() {
            if let Some(best_letter) = mount::find_best_drive_letter() {
                if mount::mount_drive(best_letter, port).is_ok() {
                    s.drive_letter = Some(best_letter);
                    save_config(&s);
                }
            }
        }
    });
}

pub fn is_jwt_expired(token: &str) -> bool {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() >= 2 {
        let payload_b64 = parts[1];
        let clean = payload_b64.replace('-', "+").replace('_', "/");
        let mut padded = clean;
        while padded.len() % 4 != 0 {
            padded.push('=');
        }
        if let Ok(decoded_bytes) = base64_decode_simple(&padded) {
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&decoded_bytes) {
                if let Some(exp) = json["exp"].as_i64() {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as i64;
                    return now >= exp;
                }
            }
        }
    }
    false
}

pub fn decode_jwt_user_display(token: &str) -> Option<String> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() >= 2 {
        let payload_b64 = parts[1];
        let clean = payload_b64.replace('-', "+").replace('_', "/");
        let mut padded = clean;
        while padded.len() % 4 != 0 {
            padded.push('=');
        }
        if let Ok(decoded_bytes) = base64_decode_simple(&padded) {
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&decoded_bytes) {
                if let Some(email) = json["email"].as_str() { return Some(email.to_string()); }
                if let Some(name) = json["name"].as_str() { return Some(name.to_string()); }
                if let Some(username) = json["username"].as_str() { return Some(username.to_string()); }
                if let Some(sub) = json["sub"].as_str() {
                    if !sub.is_empty() && sub.contains('@') { return Some(sub.to_string()); }
                }
            }
        }
    }
    None
}

fn base64_decode_simple(s: &str) -> Result<Vec<u8>, ()> {
    let mut out = Vec::new();
    let table = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'=' { break; }
        let c1 = match table.iter().position(|&b| b == bytes[i]) { Some(p) => p as u32, None => return Err(()) };
        let c2 = if i + 1 < bytes.len() && bytes[i+1] != b'=' { match table.iter().position(|&b| b == bytes[i+1]) { Some(p) => p as u32, None => return Err(()) } } else { 0 };
        let c3 = if i + 2 < bytes.len() && bytes[i+2] != b'=' { match table.iter().position(|&b| b == bytes[i+2]) { Some(p) => p as u32, None => return Err(()) } } else { 0 };
        let c4 = if i + 3 < bytes.len() && bytes[i+3] != b'=' { match table.iter().position(|&b| b == bytes[i+3]) { Some(p) => p as u32, None => return Err(()) } } else { 0 };

        let triple = (c1 << 18) + (c2 << 12) + (c3 << 6) + c4;
        out.push(((triple >> 16) & 0xFF) as u8);
        if i + 2 < bytes.len() && bytes[i+2] != b'=' { out.push(((triple >> 8) & 0xFF) as u8); }
        if i + 3 < bytes.len() && bytes[i+3] != b'=' { out.push((triple & 0xFF) as u8); }
        i += 4;
    }
    Ok(out)
}

fn save_config(state: &AppState) {
    let config_path = state.config_dir.join("config.json");
    if let Err(e) = fs::create_dir_all(&state.config_dir) {
        println!("Error creating config dir: {}", e);
        return;
    }

    let json = serde_json::json!({
        "school_admin_token": state.school_admin_token,
        "sub_token": state.sub_token,
        "sub_user_display": state.sub_user_display,
        "elevation_user_display": state.elevation_user_display,
        "port": state.port,
        "drive_letter": state.drive_letter.map(|c| c.to_string()),
        "backend_origin": state.backend_origin,
        "user_cleared": state.user_cleared,
    });

    if let Ok(data) = serde_json::to_string_pretty(&json) {
        let _ = fs::write(config_path, data);
    }
}

async fn handle_propfind(
    mut stream: TcpStream,
    path: &str,
    req: &HttpRequest,
    node_opt: Option<VirtualNode>,
    state: Arc<Mutex<AppState>>,
) {
    let depth = req.headers.get("depth").map(|s| s.as_str()).unwrap_or("1");

    let mut responses = Vec::new();

    if let Some(node) = node_opt {
        // Add the target resource itself (href must be URL-encoded for Windows WebDAV)
        let encoded_req_path = encode_href_path(&req.path);
        responses.push(build_propfind_response(&node, &encoded_req_path));

        // Add children if it's a directory and Depth is 1
        if node.is_dir && depth == "1" {
            let s = state.lock().await;
            let path_lower = path.to_lowercase();
            // Scan state.path_map for immediate children
            for (child_path, child_node) in &s.path_map {
                let child_lower = child_path.to_lowercase();
                if child_path == "/" || child_lower == path_lower {
                    continue;
                }
                // Check if child is directly under path (case-insensitive)
                let is_direct_child = if path_lower == "/" {
                    let count = child_lower.matches('/').count();
                    count == 1
                } else {
                    child_lower.starts_with(&path_lower) &&
                    child_lower.len() > path_lower.len() &&
                    child_lower[path_lower.len()..].starts_with('/') &&
                    child_lower[path_lower.len() + 1..].matches('/').count() == 0
                };

                if is_direct_child {
                    // Build path mapping with proper URL encoding
                    let href_path = if encoded_req_path.ends_with('/') {
                        format!("{}{}", encoded_req_path, url_encode(&child_node.name))
                    } else {
                        format!("{}/{}", encoded_req_path, url_encode(&child_node.name))
                    };
                    responses.push(build_propfind_response(child_node, &href_path));
                }
            }
        }
    } else {
        let res = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(res.as_bytes()).await;
        return;
    }

    let multistatus_body = format!(
        r#"<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:">
{}
</D:multistatus>"#,
        responses.join("\n")
    );

    let response = format!(
        "HTTP/1.1 207 Multi-Status\r\n\
         Content-Type: application/xml; charset=utf-8\r\n\
         Content-Length: {}\r\n\r\n{}",
        multistatus_body.len(),
        multistatus_body
    );
    let _ = stream.write_all(response.as_bytes()).await;
}

fn url_encode(s: &str) -> String {
    let mut res = String::new();
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
            res.push(b as char);
        } else if b == b' ' {
            res.push_str("%20");
        } else {
            res.push_str(&format!("%{:02X}", b));
        }
    }
    res
}

fn encode_href_path(path: &str) -> String {
    path.split('/')
        .map(|seg| {
            if seg.is_empty() {
                seg.to_string()
            } else {
                url_encode(seg)
            }
        })
        .collect::<Vec<_>>()
        .join("/")
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
     .replace('"', "&quot;")
     .replace('\'', "&apos;")
}

fn build_propfind_response(node: &VirtualNode, href_path: &str) -> String {
    let mut final_href = href_path.to_string();
    if node.is_dir && !final_href.ends_with('/') {
        final_href.push('/');
    }

    let resourcetype = if node.is_dir {
        "<D:resourcetype><D:collection/></D:resourcetype>"
    } else {
        "<D:resourcetype/>"
    };

    let contentlength = if node.is_dir {
        "".to_string()
    } else {
        format!("<D:getcontentlength>{}</D:getcontentlength>", node.size)
    };

    let contenttype = if node.is_dir {
        "".to_string()
    } else {
        let ext = PathBuf::from(&node.name).extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        let mime = match ext.as_str() {
            "pdf" => "application/pdf",
            "txt" => "text/plain",
            "html" => "text/html",
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "7z" => "application/x-7z-compressed",
            _ => "application/octet-stream",
        };
        format!("<D:getcontenttype>{}</D:getcontenttype>", mime)
    };

    let last_modified = "Mon, 21 Jul 2026 14:00:00 GMT";
    let creation_date = "2026-07-21T14:00:00Z";
    let escaped_name = xml_escape(&node.name);

    format!(
        r#"  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>{}</D:displayname>
        {}
        {}
        {}
        <D:getlastmodified>{}</D:getlastmodified>
        <D:creationdate>{}</D:creationdate>
        <D:supportedlock>
          <D:lockentry>
            <D:lockscope><D:exclusive/></D:lockscope>
            <D:locktype><D:write/></D:locktype>
          </D:lockentry>
        </D:supportedlock>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>"#,
        final_href, escaped_name, resourcetype, contentlength, contenttype, last_modified, creation_date
    )
}

#[derive(serde::Serialize, Clone)]
struct ProgressPayload {
    filename: String,
    progress: usize,
    status: String,
}

async fn handle_file_get(
    mut stream: TcpStream,
    req: &HttpRequest,
    node: VirtualNode,
    state: Arc<Mutex<AppState>>,
    app_handle: tauri::AppHandle,
) {
    let send_body = req.method == "GET";

    // 1. Short-circuit HEAD requests immediately (0 backend calls)
    if !send_body {
        let response_headers = format!(
            "HTTP/1.1 200 OK\r\n\
             Content-Length: {}\r\n\
             Content-Type: application/octet-stream\r\n\
             Accept-Ranges: bytes\r\n\
             Connection: close\r\n\r\n",
            node.size
        );
        let _ = stream.write_all(response_headers.as_bytes()).await;
        return;
    }

    let cache_dir = {
        let s = state.lock().await;
        s.cache_dir.clone()
    };

    let target_path = cache_dir.join(&node.name);

    // 2. If Windows Shell is probing Range bytes (e.g. for thumbnail / preview generation)
    // AND the file has NOT been explicitly downloaded yet, reject the range request with 416!
    // This stops Windows Explorer from background-downloading every file in the folder!
    let is_range_request = req.headers.contains_key("range");
    let file_cached = target_path.exists() && target_path.metadata().map(|m| m.len() > 0).unwrap_or(false);

    if is_range_request && !file_cached {
        let res = format!(
            "HTTP/1.1 416 Range Not Satisfiable\r\n\
             Content-Range: bytes */{}\r\n\
             Content-Length: 0\r\n\
             Connection: close\r\n\r\n",
            node.size
        );
        let _ = stream.write_all(res.as_bytes()).await;
        return;
    }

    // Emit event that download is preparing
    let _ = app_handle.emit("download-status", ProgressPayload {
        filename: node.name.clone(),
        progress: 0,
        status: "preparing".to_string(),
    });

    let client = Client::new();

    let local_file_res = if node.is_split {
        // Convert split payload back to downloader struct
        let mut download_parts = Vec::new();
        for p in node.split_parts {
            download_parts.push(SplitPart {
                url: p.url,
                name: p.name,
                part_num: p.part_num,
            });
        }
        
        let archive_name = node.split_archive_name.as_deref().unwrap_or("archive");
        
        // Custom progress notification
        let _ = app_handle.emit("download-status", ProgressPayload {
            filename: node.name.clone(),
            progress: 25,
            status: "downloading".to_string(),
        });

        let download_res = downloader::download_and_combine(
            &client,
            download_parts,
            &cache_dir,
            archive_name,
            &node.name,
            node.is_raw_split,
        ).await;

        let _ = app_handle.emit("download-status", ProgressPayload {
            filename: node.name.clone(),
            progress: 100,
            status: "completed".to_string(),
        });

        download_res
    } else {
        let url = node.direct_url.as_deref().unwrap_or("");
        
        let _ = app_handle.emit("download-status", ProgressPayload {
            filename: node.name.clone(),
            progress: 50,
            status: "downloading".to_string(),
        });

        let download_res = downloader::download_direct_file(
            &client,
            url,
            &cache_dir,
            &node.name,
        ).await;

        let _ = app_handle.emit("download-status", ProgressPayload {
            filename: node.name.clone(),
            progress: 100,
            status: "completed".to_string(),
        });

        download_res
    };

    match local_file_res {
        Ok(path) => {
            if let Ok(data) = fs::read(&path) {
                let response_headers = format!(
                    "HTTP/1.1 200 OK\r\n\
                     Content-Length: {}\r\n\
                     Content-Type: application/octet-stream\r\n\
                     Connection: close\r\n\r\n",
                    data.len()
                );
                let _ = stream.write_all(response_headers.as_bytes()).await;
                if send_body {
                    let _ = stream.write_all(&data).await;
                }
            } else {
                respond_internal_error(stream).await;
            }
        }
        Err(e) => {
            println!("Error preparing file {}: {}", node.name, e);
            let _ = app_handle.emit("download-status", ProgressPayload {
                filename: node.name.clone(),
                progress: 0,
                status: format!("error: {}", e),
            });
            respond_internal_error(stream).await;
        }
    }
}

async fn respond_internal_error(mut stream: TcpStream) {
    let body = "Internal Server Error during file preparation.";
    let response = format!(
        "HTTP/1.1 500 Internal Server Error\r\n\
         Content-Length: {}\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes()).await;
}

async fn handle_file_put(
    mut stream: TcpStream,
    req: HttpRequest,
    raw_buf: &[u8],
    header_len: usize,
    state: Arc<Mutex<AppState>>,
    app_handle: tauri::AppHandle,
) {
    let content_len: usize = req
        .headers
        .get("content-length")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    let is_chunked = req
        .headers
        .get("transfer-encoding")
        .map(|v| v.contains("chunked"))
        .unwrap_or(false);

    let mut body_bytes = Vec::new();
    if raw_buf.len() > header_len {
        body_bytes.extend_from_slice(&raw_buf[header_len..]);
    }

    if is_chunked {
        loop {
            let mut chunk = vec![0; 16384];
            match tokio::time::timeout(std::time::Duration::from_millis(500), stream.read(&mut chunk)).await {
                Ok(Ok(n)) if n > 0 => body_bytes.extend_from_slice(&chunk[..n]),
                _ => break,
            }
        }
    } else if content_len > 0 {
        while body_bytes.len() < content_len {
            let mut chunk = vec![0; 16384];
            match stream.read(&mut chunk).await {
                Ok(n) if n > 0 => body_bytes.extend_from_slice(&chunk[..n]),
                _ => break,
            }
        }
    }

    // Windows Explorer WebDAV MiniRedir sends a 0-byte placeholder PUT request (Content-Length: 0)
    // when preparing a file copy. Acknowledge with 201 Created immediately.
    if content_len == 0 && body_bytes.is_empty() && !is_chunked {
        let res = "HTTP/1.1 201 Created\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(res.as_bytes()).await;
        return;
    }

    let path = normalize_path(&req.path);
    let parts: Vec<&str> = path.trim_matches('/').split('/').collect();

    // Disallow uploading directly to mount root (M:\) or category root (must have a subfolder for directory cell)
    if parts.len() < 3 || (parts[0] != "Network Storage 1" && parts[0] != "Complimentary Storage") {
        let body = "Uploading directly to category root is disallowed. Files must be placed inside a subfolder so a directory cell can be assigned.";
        let res = format!("HTTP/1.1 403 Forbidden\r\nContent-Length: {}\r\n\r\n{}", body.len(), body);
        let _ = stream.write_all(res.as_bytes()).await;
        return;
    }

    let category = parts[0]; // "Network Storage 1" or "Complimentary Storage"
    let filename = parts[parts.len() - 1];
    let directory = if parts.len() > 2 {
        parts[1..parts.len() - 1].join("/")
    } else {
        "".to_string()
    };

    let (token, scope, backend_origin) = {
        let s = state.lock().await;
        let tok = if category == "Network Storage 1" {
            s.school_admin_token.clone()
        } else if category == "Complimentary Storage" {
            s.sub_token.clone()
        } else {
            None
        };
        let scp = if category == "Network Storage 1" { "school" } else { "complimentary" };
        (tok, scp.to_string(), s.backend_origin.clone())
    };

    if token.is_none() {
        let body = "Unauthorized. Please authenticate first.";
        let res = format!("HTTP/1.1 401 Unauthorized\r\nContent-Length: {}\r\n\r\n{}", body.len(), body);
        let _ = stream.write_all(res.as_bytes()).await;
        return;
    }

    let token = token.unwrap();

    let _ = app_handle.emit("download-status", ProgressPayload {
        filename: filename.to_string(),
        progress: 10,
        status: "uploading".to_string(),
    });

    let client = Client::new();
    match crate::uploader::upload_file(&client, &backend_origin, &token, &scope, &directory, filename, &body_bytes).await {
        Ok(_) => {
            let _ = app_handle.emit("download-status", ProgressPayload {
                filename: filename.to_string(),
                progress: 100,
                status: "upload completed".to_string(),
            });

            // Rebuild file tree so new file shows in Explorer instantly
            let state_clone = state.clone();
            tokio::spawn(async move {
                let mut s = state_clone.lock().await;
                let _ = rebuild_file_tree(&mut s).await;
            });

            let res = "HTTP/1.1 201 Created\r\nContent-Length: 0\r\n\r\n";
            let _ = stream.write_all(res.as_bytes()).await;
        }
        Err(e) => {
            println!("Error uploading file {}: {}", filename, e);
            let _ = app_handle.emit("download-status", ProgressPayload {
                filename: filename.to_string(),
                progress: 0,
                status: format!("error: {}", e),
            });
            respond_internal_error(stream).await;
        }
    }
}

async fn handle_file_delete(
    mut stream: TcpStream,
    path: &str,
    node: VirtualNode,
    state: Arc<Mutex<AppState>>,
) {
    let parts: Vec<&str> = path.trim_matches('/').split('/').collect();
    if parts.is_empty() {
        let res = "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(res.as_bytes()).await;
        return;
    }

    let category = parts[0];
    let (token, scope, backend_origin) = {
        let s = state.lock().await;
        let tok = if category == "Network Storage 1" {
            s.school_admin_token.clone()
        } else if category == "Complimentary Storage" {
            s.sub_token.clone()
        } else {
            None
        };
        let scp = if category == "Network Storage 1" { "school" } else { "complimentary" };
        (tok, scp.to_string(), s.backend_origin.clone())
    };

    if let (Some(token), Some(file_id)) = (token, node.file_id) {
        let client = Client::new();
        let _ = crate::uploader::delete_entry(&client, &backend_origin, &token, &scope, &file_id).await;

        let state_clone = state.clone();
        tokio::spawn(async move {
            let mut s = state_clone.lock().await;
            let _ = rebuild_file_tree(&mut s).await;
        });

        let res = "HTTP/1.1 204 No Content\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(res.as_bytes()).await;
    } else {
        let res = "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(res.as_bytes()).await;
    }
}
