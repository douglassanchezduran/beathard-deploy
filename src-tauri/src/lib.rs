// Sistema BLE simplificado para detección de combate
// Módulos del sistema
mod simple_ble;
mod combat_types;
mod broadcast_ws;

use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tracing::{info, error, debug};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

// Re-exportar tipos para el frontend
pub use combat_types::{SimpleCombatEvent, LimbType, ImuData, SimpleStats};

// Usar la estructura BleDevice de simple_ble
use simple_ble::BleDevice;

// Comando para escanear dispositivos BLE disponibles
#[tauri::command]
async fn scan_ble_devices() -> Result<Vec<BleDevice>, String> {
    debug!("🔍 Escaneando dispositivos BLE disponibles");
    
    match simple_ble::scan_available_devices().await {
        Ok(devices) => {
            info!(devices_count = devices.len(), "✅ Dispositivos BLE encontrados");
            Ok(devices)
        },
        Err(e) => {
            error!(error = %e, "❌ Error escaneando dispositivos BLE");
            Err(format!("Error escaneando dispositivos: {}", e))
        }
    }
}

// Comando para conectar a un dispositivo específico
#[tauri::command]
async fn connect_to_device(app_handle: AppHandle, device_id: String) -> Result<String, String> {
    info!(device_id = %device_id, "🔗 Conectando dispositivo BLE");
    
    let app_handle_arc = Arc::new(app_handle);
    
    match simple_ble::connect_to_specific_device(app_handle_arc, device_id.clone()).await {
        Ok(_) => {
            info!(device_id = %device_id, "✅ Dispositivo BLE conectado exitosamente");
            Ok(format!("Conectado exitosamente a: {}", device_id))
        },
        Err(e) => {
            error!(device_id = %device_id, error = %e, "❌ Error conectando dispositivo BLE");
            Err(format!("Error conectando a {}: {}", device_id, e))
        }
    }
}

// Comando para conectar a un dispositivo con información del competidor
#[tauri::command]
async fn connect_to_device_with_competitor(
    app_handle: AppHandle, 
    device_id: String,
    competitor_id: u8,
    competitor_name: String,
    competitor_weight: f32
) -> Result<String, String> {
    info!(device_id = %device_id, competitor_id = competitor_id, 
          competitor_name = %competitor_name, competitor_weight = competitor_weight,
          "🔗 Conectando dispositivo para competidor");
    
    let app_handle_arc = Arc::new(app_handle);
    
    match simple_ble::connect_to_device_with_competitor(
        app_handle_arc, 
        device_id.clone(),
        competitor_id,
        competitor_name.clone(),
        competitor_weight
    ).await {
        Ok(_) => {
            info!(device_id = %device_id, competitor_name = %competitor_name, 
                  "✅ Dispositivo conectado exitosamente");
            Ok(format!("Dispositivo {} conectado para {}", device_id, competitor_name))
        },
        Err(e) => {
            error!(device_id = %device_id, competitor_name = %competitor_name, 
                   error = %e, "❌ Error conectando dispositivo");
            Err(format!("Error conectando dispositivo {} para {}: {}", device_id, competitor_name, e))
        }
    }
}

// Comando para desconectar de un dispositivo
#[tauri::command]
async fn disconnect_from_device(device_id: String) -> Result<String, String> {
    info!(device_id = %device_id, "🔌 Desconectando dispositivo BLE");
    
    match simple_ble::disconnect_from_device(device_id.clone()).await {
        Ok(_) => {
            info!(device_id = %device_id, "✅ Dispositivo BLE desconectado");
            Ok(format!("Desconectado de: {}", device_id))
        },
        Err(e) => {
            error!(device_id = %device_id, error = %e, "❌ Error desconectando dispositivo BLE");
            Err(format!("Error desconectando de {}: {}", device_id, e))
        }
    }
}

