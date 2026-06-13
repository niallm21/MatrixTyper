pub mod encryptor;

use rfd::{FileDialog, MessageButtons, MessageDialog, MessageDialogResult, MessageLevel};
use serde::Serialize;
use std::{fs, path::Path};
use tauri::{AppHandle, Manager, Window, WindowEvent};

#[derive(Serialize)]
pub struct SaveResponse {
    success: bool,
    #[serde(rename = "filePath")]
    file_path: Option<String>,
    error: Option<String>,
    cancelled: Option<bool>,
}

#[derive(Serialize)]
pub struct OpenResponse {
    success: bool,
    content: Option<String>,
    #[serde(rename = "filePath")]
    file_path: Option<String>,
    error: Option<String>,
    cancelled: Option<bool>,
}

#[tauri::command]
async fn save_file(
    content: String,
    file_path: Option<String>,
    password: Option<String>,
) -> Result<SaveResponse, String> {
    let mut target_path = file_path;

    if target_path.is_none() {
        let selected_path = FileDialog::new()
            .set_title("Save MatrixTyper Document")
            .set_file_name("document.mtx")
            .add_filter("Supported Files", &["mtx", "txt"])
            .add_filter("MatrixTyper Files", &["mtx"])
            .add_filter("Text Files", &["txt"])
            .add_filter("All Files", &["*"])
            .save_file();

        match selected_path {
            Some(path) => {
                target_path = Some(path.to_string_lossy().to_string());
            }
            None => {
                return Ok(SaveResponse {
                    success: false,
                    file_path: None,
                    error: None,
                    cancelled: Some(true),
                });
            }
        }
    }

    let mut path = target_path.unwrap();
    if Path::new(&path).extension().is_none() {
        path.push_str(".mtx");
    }

    let pass = password.unwrap_or_else(|| "".to_string());

    let is_txt = path.to_lowercase().ends_with(".txt");

    let out_data = if is_txt {
        content.into_bytes()
    } else {
        match encryptor::encrypt(&content, &pass) {
            Ok(data) => data,
            Err(e) => {
                return Ok(SaveResponse {
                    success: false,
                    file_path: None,
                    error: Some(e),
                    cancelled: None,
                })
            }
        }
    };

    match fs::write(&path, out_data) {
        Ok(_) => Ok(SaveResponse {
            success: true,
            file_path: Some(path),
            error: None,
            cancelled: None,
        }),
        Err(e) => Ok(SaveResponse {
            success: false,
            file_path: None,
            error: Some(e.to_string()),
            cancelled: None,
        }),
    }
}

#[tauri::command]
async fn open_file_dialog() -> Result<Option<String>, String> {
    let selected_path = FileDialog::new()
        .set_title("Open MatrixTyper Document")
        .add_filter("Supported Files", &["mtx", "txt"])
        .add_filter("MatrixTyper Files", &["mtx"])
        .add_filter("Text Files", &["txt"])
        .add_filter("All Files", &["*"])
        .pick_file();

    match selected_path {
        Some(path) => Ok(Some(path.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn save_file_dialog() -> Result<Option<String>, String> {
    let selected_path = FileDialog::new()
        .set_title("Save MatrixTyper Document")
        .set_file_name("document.mtx")
        .add_filter("Supported Files", &["mtx", "txt"])
        .add_filter("MatrixTyper Files", &["mtx"])
        .add_filter("Text Files", &["txt"])
        .add_filter("All Files", &["*"])
        .save_file();

    match selected_path {
        Some(path) => Ok(Some(path.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn read_and_decrypt_file(
    path: String,
    password: Option<String>,
) -> Result<OpenResponse, String> {
    let pass = password.unwrap_or_else(|| "".to_string());
    match fs::read(&path) {
        Ok(bytes) => {
            if path.to_lowercase().ends_with(".txt") {
                return match String::from_utf8(bytes) {
                    Ok(content) => Ok(OpenResponse {
                        success: true,
                        content: Some(content),
                        file_path: Some(path),
                        error: None,
                        cancelled: None,
                    }),
                    Err(_) => Ok(OpenResponse {
                        success: false,
                        content: None,
                        file_path: None,
                        error: Some("Text file is not valid UTF-8.".into()),
                        cancelled: None,
                    }),
                };
            }

            match encryptor::decrypt(&bytes, &pass) {
                Ok(content) => Ok(OpenResponse {
                    success: true,
                    content: Some(content),
                    file_path: Some(path),
                    error: None,
                    cancelled: None,
                }),
                Err(e) => Ok(OpenResponse {
                    success: false,
                    content: None,
                    file_path: None,
                    error: Some(e),
                    cancelled: None,
                }),
            }
        }
        Err(e) => Ok(OpenResponse {
            success: false,
            content: None,
            file_path: None,
            error: Some(e.to_string()),
            cancelled: None,
        }),
    }
}

#[tauri::command]
async fn show_unsaved_prompt() -> Result<u32, String> {
    let result = MessageDialog::new()
        .set_title("Unsaved Changes")
        .set_description(
            "You have unsaved changes. Do you want to save your progress before continuing?",
        )
        .set_buttons(MessageButtons::YesNoCancel)
        .set_level(MessageLevel::Warning)
        .show();

    match result {
        MessageDialogResult::Yes => Ok(0),
        MessageDialogResult::No => Ok(1),
        _ => Ok(2), // Cancel
    }
}

#[tauri::command]
async fn show_error_dialog(message: String) -> Result<(), String> {
    MessageDialog::new()
        .set_title("Error")
        .set_description(&message)
        .set_buttons(MessageButtons::Ok)
        .set_level(MessageLevel::Error)
        .show();
    Ok(())
}

#[tauri::command]
fn toggle_fullscreen(window: Window) -> bool {
    let is_fullscreen = window.is_fullscreen().unwrap_or(false);

    if is_fullscreen {
        let _ = window.set_fullscreen(false);
        let _ = window.unmaximize();
        false
    } else {
        if window.is_maximized().unwrap_or(false) {
            let _ = window.unmaximize();
        }
        let _ = window.set_fullscreen(true);
        true
    }
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_shadow(true);
                let _ = window.set_fullscreen(true);

                let window_for_events = window.clone();
                window.on_window_event(move |event| {
                    if matches!(event, WindowEvent::Resized(_)) {
                        let is_fullscreen = window_for_events.is_fullscreen().unwrap_or(false);
                        let is_maximized = window_for_events.is_maximized().unwrap_or(false);

                        if is_maximized && !is_fullscreen {
                            let _ = window_for_events.unmaximize();
                            let _ = window_for_events.set_fullscreen(true);
                        }
                    }
                });
            }
            Ok(())
        })
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_file,
            open_file_dialog,
            save_file_dialog,
            read_and_decrypt_file,
            show_unsaved_prompt,
            show_error_dialog,
            toggle_fullscreen,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
