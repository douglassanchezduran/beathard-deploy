// Implementación ultra-simplificada para detección de bofetadas y patadas BLE
// Con selección manual de dispositivos desde el frontend

use bluest::{Adapter, Device, Characteristic};
use futures::{StreamExt, Stream};
use std::time::Duration;
use std::sync::{Arc, Mutex, OnceLock};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};
use tracing::{info, error, debug, warn, instrument};
use tokio::task::JoinHandle;
use once_cell::sync::Lazy;
use crate::broadcast_ws::ws_broadcast;

// Estructura para representar un dispositivo BLE encontrado
#[derive(Clone, serde::Serialize, Debug)]
pub struct BleDevice {
    pub id: String,
    pub name: String,
    pub address: String,
    pub limb_type: Option<String>,
    pub limb_name: Option<String>,  // Nombre traducido de la extremidad
    pub rssi: Option<i16>,
    pub is_connectable: bool,
}

// Estructura simple para eventos de combate
#[derive(Debug, Clone, serde::Serialize)]
pub struct SimpleCombatEvent {
    pub event_type: String,        // "slap", "kick"
    pub limb_name: String,         // "Mano Izquierda", "Pie Derecho", etc.
    pub fighter_id: String,        // ID del peleador (ej: "fighter_1", "fighter_2")
    pub competitor_name: String,   // Nombre del competidor
    pub velocity: Option<f32>,     // Velocidad en m/s
    pub acceleration: Option<f32>, // Aceleración en m/s²
    pub force: Option<f32>,        // Fuerza en Newtons
    pub timestamp: u64,            // Timestamp del evento
    pub confidence: f32,           // Confianza del evento (0.0 - 1.0)
}

// Estructura para estadísticas máximas por competidor
#[derive(Debug, Clone, serde::Serialize)]
pub struct CompetitorMaxStats {
    pub fighter_id: String,        // "fighter_1", "fighter_2", etc.
    pub competitor_name: String,   // Nombre del peleador
    pub max_force: f32,
    pub max_velocity: f32,
    pub max_acceleration: f32,
}

// Store global para estadísticas máximas (usando fighter_id como clave)
static MAX_STATS_STORE: Lazy<Arc<Mutex<HashMap<String, CompetitorMaxStats>>>> = 
    Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

// Datos básicos del sensor IMU
#[derive(Debug, Clone)]
pub struct ImuData {
    pub limb_id: u8,
    pub battery_level: u8,
    pub acc_x: i16,
    pub acc_y: i16,
    pub acc_z: i16,
    pub gyro_x: i16,
    pub gyro_y: i16,
    pub gyro_z: i16,
    pub timestamp: u64,
}

// Tipos de extremidades
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LimbType {
    LeftHand,
    RightHand,
    LeftFoot,
    RightFoot,
}

impl LimbType {
    pub fn from_id(id: u8) -> Option<Self> {
        match id {
            1 => Some(LimbType::RightHand),
            2 => Some(LimbType::LeftHand),
            3 => Some(LimbType::RightFoot),
            4 => Some(LimbType::LeftFoot),
            _ => None,
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            LimbType::LeftHand => "Mano Izquierda",
            LimbType::RightHand => "Mano Derecha",
            LimbType::LeftFoot => "Pie Izquierdo",
            LimbType::RightFoot => "Pie Derecho",
        }
    }

    pub fn ble_name_pattern(&self) -> &'static str {
        match self {
            LimbType::LeftHand => "ManoIzquierda",
            LimbType::RightHand => "ManoDerecha",
            LimbType::LeftFoot => "PieIzquierdo",
            LimbType::RightFoot => "PieDerecho",
        }
    }
}

// Configuración eficiente basada en datos reales BLE
#[derive(Debug, Clone)]
pub struct SimpleDetectionConfig {
    // Factores de escala corregidos basados en datos reales
    pub acc_scale: f32,      // 1000.0 basado en datos reales
    pub gyro_scale: f32,     // 250.0 basado en datos reales
    
    // Umbrales de detección ajustados
    pub slap_min_acc: f32,       // 1.5g para bofetadas (manos)
    pub slap_min_gyro: f32,      // 30°/s para bofetadas
    pub kick_min_acc: f32,       // 2.0g para patadas (pies)
    pub kick_max_gyro: f32,      // 20°/s máximo para patadas (movimiento más estable)
    pub kick_min_acc_z: f32,     // -0.5g mínimo en Z para patadas hacia abajo
    
    // Velocidades base realistas por extremidad
    pub hand_base_velocity: f32,  // 10.0 m/s para manos
    pub foot_base_velocity: f32,  // 15.0 m/s para pies
    
    // Factores antropométricos científicos
    pub hand_mass_percentage: f32, // 2.7% del peso corporal (Dempster 1955)
    pub foot_mass_percentage: f32, // 6.2% del peso corporal (Dempster 1955)
    pub joint_stiffness_factor: f32, // 1.8 factor de rigidez articular
    