// Comando para desconectar todos los dispositivos
#[tauri::command]
async fn disconnect_all_devices() -> Result<String, String> {
    info!("🔌 Desconectando todos los dispositivos BLE");
    
    match simple_ble::disconnect_all_devices().await {
        Ok(_) => {
            info!("✅ Todos los dispositivos BLE desconectados");
            Ok("Todos los dispositivos desconectados correctamente".to_string())
        },
        Err(e) => {
            error!(error = %e, "❌ Error desconectando todos los dispositivos BLE");
            Err(format!("Error desconectando todos los dispositivos: {}", e))
        }
    }
}

// Comando para iniciar el sistema BLE
#[tauri::command]
async fn start_ble_system() -> Result<String, String> {
    // Solo logging en debug para evitar spam
    debug!("🚀 Sistema BLE solicitado");
    
    // El sistema BLE se inicializa automáticamente cuando se necesita
    // Este comando es principalmente para compatibilidad con el frontend
    Ok("Sistema BLE iniciado correctamente".to_string())
}

// Comando para obtener dispositivos conectados
#[tauri::command]
async fn get_connected_devices() -> Result<Vec<String>, String> {
    debug!("📋 Obteniendo lista de dispositivos conectados");
    
    match simple_ble::get_connected_devices_list().await {
        Ok(devices) => {
            debug!(devices_count = devices.len(), "✅ Dispositivos BLE conectados obtenidos");
            Ok(devices)
        },
        Err(e) => {
            error!(error = %e, "❌ Error obteniendo dispositivos conectados");
            Err(format!("Error obteniendo dispositivos conectados: {}", e))
        }
    }
}

// Comando para obtener información del sistema BLE
#[tauri::command]
async fn get_ble_info() -> Result<String, String> {
    debug!("ℹ️ Obteniendo información del sistema BLE");
    
    let connected_count = match simple_ble::get_connected_devices_list().await {
        Ok(devices) => devices.len(),
        Err(_) => 0
    };
    
    let info = format!(
        "Sistema BLE Beat Hard Combat\n\
         - Detección: Puñetazos, Bofetadas, Patadas\n\
         - Eventos: simple-combat-event\n\
         - Dispositivos conectados: {}\n\
         - Estado: Activo\n\
         - Soporte multi-dispositivo: Sí"
        , connected_count
    );
    
    Ok(info)
}

// Comando para conectar múltiples dispositivos simultáneamente
#[tauri::command]
async fn connect_multiple_devices(
    app_handle: AppHandle,
    device_connections: Vec<serde_json::Value>
) -> Result<Vec<String>, String> {
    info!(devices_count = device_connections.len(), "🔗 Conectando dispositivos BLE simultáneamente");
    
    let mut results = Vec::new();
    let app_handle_arc = Arc::new(app_handle);
    
    for connection in device_connections {
        let device_id = connection["deviceId"].as_str()
            .ok_or("deviceId requerido")?;
        let competitor_id = connection["competitorId"].as_u64()
            .ok_or("competitorId requerido")? as u8;
        let competitor_name = connection["competitorName"].as_str()
            .ok_or("competitorName requerido")?;
        let competitor_weight = connection["competitorWeight"].as_f64()
            .ok_or("competitorWeight requerido")? as f32;
        
        info!(device_id = %device_id, competitor_name = %competitor_name, competitor_weight = competitor_weight,
              "🔗 Conectando dispositivo para competidor");
        
        match simple_ble::connect_to_device_with_competitor(
            app_handle_arc.clone(),
            device_id.to_string(),
            competitor_id,
            competitor_name.to_string(),
            competitor_weight
        ).await {
            Ok(_) => {
                let success_msg = format!("✅ {} conectado para {}", device_id, competitor_name);
                info!(device_id = %device_id, competitor_name = %competitor_name, "{}", success_msg);
                results.push(success_msg);
            },
            Err(e) => {
                let error_msg = format!("❌ Error conectando {} para {}: {}", device_id, competitor_name, e);
                error!(device_id = %device_id, competitor_name = %competitor_name, error = %e, "{}", error_msg);
                results.push(error_msg);
            }
        }
    }
    
    let successful_count = results.iter().filter(|r| r.contains("✅")).count();
    info!(successful_count = successful_count, total_count = results.len(),
          "🏁 Proceso de conexión múltiple completado");
    
    Ok(results)
}



