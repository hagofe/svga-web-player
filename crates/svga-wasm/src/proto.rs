// Proto module - includes generated protobuf code
// This file will be populated by prost-build during compilation

#[allow(clippy::all)]
pub mod svga {
    include!(concat!(env!("OUT_DIR"), "/com.opensource.svga.rs"));
}

// Re-export for convenience
pub use svga::*;