    // Sistema de cooldown para evitar eventos duplicados
    pub cooldown_ms: u64, // Tiempo mínimo entre eventos en milisegundos
}

impl Default for SimpleDetectionConfig {
    fn default() -> Self {
        Self {
            // Factores de escala corregidos
            acc_scale: 1000.0,
            gyro_scale: 250.0,
            
            // Umbrales ajustados basados en datos reales del dispositivo
            slap_min_acc: 0.8,    // Era 1.5g - Reducido para detectar movimientos normales
            slap_min_gyro: 3.0,   // Era 30°/s - Reducido drasticamente
            kick_min_acc: 1.0,    // Era 2.0g - Reducido para pies
            kick_max_gyro: 10.0,  // Era 20°/s - Reducido
            kick_min_acc_z: -0.3, // Era -0.5g - Menos restrictivo
            
            // Velocidades base
            hand_base_velocity: 10.0,
            foot_base_velocity: 15.0,
            
            // Antropometría
            hand_mass_percentage: 0.027,
            foot_mass_percentage: 0.062,
            joint_stiffness_factor: 1.8,
            
            // Sistema de cooldown
            cooldown_ms: 500, // 500ms entre eventos para evitar duplicados
        }
    }
}

// Información del competidor
#[derive(Debug, Clone)]
pub struct CompetitorInfo {
    pub id: u8,
    pub name: String,
    pub weight: f32, // kg
}

// Detector ultra-simple para sistema por turnos
pub struct SimpleEventDetector {
    config: SimpleDetectionConfig,
    competitor_info: Option<CompetitorInfo>,
    last_event_time: u64, // Timestamp del último evento detectado
}

impl SimpleEventDetector {
    pub fn new() -> Self {
        Self {
            config: SimpleDetectionConfig::default(),
            competitor_info: None,
            last_event_time: 0, // Inicializar en 0
        }
    }

    // Asignar información del competidor
    pub fn set_competitor_info(&mut self, info: CompetitorInfo) {
        self.competitor_info = Some(info);
    }

    pub fn detect_event(&mut self, data: &ImuData) -> Option<SimpleCombatEvent> {
        let competitor = self.competitor_info.as_ref()?;
        let limb_type = LimbType::from_id(data.limb_id)?;

        // Sistema de cooldown para evitar eventos duplicados
        let current_time = data.timestamp;
        if current_time - self.last_event_time < self.config.cooldown_ms {
            return None; // Evento demasiado pronto, ignorar
        }

        // Convertir datos del sensor a unidades físicas
        let acc_x = data.acc_x as f32 / self.config.acc_scale;
        let acc_y = data.acc_y as f32 / self.config.acc_scale;
        let acc_z = data.acc_z as f32 / self.config.acc_scale;
        
        let gyro_x = data.gyro_x as f32 / self.config.gyro_scale;
        let gyro_y = data.gyro_y as f32 / self.config.gyro_scale;
        let gyro_z = data.gyro_z as f32 / self.config.gyro_scale;

        // Calcular magnitudes
        let acc_magnitude = (acc_x * acc_x + acc_y * acc_y + acc_z * acc_z).sqrt();
        let gyro_magnitude = (gyro_x * gyro_x + gyro_y * gyro_y + gyro_z * gyro_z).sqrt();

        // CRÍTICO: Sin logging aquí - Esta función se ejecuta a 200Hz
        // Logging eliminado para máximo rendimiento

        // Detección específica por tipo de extremidad
        let (event_type, confidence) = match limb_type {
            LimbType::LeftHand | LimbType::RightHand => {
                // Detección de bofetadas (manos)
                if acc_magnitude >= self.config.slap_min_acc && gyro_magnitude >= self.config.slap_min_gyro {
                    let confidence = ((acc_magnitude - self.config.slap_min_acc) / 2.0 + 
                                    (gyro_magnitude - self.config.slap_min_gyro) / 50.0).min(1.0);
                    ("slap", confidence)
                } else {
                    return None;
                }
            },
            LimbType::LeftFoot | LimbType::RightFoot => {
                // Detección de patadas hacia abajo (pies)
                if acc_magnitude >= self.config.kick_min_acc && 
                   acc_z < self.config.kick_min_acc_z && 
                   gyro_magnitude <= self.config.kick_max_gyro {
                    let confidence = ((acc_magnitude - self.config.kick_min_acc) / 3.0 + 
                                    (self.config.kick_min_acc_z - acc_z) / 1.0).min(1.0);
                    ("kickdown", confidence)
                } else {
                    return None;
                }
            }
        };

        // Calcular velocidad realista basada en la extremidad y intensidad
        let base_velocity = match limb_type {
            LimbType::LeftHand | LimbType::RightHand => self.config.hand_base_velocity,
            LimbType::LeftFoot | LimbType::RightFoot => self.config.foot_base_velocity,
        };
        
        let intensity_factor = (acc_magnitude / 2.0).min(2.0); // Factor de intensidad entre 1.0 y 2.0
        let velocity = base_velocity * intensity_factor;

        // Calcular aceleración en m/s² (conversión de g a m/s²)
        let acceleration = acc_magnitude * 9.81;

        // Calcular fuerza usando masa antropométrica
        let limb_mass_percentage = match limb_type {
            LimbType::LeftHand | LimbType::RightHand => self.config.hand_mass_percentage,
            LimbType::LeftFoot | LimbType::RightFoot => self.config.foot_mass_percentage,
        };
        
        let limb_mass = competitor.weight * limb_mass_percentage;
        let force = limb_mass * acceleration * self.config.joint_stiffness_factor;

        info!(event_type = %event_type, velocity = velocity, acceleration = acceleration, force = force,
              "🥊 Evento de combate detectado");

        // Actualizar timestamp del último evento para cooldown
        self.last_event_time = current_time;

        Some(SimpleCombatEvent {
            event_type: event_type.to_string(),
            limb_name: limb_type.name().to_string(),
            fighter_id: format!("fighter_{}", competitor.id),
            competitor_name: competitor.name.clone(),
            velocity: Some(velocity),
            acceleration: Some(acceleration),
            force: Some(force),
            timestamp: data.timestamp,
            confidence,
        })
    }
}