// Comando para obtener información del sistema
#[tauri::command]
fn get_system_info() -> Result<serde_json::Value, String> {
    let info = serde_json::json!({
        "version": "1.0.0",
        "system": "Simple BLE Combat Detection",
        "supported_events": ["punch", "slap", "kick"],
        "supported_limbs": ["LeftHand", "RightHand", "LeftFoot", "RightFoot"],
        "thresholds": {
            "punch": "2.5g",
            "slap": "1.8g", 
            "kick": "3.0g"
        },
        "cooldown_ms": 500
    });
    
    Ok(info)
}

// Comando para obtener estadísticas (placeholder)
#[tauri::command]
fn get_combat_stats() -> Result<serde_json::Value, String> {
    let stats = serde_json::json!({
        "total_events": 0,
        "punches": 0,
        "slaps": 0,
        "kicks": 0,
        "connected_devices": 0,
        "last_event_time": null
    });
    
    Ok(stats)
}

/// Resuelve la ruta de los archivos estáticos según el entorno
fn resolve_static_path(app: &tauri::App) -> String {
    if cfg!(debug_assertions) {
        // En desarrollo, usar static/dist dentro del directorio src-tauri
        std::env::current_dir()
            .expect("failed to get current directory")
            .join("static")
            .join("dist")
            .to_string_lossy()
            .to_string()
    } else {
        // En producción, usar la ruta de recursos de Tauri
        app.path()
            .resolve("static/dist", tauri::path::BaseDirectory::Resource)
            .expect("failed to resolve resource path")
            .to_string_lossy()
            .to_string()
    }
}

/// Inicializa el sistema de logging optimizado según el entorno
fn init_tracing() {
    // Determinar nivel de logging según entorno
    let default_level = if cfg!(debug_assertions) {
        "info"  // Desarrollo: info, warn, error
    } else {
        "error" // Producción: solo errores críticos
    };
    
    // Configuración optimizada para rendimiento
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| default_level.into()),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(false)  // Sin target para menos overhead
                .with_ansi(false)    // Sin colores para mejor rendimiento
                .compact()           // Formato compacto
        )
        .init();
        
    // Log inicial con nivel apropiado
    if cfg!(debug_assertions) {
        info!("🥊 Beat Hard Combat - Sistema iniciado (DESARROLLO)");
        info!("📡 Listo para detectar: Bofetadas y Patadas");
        info!("🎯 Eventos disponibles: simple-combat-event");
        info!("🔧 Nivel de logging: {} (configurable con RUST_LOG)", 
              std::env::var("RUST_LOG").unwrap_or_else(|_| default_level.to_string()));
    } else {
        // En producción, solo log crítico
        error!("🥊 Beat Hard Combat - Sistema iniciado (PRODUCCIÓN)");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_ble_system,
            scan_ble_devices,
            connect_to_device,
            connect_to_device_with_competitor,
            connect_multiple_devices,
            disconnect_from_device,
            disconnect_all_devices,
            get_connected_devices,
            get_ble_info,
            get_system_info,
            get_combat_stats,
            broadcast_ws::broadcast_battle_config,
            broadcast_ws::broadcast_view_change
        ])
        .setup(|app| {
            // Inicializar sistema de logging optimizado
            init_tracing();

            // Resolver ruta de archivos estáticos
            let resource_path = resolve_static_path(app);
        
            // Iniciar servidor WebSocket
            tauri::async_runtime::spawn(async move {
                if let Err(e) = broadcast_ws::start_ws_server(8080, true, Some(resource_path)).await {
                    info!("Failed to start WebSocket server: {}", e);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
