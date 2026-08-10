use std::io::Result;

fn main() -> Result<()> {
    // Get the output directory from environment
    let out_dir = std::env::var("OUT_DIR").unwrap();

    // Compile protobuf definitions
    prost_build::Config::new()
        .out_dir(&out_dir)
        .compile_protos(&["proto/svga.proto"], &["proto/"])?;

    println!("cargo:rerun-if-changed=proto/svga.proto");
    Ok(())
}