// Singleton para el adaptador BLE - evita conflictos de múltiples adaptadores
static BLE_ADAPTER: OnceLock<Arc<Mutex<Option<Adapter>>>> = OnceLock::new();

// Estado global para dispositivos conectados, sus tareas y referencias BLE
static CONNECTED_DEVICES: OnceLock<Arc<Mutex<HashMap<String, String>>>> = OnceLock::new();
static DEVICE_TASKS: OnceLock<Arc<Mutex<HashMap<String, JoinHandle<()>>>>> = OnceLock::new();
static DEVICE_REFERENCES: OnceLock<Arc<Mutex<HashMap<String, Device>>>> = OnceLock::new();

// Función para obtener el adaptador singleton
async fn get_ble_adapter() -> Result<Adapter, String> {
    let adapter_lock = BLE_ADAPTER.get_or_init(|| Arc::new(Mutex::new(None)));
    
    // Verificar si ya tenemos un adaptador válido
    {
        let adapter_guard = adapter_lock.lock().unwrap();
        if let Some(ref adapter) = *adapter_guard {
            // Reutilizar adaptador existente
            return Ok(adapter.clone());
        }
    }
    
    // Crear nuevo adaptador si no existe
    let new_adapter = Adapter::default().await
        .ok_or_else(|| "No se encontró adaptador BLE".to_string())?;
    
    // Guardar el nuevo adaptador
    {
        let mut adapter_guard = adapter_lock.lock().unwrap();
        *adapter_guard = Some(new_adapter.clone());
    }
    
    debug!("🔧 Adaptador BLE singleton inicializado");
    Ok(new_adapter)
}

// Función helper para obtener el estado de dispositivos conectados
fn get_connected_devices_state() -> Arc<Mutex<HashMap<String, String>>> {
    CONNECTED_DEVICES.get_or_init(|| {
        Arc::new(Mutex::new(HashMap::new()))
    }).clone()
}

// Función para obtener el estado de tareas de dispositivos
fn get_device_tasks_state() -> Arc<Mutex<HashMap<String, JoinHandle<()>>>> {
    DEVICE_TASKS.get_or_init(|| {
        Arc::new(Mutex::new(HashMap::new()))
    }).clone()
}

// Función para obtener las referencias de dispositivos BLE
fn get_device_references_state() -> Arc<Mutex<HashMap<String, Device>>> {
    DEVICE_REFERENCES.get_or_init(|| {
        Arc::new(Mutex::new(HashMap::new()))
    }).clone()
}

// Función para parsear datos BLE
fn parse_imu_data(data: &[u8], timestamp: u64) -> Option<ImuData> {
    if data.len() < 14 {
        return None;
    }

    Some(ImuData {
        limb_id: data[0],
        battery_level: data[1],
        acc_x: i16::from_le_bytes([data[2], data[3]]),
        acc_y: i16::from_le_bytes([data[4], data[5]]),
        acc_z: i16::from_le_bytes([data[6], data[7]]),
        gyro_x: i16::from_le_bytes([data[8], data[9]]),
        gyro_y: i16::from_le_bytes([data[10], data[11]]),
        gyro_z: i16::from_le_bytes([data[12], data[13]]),
        timestamp,
    })
}

