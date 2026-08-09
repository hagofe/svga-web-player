//! Raw Transfer Module
//!
//! Zero-copy frame data transfer using #[repr(C)] structures.
//! JavaScript can read these structures directly from WASM linear memory.

use std::cell::RefCell;
use wasm_bindgen::prelude::*;

// ============================================================================
// #[repr(C)] Data Structures - Stable Memory Layout
// ============================================================================

/// Raw frame data with stable memory layout.
/// JS reads this directly from WASM memory using DataView.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct RawFrame {
    /// Frame alpha (opacity)
    pub alpha: f32,
    /// Layout: x, y, width, height
    pub layout_x: f32,
    pub layout_y: f32,
    pub layout_width: f32,
    pub layout_height: f32,
    /// Transform matrix: a, b, c, d, tx, ty
    pub transform_a: f32,
    pub transform_b: f32,
    pub transform_c: f32,
    pub transform_d: f32,
    pub transform_tx: f32,
    pub transform_ty: f32,
    /// Clip path string (offset and length in string buffer)
    pub clip_path_offset: u32,
    pub clip_path_len: u32,
    /// Shapes array (offset and count)
    pub shapes_offset: u32,
    pub shapes_count: u32,
}

/// Raw shape data with stable memory layout.
/// Type-specific data is stored after the base struct.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct RawShape {
    /// Shape type: 0=Shape, 1=Rect, 2=Ellipse, 3=Keep
    pub shape_type: u8,
    /// Padding for alignment
    pub _pad: [u8; 3],
    /// Transform matrix
    pub transform_a: f32,
    pub transform_b: f32,
    pub transform_c: f32,
    pub transform_d: f32,
    pub transform_tx: f32,
    pub transform_ty: f32,
    /// Style data offset (0 if no styles)
    pub styles_offset: u32,
    /// Type-specific data (union-like, interpretation depends on shape_type)
    /// For Shape: d_offset (u32), d_len (u32)
    /// For Rect: x, y, width, height, corner_radius (5 x f32)
    /// For Ellipse: x, y, radius_x, radius_y (4 x f32)
    pub data: [u32; 5],
}

/// Raw style data with stable memory layout.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct RawStyle {
    /// Flags for which fields are present
    /// bit 0: has_fill, bit 1: has_stroke, bit 2: has_stroke_width
    /// bit 3: has_line_cap, bit 4: has_line_join, bit 5: has_miter_limit
    /// bit 6: has_line_dash
    pub flags: u8,
    pub line_cap: u8,
    pub line_join: u8,
    pub line_dash_count: u8,
    /// Fill color (RGBA as f32)
    pub fill_r: f32,
    pub fill_g: f32,
    pub fill_b: f32,
    pub fill_a: f32,
    /// Stroke color (RGBA as f32)
    pub stroke_r: f32,
    pub stroke_g: f32,
    pub stroke_b: f32,
    pub stroke_a: f32,
    /// Stroke width
    pub stroke_width: f32,
    /// Miter limit
    pub miter_limit: f32,
    /// Line dash values offset in data buffer
    pub line_dash_offset: u32,
}

// Style flags
pub const STYLE_FLAG_HAS_FILL: u8 = 0b0000_0001;
pub const STYLE_FLAG_HAS_STROKE: u8 = 0b0000_0010;
pub const STYLE_FLAG_HAS_STROKE_WIDTH: u8 = 0b0000_0100;
pub const STYLE_FLAG_HAS_LINE_CAP: u8 = 0b0000_1000;
pub const STYLE_FLAG_HAS_LINE_JOIN: u8 = 0b0001_0000;
pub const STYLE_FLAG_HAS_MITER_LIMIT: u8 = 0b0010_0000;
pub const STYLE_FLAG_HAS_LINE_DASH: u8 = 0b0100_0000;

// Shape types
pub const SHAPE_TYPE_SHAPE: u8 = 0;
pub const SHAPE_TYPE_RECT: u8 = 1;
pub const SHAPE_TYPE_ELLIPSE: u8 = 2;
pub const SHAPE_TYPE_KEEP: u8 = 3;

// Frame Arena - Stores raw frame data in WASM linear memory
// Global frame arena for storing converted frame data.
// Uses thread_local for safety in WASM single-threaded environment.
thread_local! {
    static FRAME_ARENA: RefCell<FrameArena> = RefCell::new(FrameArena::new());
}

/// Arena for storing frame data that JS can read directly.
pub struct FrameArena {
    /// Frame data buffer
    frames: Vec<RawFrame>,
    /// Shape data buffer
    shapes: Vec<RawShape>,
    /// Style data buffer
    styles: Vec<RawStyle>,
    /// String buffer for clip_path and shape.d
    strings: Vec<u8>,
    /// Float buffer for line dash arrays
    floats: Vec<f32>,
}

impl FrameArena {
    pub fn new() -> Self {
        let mut styles = Vec::with_capacity(512);
            // Reserve index 0 for "no style" (so that offset 0 is null style)
            styles.push(RawStyle {
                flags: 0,
                line_cap: 0,
                line_join: 0,
                line_dash_count: 0,
                fill_r: 0.0,
                fill_g: 0.0,
                fill_b: 0.0,
                fill_a: 0.0,
                stroke_r: 0.0,
                stroke_g: 0.0,
                stroke_b: 0.0,
                stroke_a: 0.0,
                stroke_width: 0.0,
                miter_limit: 0.0,
                line_dash_offset: 0,
            });

        Self {
            frames: Vec::with_capacity(256),
            shapes: Vec::with_capacity(1024),
            styles,
            strings: Vec::with_capacity(4096),
            floats: Vec::with_capacity(256),
        }
    }

