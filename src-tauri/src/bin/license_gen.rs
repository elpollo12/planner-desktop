use base64::{engine::general_purpose, Engine as _};
use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::process;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LicensePayload {
    id: String,
    customer: String,
    tenant: String,
    api_endpoint: String,
    issued_at: String,
    expiry: Option<String>,
    /// None = usuarios ilimitados
    max_users: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct License {
    payload: LicensePayload,
    signature: String,
}

fn print_usage() {
    eprintln!("Uso:");
    eprintln!("  license_gen --generate-keys");
    eprintln!("    Genera par de claves Ed25519 (license_priv.key + license_pub.key)");
    eprintln!();
    eprintln!("  license_gen --sign --customer \"Empresa\" --tenant \"empresa-slug\" --api-endpoint \"https://api.dplanner.com\"");
    eprintln!("              --max-users 10 [--expiry 2027-01-01 | --lifetime] [--unlimited] [--id LIC-001]");
    eprintln!("    Genera una licencia firmada");
    eprintln!();
    eprintln!("Opciones:");
    eprintln!("  --generate-keys              Genera un par de claves Ed25519");
    eprintln!("  --sign                       Genera y firma una licencia");
    eprintln!("  --customer <nombre>          Nombre del cliente");
    eprintln!("  --tenant <slug>              Slug del cliente en planner-sync (ej: pdvsa-occidente)");
    eprintln!("  --api-endpoint <url>         URL del servidor planner-sync del cliente");
    eprintln!("  --max-users <n>              Máximo de usuarios permitidos");
    eprintln!("  --unlimited                  Sin límite de usuarios (sobreescribe --max-users)");
    eprintln!("  --expiry <YYYY-MM-DD>        Fecha de expiración");
    eprintln!("  --lifetime                   Licencia sin expiración (de por vida)");
    eprintln!("  --id <id>                    ID de la licencia (default: auto-generado)");
    eprintln!("  --key <path>                 Ruta a la clave privada (default: license_priv.key)");
}

fn generate_keys() {
    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key: VerifyingKey = (&signing_key).into();

    // Save private key (32 bytes)
    fs::write("license_priv.key", signing_key.to_bytes())
        .expect("Error guardando clave privada");
    println!("Clave privada guardada: license_priv.key");

    // Save public key (32 bytes) — this goes into src-tauri/ for include_bytes!
    fs::write("license_pub.key", verifying_key.to_bytes())
        .expect("Error guardando clave pública");
    println!("Clave pública guardada: license_pub.key");

    println!();
    println!("IMPORTANTE:");
    println!("  1. Copia license_pub.key a src-tauri/license_pub.key");
    println!("  2. Guarda license_priv.key en un lugar seguro (NUNCA en el repo)");
    println!("  3. Agrega license_priv.key a .gitignore");
}

fn sign_license(args: &[String]) {
    let mut customer = String::new();
    let mut tenant = String::new();
    let mut api_endpoint = String::new();
    let mut max_users: Option<u32> = Some(1);
    let mut unlimited = false;
    let mut expiry: Option<String> = None;
    let mut lifetime = false;
    let mut id = String::new();
    let mut key_path = "license_priv.key".to_string();

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--customer" => {
                i += 1;
                customer = args.get(i).cloned().unwrap_or_default();
            }
            "--tenant" => {
                i += 1;
                tenant = args.get(i).cloned().unwrap_or_default();
            }
            "--api-endpoint" => {
                i += 1;
                api_endpoint = args.get(i).cloned().unwrap_or_default();
            }
            "--max-users" => {
                i += 1;
                if let Some(n) = args.get(i).and_then(|v| v.parse::<u32>().ok()) {
                    max_users = Some(n);
                }
            }
            "--unlimited" => {
                unlimited = true;
            }
            "--expiry" => {
                i += 1;
                expiry = args.get(i).cloned();
            }
            "--lifetime" => {
                lifetime = true;
            }
            "--id" => {
                i += 1;
                id = args.get(i).cloned().unwrap_or_default();
            }
            "--key" => {
                i += 1;
                key_path = args.get(i).cloned().unwrap_or_default();
            }
            _ => {}
        }
        i += 1;
    }

    if customer.is_empty() {
        eprintln!("Error: --customer es requerido");
        process::exit(1);
    }
    if tenant.is_empty() {
        eprintln!("Error: --tenant es requerido");
        process::exit(1);
    }
    if api_endpoint.is_empty() {
        eprintln!("Error: --api-endpoint es requerido");
        process::exit(1);
    }
    if !lifetime && expiry.is_none() {
        eprintln!("Error: debe especificar --expiry <fecha> o --lifetime");
        process::exit(1);
    }

    if lifetime {
        expiry = None;
    }
    if unlimited {
        max_users = None;
    }

    if id.is_empty() {
        id = format!("LIC-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap());
    }

    // Load private key
    let key_bytes = fs::read(&key_path)
        .unwrap_or_else(|e| {
            eprintln!("Error leyendo clave privada '{}': {}", key_path, e);
            process::exit(1);
        });

    if key_bytes.len() != 32 {
        eprintln!("Error: clave privada debe ser 32 bytes, tiene {}", key_bytes.len());
        process::exit(1);
    }

    let mut key_array = [0u8; 32];
    key_array.copy_from_slice(&key_bytes);
    let signing_key = SigningKey::from_bytes(&key_array);

    // Build payload
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let payload = LicensePayload {
        id: id.clone(),
        customer: customer.clone(),
        tenant: tenant.clone(),
        api_endpoint: api_endpoint.clone(),
        issued_at: today,
        expiry: expiry.clone(),
        max_users,
    };

    // Serialize and sign
    let payload_json = serde_json::to_string(&payload).expect("Error serializando payload");
    let signature = signing_key.sign(payload_json.as_bytes());
    let signature_b64 = general_purpose::STANDARD.encode(signature.to_bytes());

    let license = License {
        payload,
        signature: signature_b64,
    };

    // Encode full license as base64
    let license_json = serde_json::to_string(&license).expect("Error serializando licencia");
    let license_key = general_purpose::STANDARD.encode(license_json.as_bytes());

    println!("=== Licencia Generada ===");
    println!("ID:           {}", id);
    println!("Cliente:      {}", customer);
    println!("Tenant:       {}", tenant);
    println!("API Endpoint: {}", api_endpoint);
    match max_users {
        Some(n) => println!("Usuarios:     {}", n),
        None    => println!("Usuarios:     ILIMITADOS"),
    }
    if let Some(ref exp) = expiry {
        println!("Expira:       {}", exp);
    } else {
        println!("Expira:       DE POR VIDA");
    }
    println!();
    println!("=== Clave de Licencia (copiar completa) ===");
    println!("{}", license_key);
}

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        print_usage();
        process::exit(1);
    }

    if args.contains(&"--generate-keys".to_string()) {
        generate_keys();
    } else if args.contains(&"--sign".to_string()) {
        sign_license(&args[1..]);
    } else {
        print_usage();
        process::exit(1);
    }
}