// Función para escanear dispositivos BLE disponibles
#[tauri::command]
#[instrument]
pub async fn scan_available_devices() -> Result<Vec<BleDevice>, String> {
    info!("🔍 Iniciando escaneo de dispositivos BLE...");
    
    // Obtener adaptador singleton
    let adapter = get_ble_adapter().await?;
    
    // Esperar a que el adaptador esté disponible
    adapter.wait_available().await
        .map_err(|e| format!("Error esperando adaptador: {}", e))?;
    
    let mut scan = adapter.scan(&[]).await
        .map_err(|e| format!("Error iniciando escaneo: {}", e))?;
    
    let mut devices = Vec::with_capacity(8); // Pre-allocar para hasta 8 dispositivos (2 peleadores x 4 extremidades)
    let mut seen_devices = std::collections::HashSet::with_capacity(8);
    
    // Usar timeout con pin más eficiente
    let scan_timeout = tokio::time::sleep(Duration::from_secs(2));
    tokio::pin!(scan_timeout);
    
    loop {
        tokio::select! {
            _ = &mut scan_timeout => {
                info!(found_devices = devices.len(), "⏰ Escaneo BLE completado por timeout");
                break;
            }
            discovered = scan.next() => {
                match discovered {
                    Some(discovered_device) => {
                        let adv_data = &discovered_device.adv_data;
                        
                        // Early filtering - verificar nombre primero (más eficiente)
                        let local_name = match &adv_data.local_name {
                            Some(name) if name.contains("BH-") => name,
                            _ => continue, // Skip si no es nuestro dispositivo
                        };
                        
                        let device_id = discovered_device.device.id().to_string();
                        
                        // Evitar duplicados (early exit)
                        if !seen_devices.insert(device_id.clone()) {
                            continue; // Ya visto, skip
                        }
                        
                        // Determinar tipo de extremidad y su nombre traducido
                        let limb_type = match local_name.as_str() {
                            name if name.contains("ManoIzquierda") => Some("LeftHand".to_string()),
                            name if name.contains("ManoDerecha") => Some("RightHand".to_string()),
                            name if name.contains("PieIzquierdo") => Some("LeftFoot".to_string()),
                            name if name.contains("PieDerecho") => Some("RightFoot".to_string()),
                            _ => None,
                        };
                        
                        // Obtener el nombre traducido si existe un tipo de extremidad
                        let limb_name = limb_type.as_ref().and_then(|lt| {
                            match lt.as_str() {
                                "LeftHand" => Some(LimbType::LeftHand.name().to_string()),
                                "RightHand" => Some(LimbType::RightHand.name().to_string()),
                                "LeftFoot" => Some(LimbType::LeftFoot.name().to_string()),
                                "RightFoot" => Some(LimbType::RightFoot.name().to_string()),
                                _ => None,
                            }
                        });
                        
                        let ble_device = BleDevice {
                            id: device_id.clone(),
                            name: local_name.clone(),
                            address: device_id,
                            limb_type,
                            limb_name,
                            rssi: discovered_device.rssi,
                            is_connectable: adv_data.is_connectable,
                        };
                        
                        info!(device_name = %local_name, device_id = %ble_device.id, 
                              devices_found = devices.len() + 1,
                              "📱 Dispositivo BLE encontrado");
                        devices.push(ble_device);
                    }
                    None => {
                        error!("❌ Error en el stream de escaneo BLE");
                        break;
                    }
                }
            }
        }
    }
    
    info!(devices_found = devices.len(), "✅ Escaneo BLE completado");
    Ok(devices)
}

// Función coordinadora para conectar a un dispositivo específico
pub async fn connect_to_specific_device<R: tauri::Runtime>(
    app_handle: Arc<AppHandle<R>>,
    device_id: String,
) -> Result<(), String> {
    info!(device_id = %device_id, "🔗 Conectando dispositivo BLE");
    
    // 1. Buscar y encontrar el dispositivo BLE
    let (target_device, device_name) = find_ble_device_by_id(&device_id).await?;
    
    // 2. Determinar tipo de extremidad usando patrón mejorado
    let limb_type = determine_limb_type_by_pattern(&device_name);
    
    // 3. Registrar dispositivo como conectado (sin competidor)
    register_device_without_competitor(&device_id, &device_name);
    
    // 4. Configurar detector básico
    let detector = setup_basic_detector(limb_type);
    
    // 5. Almacenar referencia del dispositivo BLE
    let device_references = get_device_references_state();
    let mut references = device_references.lock().unwrap();
    references.insert(device_id.clone(), target_device.clone());
    drop(references);
    
    // 6. Lanzar tarea de manejo del dispositivo
    let task = spawn_device_handler(target_device, limb_type, detector, app_handle, device_id.clone());
    let device_tasks = get_device_tasks_state();
    let mut tasks = device_tasks.lock().unwrap();
    tasks.insert(device_id, task);
    
    Ok(())
}

