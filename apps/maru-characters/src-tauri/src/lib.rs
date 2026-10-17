use std::sync::Mutex;
use std::time::Duration;
use tauri::path::BaseDirectory;
use tauri::{Manager, State};

struct LlamaState {
    child: Mutex<Option<std::process::Child>>,
    log_tail: Mutex<String>,
}

/// Model baked into the installer at build time via `pnpm bundle:builtins`.
/// Staged at src-tauri/resources/models/<file> and declared in
/// tauri.conf.json `bundle.resources`, so it ships inside the installer.
const BUNDLED_MODEL_FILE: &str = "mlabonne_Qwen3-4B-abliterated-Q4_K_M.gguf";
/// Dev fallback so `tauri dev` works without staging 2.4GB first.
const DEV_MODEL_PATH: &str = "D:/models/mlabonne_Qwen3-4B-abliterated-Q4_K_M.gguf";
/// Where `winget install llama.cpp` puts the runtime; staged copy lives in resources/bin.
const WINGET_LLAMA_SERVER: &str = "C:/Users/jmdem/AppData/Local/Microsoft/WinGet/Packages/ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe/llama-server.exe";

#[derive(serde::Deserialize)]
struct StartOptions {
    binary: String,
    model: String,
    port: u16,
    ctx: u32,
    threads: u32,
    extra_args: String,
}

#[tauri::command]
async fn move_to_next_monitor(window: tauri::WebviewWindow) -> Result<(), String> {
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    if monitors.len() <= 1 {
        return Ok(());
    }
    let current = window.current_monitor().map_err(|e| e.to_string())?;
    let mut next_idx = 0;
    if let Some(curr_mon) = current {
        for (i, m) in monitors.iter().enumerate() {
            if m.name() == curr_mon.name() {
                next_idx = (i + 1) % monitors.len();
                break;
            }
        }
    }
    let target_mon = &monitors[next_idx];
    let mon_pos = target_mon.position();
    let mon_size = target_mon.size();
    let win_size = window
        .outer_size()
        .unwrap_or(tauri::PhysicalSize::new(1080, 720));
    let new_x = mon_pos.x + ((mon_size.width as i32 - win_size.width as i32) / 2).max(50);
    let new_y = mon_pos.y + ((mon_size.height as i32 - win_size.height as i32) / 2).max(50);
    let _ = window.set_position(tauri::PhysicalPosition::new(new_x, new_y));
    Ok(())
}

#[tauri::command]
async fn llama_health(port: u16) -> Result<bool, String> {
    let url = format!("http://127.0.0.1:{}/health", port);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    match client.get(&url).send().await {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

fn first_existing(paths: Vec<Option<std::path::PathBuf>>) -> Option<String> {
    for p in paths.into_iter().flatten() {
        if p.is_file() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    None
}

/// Resolve the built-in model + runtime. Lookup order for the model:
/// installed bundle resources, then the dev D:/models path.
/// Frontend passes the literal "bundled" and calls this to get real paths.
#[tauri::command]
async fn llama_builtin_paths(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let resource_dir = app.path().resolve(".", BaseDirectory::Resource).ok();
    let res = |suffix: &str| {
        resource_dir
            .as_ref()
            .map(|d| d.join(suffix))
    };
    let model_resource_candidates = vec![
        res(&format!("resources/models/{}", BUNDLED_MODEL_FILE)),
        res(&format!("models/{}", BUNDLED_MODEL_FILE)),
        res(BUNDLED_MODEL_FILE),
    ];
    let bundled = model_resource_candidates
        .iter()
        .any(|p| p.as_ref().is_some_and(|path| path.is_file()));
    let mut model_paths = model_resource_candidates;
    model_paths.push(Some(std::path::PathBuf::from(DEV_MODEL_PATH)));
    let model = first_existing(model_paths);
    let binary = first_existing(vec![
        res("resources/bin/llama-server.exe"),
        res("bin/llama-server.exe"),
        Some(std::path::PathBuf::from(WINGET_LLAMA_SERVER)),
    ]);
    Ok(serde_json::json!({
        "model": model,
        "binary": binary,
        "bundled": bundled,
        "modelFile": BUNDLED_MODEL_FILE,
    }))
}

#[tauri::command]
async fn llama_start(state: State<'_, LlamaState>, opts: StartOptions) -> Result<String, String> {
    {
        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        if let Some(child) = guard.as_mut() {
            match child.try_wait() {
                Ok(Some(_)) => {
                    // exited, fall through to restart
                }
                Ok(None) => return Ok("already running".to_string()),
                Err(e) => return Err(e.to_string()),
            }
            let _ = guard.take();
        }
    }

    if opts.binary.trim().is_empty() {
        return Err("llama-server binary path is empty".to_string());
    }
    if opts.model.trim().is_empty() {
        return Err("model .gguf path is empty".to_string());
    }

    let mut cmd = std::process::Command::new(opts.binary.clone());
    cmd.arg("-m")
        .arg(opts.model.clone())
        .arg("--port")
        .arg(opts.port.to_string())
        .arg("-c")
        .arg(opts.ctx.to_string())
        .arg("-t")
        .arg(opts.threads.to_string());

    if !opts.extra_args.trim().is_empty() {
        for part in opts.extra_args.split_whitespace() {
            cmd.arg(part);
        }
    }

    // Keep window clean on Windows, capture output for debugging.
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    cmd.stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .stdin(std::process::Stdio::null());

    let child = cmd.spawn().map_err(|e| format!("failed to spawn llama-server: {}", e))?;
    {
        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        *guard = Some(child);
    }
    {
        let mut log = state.log_tail.lock().map_err(|e| e.to_string())?;
        *log = format!("started {} -m {} --port {}", opts.binary, opts.model, opts.port);
    }
    Ok("started".to_string())
}

#[tauri::command]
async fn llama_stop(state: State<'_, LlamaState>) -> Result<String, String> {
    let mut guard = state.child.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
        Ok("stopped".to_string())
    } else {
        Ok("not running".to_string())
    }
}

#[tauri::command]
async fn llama_status(
    state: State<'_, LlamaState>,
    port: u16,
) -> Result<serde_json::Value, String> {
    let managed = {
        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        match guard.as_mut() {
            Some(child) => match child.try_wait().map_err(|e| e.to_string())? {
                Some(status) => {
                    let _ = guard.take();
                    format!("exited: {}", status)
                }
                None => "running".to_string(),
            },
            None => "stopped".to_string(),
        }
    };
    let log = state
        .log_tail
        .lock()
        .map(|s| s.clone())
        .unwrap_or_default();
    let url = format!("http://127.0.0.1:{}/health", port);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    let reachable = match client.get(&url).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    };
    Ok(serde_json::json!({
        "managed": managed,
        "reachable": reachable,
        "log": log,
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(LlamaState {
            child: Mutex::new(None),
            log_tail: Mutex::new(String::new()),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            move_to_next_monitor,
            llama_health,
            llama_builtin_paths,
            llama_start,
            llama_stop,
            llama_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