    /// Clear all arena data
    pub fn clear(&mut self) {
        self.frames.clear();
        self.shapes.clear();
        self.styles.clear();
        // Reserve index 0 again after clear
        self.styles.push(RawStyle {
            flags: 0,
            line_cap: 0,
            line_join: 0,
            line_dash_count: 0,
            fill_r: 0.0,
            fill_g: 0.0,
            fill_b: 0.0,
            fill_a: 0.0,
            stroke_r: 0.0,
            stroke_g: 0.0,
            stroke_b: 0.0,
            stroke_a: 0.0,
            stroke_width: 0.0,
            miter_limit: 0.0,
            line_dash_offset: 0,
        });
        self.strings.clear();
        self.floats.clear();
    }

    /// Get current number of shapes (used for calculating offset index)
    pub fn shapes_len(&self) -> u32 {
        self.shapes.len() as u32
    }

    /// Add a string to the string buffer, return (offset, len)
    pub fn add_string(&mut self, s: &str) -> (u32, u32) {
        let offset = self.strings.len() as u32;
        self.strings.extend_from_slice(s.as_bytes());
        (offset, s.len() as u32)
    }

    /// Add a style, return offset
    pub fn add_style(&mut self, style: RawStyle) -> u32 {
        let offset = self.styles.len() as u32;
        self.styles.push(style);
        offset
    }

    /// Add line dash values, return offset
    pub fn add_line_dash(&mut self, values: &[f32]) -> u32 {
        let offset = self.floats.len() as u32;
        self.floats.extend_from_slice(values);
        offset
    }

    /// Add a shape, return offset
    pub fn add_shape(&mut self, shape: RawShape) -> u32 {
        let offset = self.shapes.len() as u32;
        self.shapes.push(shape);
        offset
    }

    /// Add a frame, return offset
    pub fn add_frame(&mut self, frame: RawFrame) -> u32 {
        let offset = self.frames.len() as u32;
        self.frames.push(frame);
        offset
    }

    /// Get pointer to frames buffer
    pub fn frames_ptr(&self) -> *const RawFrame {
        self.frames.as_ptr()
    }

    /// Get pointer to shapes buffer
    pub fn shapes_ptr(&self) -> *const RawShape {
        self.shapes.as_ptr()
    }

    /// Get pointer to styles buffer
    pub fn styles_ptr(&self) -> *const RawStyle {
        self.styles.as_ptr()
    }

    /// Get pointer to strings buffer
    pub fn strings_ptr(&self) -> *const u8 {
        self.strings.as_ptr()
    }

    /// Get pointer to floats buffer
    pub fn floats_ptr(&self) -> *const f32 {
        self.floats.as_ptr()
    }
}

// ============================================================================
// WASM Exports for Memory Access
// ============================================================================

/// Get the WASM memory object for direct JS access
#[wasm_bindgen]
pub fn wasm_memory() -> JsValue {
    wasm_bindgen::memory()
}

/// Get pointer to frames buffer in arena
#[wasm_bindgen]
pub fn get_frames_ptr() -> u32 {
    FRAME_ARENA.with(|arena| arena.borrow().frames_ptr() as u32)
}

/// Get pointer to shapes buffer in arena
#[wasm_bindgen]
pub fn get_shapes_ptr() -> u32 {
    FRAME_ARENA.with(|arena| arena.borrow().shapes_ptr() as u32)
}

/// Get pointer to styles buffer in arena
#[wasm_bindgen]
pub fn get_styles_ptr() -> u32 {
    FRAME_ARENA.with(|arena| arena.borrow().styles_ptr() as u32)
}

/// Get pointer to strings buffer in arena
#[wasm_bindgen]
pub fn get_strings_ptr() -> u32 {
    FRAME_ARENA.with(|arena| arena.borrow().strings_ptr() as u32)
}

/// Get pointer to floats buffer in arena
#[wasm_bindgen]
pub fn get_floats_ptr() -> u32 {
    FRAME_ARENA.with(|arena| arena.borrow().floats_ptr() as u32)
}

/// Clear the frame arena
#[wasm_bindgen]
pub fn clear_frame_arena() {
    FRAME_ARENA.with(|arena| arena.borrow_mut().clear());
}

// ============================================================================
// Size Constants for JS
// ============================================================================

/// Size of RawFrame struct in bytes
#[wasm_bindgen]
pub fn raw_frame_size() -> u32 {
    std::mem::size_of::<RawFrame>() as u32
}

/// Size of RawShape struct in bytes
#[wasm_bindgen]
pub fn raw_shape_size() -> u32 {
    std::mem::size_of::<RawShape>() as u32
}

/// Size of RawStyle struct in bytes
#[wasm_bindgen]
pub fn raw_style_size() -> u32 {
    std::mem::size_of::<RawStyle>() as u32
}

// ============================================================================
// Arena Access Helper (for use by parser.rs)
// ============================================================================

/// Access the frame arena for writing
pub fn with_arena<F, R>(f: F) -> R
where
    F: FnOnce(&mut FrameArena) -> R,
{
    FRAME_ARENA.with(|arena| f(&mut arena.borrow_mut()))
}