// Función para desconectar de un dispositivo
pub async fn disconnect_from_device(device_id: String) -> Result<(), String> {
    info!(device_id = %device_id, "🔌 Desconectando dispositivo BLE");
    
    // Desconectar dispositivo BLE apropiadamente
    let device_to_disconnect = {
        let device_references = get_device_references_state();
        let mut references = device_references.lock().unwrap();
        references.remove(&device_id)
    };
    
    if let Some(device) = device_to_disconnect {
        // Obtener adaptador y desconectar
        if let Ok(adapter) = get_ble_adapter().await {
            if let Err(e) = adapter.disconnect_device(&device).await {
                warn!(device_id = %device_id, error = %e, "⚠️ Error desconectando dispositivo BLE, continuando...");
            } else {
                info!(device_id = %device_id, "🔌 Dispositivo BLE desconectado apropiadamente");
            }
        }
    }
    
    // Cancelar la tarea del dispositivo si existe
    let device_tasks = get_device_tasks_state();
    let mut tasks = device_tasks.lock().unwrap();
    if let Some(task_handle) = tasks.remove(&device_id) {
        task_handle.abort();
        info!(device_id = %device_id, "🛑 Tarea del dispositivo cancelada");
    }
    
    // Remover de la lista de conectados
    let connected_devices = get_connected_devices_state();
    let mut devices = connected_devices.lock().unwrap();
    devices.remove(&device_id);
    
    info!(device_id = %device_id, "✅ Dispositivo BLE desconectado completamente");
    Ok(())
}

// Función para desconectar todos los dispositivos
pub async fn disconnect_all_devices() -> Result<(), String> {
    info!("🔌 Desconectando todos los dispositivos BLE");
    
    // Obtener lista de dispositivos conectados
    let connected_devices = get_connected_devices_state();
    let device_ids: Vec<String> = {
        let devices = connected_devices.lock().unwrap();
        devices.keys().cloned().collect()
    };
    
    if device_ids.is_empty() {
        info!("ℹ️ No hay dispositivos conectados para desconectar");
        return Ok(());
    }
    
    info!(device_count = device_ids.len(), "🔌 Desconectando {} dispositivos", device_ids.len());
    
    // Desconectar todos los dispositivos BLE apropiadamente
    let devices_to_disconnect = {
        let device_references = get_device_references_state();
        let mut references = device_references.lock().unwrap();
        references.drain().collect::<Vec<(String, Device)>>()
    };
    
    if let Ok(adapter) = get_ble_adapter().await {
        for (device_id, device) in devices_to_disconnect {
            if let Err(e) = adapter.disconnect_device(&device).await {
                warn!(device_id = %device_id, error = %e, "⚠️ Error desconectando dispositivo BLE");
            } else {
                info!(device_id = %device_id, "🔌 Dispositivo BLE desconectado apropiadamente");
            }
        }
    }
    
    // Cancelar todas las tareas
    let device_tasks = get_device_tasks_state();
    let mut tasks = device_tasks.lock().unwrap();
    for device_id in &device_ids {
        if let Some(task_handle) = tasks.remove(device_id) {
            task_handle.abort();
            info!(device_id = %device_id, "🛑 Tarea del dispositivo cancelada");
        }
    }
    
    // Limpiar lista de dispositivos conectados
    let mut devices = connected_devices.lock().unwrap();
    devices.clear();
    
    info!("✅ Todos los dispositivos BLE desconectados completamente");
    Ok(())
}

// Función para obtener lista de dispositivos conectados
#[tauri::command]
pub async fn get_connected_devices_list() -> Result<Vec<String>, String> {
    let connected_devices = get_connected_devices_state();
    let devices = connected_devices.lock().unwrap();
    Ok(devices.keys().cloned().collect())
}

// Manejo simplificado de periférico - Función coordinadora principal
async fn handle_simple_peripheral<R: tauri::Runtime>(
    device: Device,
    limb_type: LimbType,
    detector: Arc<Mutex<SimpleEventDetector>>,
    app_handle: Arc<AppHandle<R>>,
) -> Result<(), String> {
    // 1. Establecer conexión BLE
    let _adapter = establish_ble_connection(&device).await?;
    // 2. Descubrir servicios y características
    let notification_char = discover_notification_characteristic(&device).await?;
    
    // 3. Suscribirse a notificaciones
    info!(limb_type = ?limb_type, "📡 Suscribiéndose a notificaciones BLE");
    
    let notification_stream = notification_char.notify().await
        .map_err(|e| {
            let error_msg = format!("Error suscribiendo a notificaciones para {:?}: {}", limb_type, e);
            error!(limb_type = ?limb_type, error = %e, "❌ Error en suscripción BLE");
            error_msg
        })?;
    
    info!(limb_type = ?limb_type, "🔔 Notificaciones BLE configuradas");
    
    // 4. Procesar notificaciones en loop
    process_notification_stream(notification_stream, limb_type, detector, app_handle).await;
    
    info!(limb_type = ?limb_type, "🔌 Conexión terminada");
    Ok(())
}

/// Establece la conexión BLE con el dispositivo
#[instrument(skip(device))]
async fn establish_ble_connection(device: &Device) -> Result<Adapter, String> {
    debug!("Iniciando conexión BLE");
    
    // Obtener adaptador singleton
    let adapter = get_ble_adapter().await?;
    
    // Conectar al dispositivo usando el adaptador
    adapter.connect_device(device).await
        .map_err(|e| format!("Error conectando: {}", e))?;
    
    info!("Conexión BLE establecida exitosamente");
    
    // Esperar un momento para que se establezca la conexión GATT
    tokio::time::sleep(Duration::from_secs(1)).await;
    
    Ok(adapter)
}

