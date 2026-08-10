//! SVGA WASM Parser
//!
//! High-performance SVGA parser implemented in Rust for WebAssembly.
//! Provides 3x-5x faster parsing compared to JavaScript implementation.

mod parser;
mod path_compiler;
mod proto;
mod raw_transfer;

pub use parser::*;
pub use path_compiler::*;
pub use raw_transfer::*;
use wasm_bindgen::prelude::*;

// Initialize panic hook for better error messages in console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Log to browser console
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[allow(unused_macros)]
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[allow(unused_imports)]
pub(crate) use console_log;
