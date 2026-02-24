fn main() {
    // Tell cargo to re-run this build script (and thus recompile) when migrations change
    println!("cargo:rerun-if-changed=migrations");

    tauri_build::build()
}