/// Descubre y retorna la característica de notificación
#[instrument(skip(device))]
async fn discover_notification_characteristic(device: &Device) -> Result<Characteristic, String> {
    // Obtener servicios directamente del dispositivo
    let services = device.services().await
        .map_err(|e| format!("Error obteniendo servicios: {}", e))?;
    
    debug!(services_count = services.len(), "Servicios BLE descubiertos");
    
    // Buscar característica con notificaciones
    for service in &services {
        let characteristics = service.characteristics().await
            .map_err(|e| format!("Error obteniendo características: {}", e))?;
        
        for characteristic in characteristics {
            let properties = characteristic.properties().await;
            
            if let Ok(props) = properties {
                if props.notify {
                    info!(uuid = %characteristic.uuid(), "Característica de notificación encontrada");
                    return Ok(characteristic);
                }
            }
        }
    }
    
    let error_msg = "No se encontró característica con notificaciones".to_string();
    error!("{}", error_msg);
    Err(error_msg)
}

/// Procesa el stream de notificaciones en un loop
#[instrument(skip(notification_stream, detector, app_handle))]
async fn process_notification_stream<R: tauri::Runtime>(
    mut notification_stream: impl Stream<Item = Result<Vec<u8>, bluest::Error>> + Unpin,
    limb_type: LimbType,
    detector: Arc<Mutex<SimpleEventDetector>>,
    app_handle: Arc<AppHandle<R>>,
) {
    debug!(limb_type = ?limb_type, "Iniciando procesamiento de notificaciones");
    
    while let Some(data_result) = notification_stream.next().await {
        match data_result {
            Ok(data_bytes) => {
                // CRÍTICO: Sin logging aquí para máximo rendimiento (200Hz)
                process_notification_data(data_bytes, limb_type, &detector, &app_handle);
            }
            Err(e) => {
                error!(limb_type = ?limb_type, error = %e, "Error en notificación BLE");
                break;
            }
        }
    }
}

/// Procesa los datos de notificación BLE recibidos
/// CRÍTICO: Esta función se ejecuta a 200Hz - SIN LOGGING para máximo rendimiento
fn process_notification_data<R: tauri::Runtime>(
    data_bytes: Vec<u8>,
    limb_type: LimbType,
    detector: &Arc<Mutex<SimpleEventDetector>>,
    app_handle: &Arc<tauri::AppHandle<R>>,
) {
    const EXPECTED_IMU_SIZE: usize = 14;
    
    // Validación rápida sin logging
    if data_bytes.len() != EXPECTED_IMU_SIZE {
        return; // Silencioso para máximo rendimiento
    }
    
    // Generar timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    
    // Parsear datos IMU
    let imu_data = match parse_imu_data(&data_bytes, timestamp) {
        Some(data) => data,
        None => return, // Silencioso para máximo rendimiento
    };
    
    // Detectar eventos de combate
    let event = match detector.lock().unwrap().detect_event(&imu_data) {
        Some(event) => event,
        None => return, // No hay evento, continuar
    };
    
    // Solo logging para eventos detectados (menos frecuente)
    info!(limb_type = ?limb_type, event_type = %event.event_type, 
          "⚔️ Evento de combate detectado");
    
    // Verificar y actualizar estadísticas máximas
    check_and_update_max_stats(&event, app_handle);
    
    // Emitir evento al frontend
    if let Err(e) = app_handle.emit("simple-combat-event", &event) {
        // Solo errores críticos se loggean
        error!(limb_type = ?limb_type, error = %e, "Error emitiendo evento");
    }
    // También transmitir por WebSocket a clientes conectados
    let message = serde_json::json!({
        "viewType": "stats",
        "data": event,
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64,
    });
    ws_broadcast(&message);
}

// Función coordinadora para conectar dispositivo con información del competidor
pub async fn connect_to_device_with_competitor<R: tauri::Runtime>(
    app_handle: Arc<AppHandle<R>>,
    device_id: String,
    competitor_id: u8,
    competitor_name: String,
    competitor_weight: f32,
) -> Result<(), String> {
    info!(device_id = %device_id, competitor_name = %competitor_name, "🔗 Conectando dispositivo para competidor");
    
    // 1. Crear información del competidor
    let competitor_info = create_competitor_info(competitor_id, competitor_name.clone(), competitor_weight);
    
    // 2. Buscar y encontrar el dispositivo BLE
    let (target_device, device_name) = find_ble_device_by_id(&device_id).await?;
    
    // 3. Determinar tipo de extremidad
    let limb_type = determine_limb_type_by_pattern(&device_name);
    
    // 4. Registrar dispositivo como conectado
    register_connected_device(&device_id, &device_name, &competitor_name);
    
    // 5. Configurar detector con información del competidor
    let detector = setup_competitor_detector(competitor_info, &competitor_name, limb_type);
    
    // 6. Almacenar referencia del dispositivo BLE
    let device_references = get_device_references_state();
    let mut references = device_references.lock().unwrap();
    references.insert(device_id.clone(), target_device.clone());
    drop(references);
    
    // 7. Lanzar tarea de manejo del dispositivo
    let task = spawn_device_handler(target_device, limb_type, detector, app_handle, device_id.clone());
    let device_tasks = get_device_tasks_state();
    let mut tasks = device_tasks.lock().unwrap();
    tasks.insert(device_id, task);
    
    Ok(())
}

/// Crea la información del competidor
fn create_competitor_info(id: u8, name: String, weight: f32) -> CompetitorInfo {
    CompetitorInfo {
        id,
        name,
        weight,
    }
}

/// Determina el tipo de extremidad basado en el nombre del dispositivo
/* fn determine_limb_type(device_name: &str) -> LimbType {
    match device_name {
        name if name.contains("ManoIzquierda") => LimbType::LeftHand,
        name if name.contains("ManoDerecha") => LimbType::RightHand,
        name if name.contains("PieIzquierdo") => LimbType::LeftFoot,
        name if name.contains("PieDerecho") => LimbType::RightFoot,
        _ => LimbType::LeftHand, // Default
    }
} */

/// Registra el dispositivo como conectado en el estado global
fn register_connected_device(device_id: &str, device_name: &str, competitor_name: &str) {
    let connected_devices = get_connected_devices_state();
    let mut devices = connected_devices.lock().unwrap();
    devices.insert(device_id.to_string(), format!("{} ({})", device_name, competitor_name));
}

/// Configura el detector con información del competidor
fn setup_competitor_detector(
    competitor_info: CompetitorInfo,
    competitor_name: &str,
    limb_type: LimbType,
) -> Arc<Mutex<SimpleEventDetector>> {
    info!(competitor_name = %competitor_name, limb_type = ?limb_type, "🔧 Configurando detector para competidor");
    let detector = Arc::new(Mutex::new(SimpleEventDetector::new()));
    detector.lock().unwrap().set_competitor_info(competitor_info);
    detector
}

/// Busca y encuentra un dispositivo BLE por su ID
async fn find_ble_device_by_id(device_id: &str) -> Result<(Device, String), String> {
    // Obtener adaptador singleton
    let adapter = get_ble_adapter().await?;
    
    // Iniciar escaneo
    debug!(device_id = %device_id, "🔍 Buscando dispositivo BLE");
    let mut scan = adapter.scan(&[]).await
        .map_err(|e| format!("Error iniciando escaneo: {}", e))?;
    
    // Configurar timeout
    let scan_timeout = tokio::time::sleep(Duration::from_secs(5));
    tokio::pin!(scan_timeout);
    
    // Buscar dispositivo en el stream
    loop {
        tokio::select! {
            _ = &mut scan_timeout => {
                warn!(device_id = %device_id, "⏰ Timeout buscando dispositivo BLE");
                return Err(format!("Dispositivo {} no encontrado (timeout)", device_id));
            }
            discovered = scan.next() => {
                match discovered {
                    Some(discovered_device) => {
                        if discovered_device.device.id().to_string() == device_id {
                            let device_name = discovered_device.adv_data.local_name
                                .map(|name| name.to_string())
                                .unwrap_or_else(|| "Dispositivo Desconocido".to_string());
                            
                            info!(device_name = %device_name, device_id = %device_id, "✅ Dispositivo BLE encontrado");
                            return Ok((discovered_device.device, device_name));
                        }
                    }
                    None => {
                        error!("❌ Error en el stream de escaneo BLE");
                        return Err("Error en el stream de escaneo".to_string());
                    }
                }
            }
        }
    }
}

/// Lanza una tarea para manejar el dispositivo BLE
fn spawn_device_handler<R: tauri::Runtime>(
    target_device: Device,
    limb_type: LimbType,
    detector: Arc<Mutex<SimpleEventDetector>>,
    app_handle: Arc<AppHandle<R>>,
    device_id: String,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        if let Err(e) = handle_simple_peripheral(target_device, limb_type, detector, app_handle.clone()).await {
            error!(device_id = %device_id, error = %e, "Error manejando dispositivo BLE");
            
            // Limpiar estado si hay error
            let connected_devices = get_connected_devices_state();
            let mut devices = connected_devices.lock().unwrap();
            devices.remove(&device_id);
            drop(devices);
            
            // Remover referencia del dispositivo BLE
            let device_references = get_device_references_state();
            let mut references = device_references.lock().unwrap();
            references.remove(&device_id);
        }
    })
}

/// Determina el tipo de extremidad usando patrón mejorado con ble_name_pattern
fn determine_limb_type_by_pattern(device_name: &str) -> LimbType {
    [LimbType::LeftHand, LimbType::RightHand, LimbType::LeftFoot, LimbType::RightFoot]
        .iter()
        .find(|limb| device_name.contains(limb.ble_name_pattern()))
        .copied()
        .unwrap_or(LimbType::LeftHand) // Default
}

/// Registra el dispositivo como conectado sin información de competidor
fn register_device_without_competitor(device_id: &str, device_name: &str) {
    let connected_devices = get_connected_devices_state();
    let mut devices = connected_devices.lock().unwrap();
    devices.insert(device_id.to_string(), device_name.to_string());
}

/// Configura un detector básico sin información de competidor
fn setup_basic_detector(limb_type: LimbType) -> Arc<Mutex<SimpleEventDetector>> {
    debug!(limb_type = ?limb_type, "🔧 Configurando detector básico");
    Arc::new(Mutex::new(SimpleEventDetector::new()))
}

/// Función para detectar y actualizar nuevos máximos
fn check_and_update_max_stats<R: tauri::Runtime>(
    event: &SimpleCombatEvent,
    app_handle: &AppHandle<R>,
) {
    let store = MAX_STATS_STORE.clone();
    let mut stats_map = match store.lock() {
        Ok(map) => map,
        Err(e) => {
            error!(error = %e, "Error accediendo al store de estadísticas");
            return;
        }
    };

    // Obtener o crear estadísticas del peleador
    let stats = stats_map.entry(event.fighter_id.clone()).or_insert(CompetitorMaxStats {
        fighter_id: event.fighter_id.clone(),
        competitor_name: event.competitor_name.clone(),
        max_force: 0.0,
        max_velocity: 0.0,
        max_acceleration: 0.0,
    });

    let mut new_records = Vec::new();

    // Verificar nuevo máximo de fuerza
    if let Some(force) = event.force {
        if force > stats.max_force {
            stats.max_force = force;
            new_records.push("force");
            info!(fighter_id = %event.fighter_id, new_max_force = force, 
                  "🏆 NUEVO RÉCORD DE FUERZA");
        }
    }

    // Verificar nuevo máximo de velocidad
    if let Some(velocity) = event.velocity {
        if velocity > stats.max_velocity {
            stats.max_velocity = velocity;
            new_records.push("velocity");
            info!(fighter_id = %event.fighter_id, new_max_velocity = velocity, 
                  "🏆 NUEVO RÉCORD DE VELOCIDAD");
        }
    }

    // Verificar nuevo máximo de aceleración
    if let Some(acceleration) = event.acceleration {
        if acceleration > stats.max_acceleration {
            stats.max_acceleration = acceleration;
            new_records.push("acceleration");
            info!(fighter_id = %event.fighter_id, new_max_acceleration = acceleration, 
                  "🏆 NUEVO RÉCORD DE ACELERACIÓN");
        }
    }

    // Si hay nuevos récords, enviar notificaciones
    if !new_records.is_empty() {
        let stats_clone = stats.clone();
        
        // 1. Enviar evento al frontend
        let record_event = serde_json::json!({
            "type": "new_max_record",
            "fighter_id": event.fighter_id,
            "records": new_records,
            "stats": stats_clone,
            "triggering_event": event
        });

        if let Err(e) = app_handle.emit("new-max-record", &record_event) {
            error!(error = %e, "Error emitiendo evento de nuevo récord");
        }

        // 2. Enviar por WebSocket
        let ws_message = serde_json::json!({
            "type": "max_stats_update",
            "fighter_id": event.fighter_id,
            "data": stats_clone,
            "new_records": new_records,
            "timestamp": event.timestamp,
            "view_type": "stats"
        });
        ws_broadcast(&ws_message);

        info!(fighter_id = %event.fighter_id, records = ?new_records, 
              "📡 Nuevos récords enviados por WebSocket y evento");
    }
}

/// Comando para obtener estadísticas máximas actuales
#[tauri::command]
pub fn get_current_max_stats(fighter_id: Option<String>) -> Result<serde_json::Value, String> {
    let store = MAX_STATS_STORE.clone();
    let stats_map = store.lock()
        .map_err(|e| format!("Error accediendo al store: {}", e))?;

    match fighter_id {
        Some(id) => {
            if let Some(stats) = stats_map.get(&id) {
                Ok(serde_json::to_value(stats).unwrap())
            } else {
                Err(format!("No se encontraron estadísticas para el peleador {}", id))
            }
        }
        None => {
            // Devolver todas las estadísticas
            let all_stats: Vec<&CompetitorMaxStats> = stats_map.values().collect();
            Ok(serde_json::to_value(all_stats).unwrap())
        }
    }
}

/// Comando para resetear estadísticas máximas
#[tauri::command]
pub fn reset_max_stats() -> Result<String, String> {
    let store = MAX_STATS_STORE.clone();
    let mut stats_map = store.lock()
        .map_err(|e| format!("Error accediendo al store: {}", e))?;

    stats_map.clear();

    // Notificar reset por WebSocket
    let reset_message = serde_json::json!({
        "type": "max_stats_reset",
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    });
    ws_broadcast(&reset_message);

    info!("🔄 Estadísticas máximas reseteadas");
    Ok("Estadísticas máximas reseteadas exitosamente".to_string())
}
