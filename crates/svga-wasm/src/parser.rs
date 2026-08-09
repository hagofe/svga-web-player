//! SVGA Parser
//!
//! High-performance SVGA file parser that decodes protobuf data
//! and extracts images for JavaScript ImageBitmap creation.

use crate::proto;
use crate::raw_transfer::{
    with_arena, RawFrame, RawShape, RawStyle,
    SHAPE_TYPE_SHAPE, SHAPE_TYPE_RECT, SHAPE_TYPE_ELLIPSE, SHAPE_TYPE_KEEP,
    STYLE_FLAG_HAS_FILL, STYLE_FLAG_HAS_STROKE, STYLE_FLAG_HAS_STROKE_WIDTH,
    STYLE_FLAG_HAS_LINE_CAP, STYLE_FLAG_HAS_LINE_JOIN, STYLE_FLAG_HAS_MITER_LIMIT,
    STYLE_FLAG_HAS_LINE_DASH,
};
use flate2::read::ZlibDecoder;
use prost::Message;
use serde::{Deserialize, Serialize};
use std::io::Read;
use wasm_bindgen::prelude::*;

// ============================================================================
// Internal Data Structures (for serialization of single frames/objects)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvgaFrame {
    pub alpha: f32,
    pub layout: SvgaLayout,
    pub transform: SvgaTransform,
    pub clip_path: String,  // Raw SVG path string
    pub shapes: Vec<SvgaShape>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvgaLayout {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvgaTransform {
    pub a: f32,
    pub b: f32,
    pub c: f32,
    pub d: f32,
    pub tx: f32,
    pub ty: f32,
}

impl Default for SvgaTransform {
    fn default() -> Self {
        Self {
            a: 1.0,
            b: 0.0,
            c: 0.0,
            d: 1.0,
            tx: 0.0,
            ty: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SvgaShape {
    Shape {
        d: String,  // Raw SVG path string
        styles: SvgaShapeStyle,
        transform: SvgaTransform,
    },
    Rect {
        x: f32,
        y: f32,
        width: f32,
        height: f32,
        corner_radius: f32,
        styles: SvgaShapeStyle,
        transform: SvgaTransform,
    },
    Ellipse {
        x: f32,
        y: f32,
        radius_x: f32,
        radius_y: f32,
        styles: SvgaShapeStyle,
        transform: SvgaTransform,
    },
    Keep,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SvgaShapeStyle {
    pub fill: Option<SvgaColor>,
    pub stroke: Option<SvgaColor>,
    pub stroke_width: Option<f32>,
    pub line_cap: Option<u8>,
    pub line_join: Option<u8>,
    pub miter_limit: Option<f32>,
    pub line_dash: Option<Vec<f32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvgaColor {
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub a: f32,
}

// ============================================================================
// WASM Interface (Lazy Parser)
// ============================================================================

/// Parsed SVGA document handle
/// Keeps the decoded Protobuf data in memory and allows lazy access to frames
#[wasm_bindgen]
pub struct SvgaDocument {
    movie: proto::MovieEntity,
}

#[wasm_bindgen]
impl SvgaDocument {
    /// Parse SVGA data (Decompress + Protobuf Decode only)
    /// This is extremely fast as it avoids any JS object creation
    #[wasm_bindgen(constructor)]
    pub fn new(data: &[u8]) -> Result<SvgaDocument, JsValue> {
        // Decompress the data
        let decompressed = decompress(data)
            .map_err(|e| JsValue::from_str(&format!("Decompression error: {}", e)))?;

        // Decode protobuf
        let movie = proto::MovieEntity::decode(&decompressed[..])
            .map_err(|e| JsValue::from_str(&format!("Protobuf decode error: {}", e)))?;

        Ok(SvgaDocument { movie })
    }

    /// Get SVGA version
    #[wasm_bindgen(getter)]
    pub fn version(&self) -> String {
        self.movie.version.clone()
    }

    /// Get video width
    #[wasm_bindgen(getter)]
    pub fn width(&self) -> f32 {
        self.movie.params.as_ref().map(|p| p.view_box_width).unwrap_or(0.0)
    }

    /// Get video height
    #[wasm_bindgen(getter)]
    pub fn height(&self) -> f32 {
        self.movie.params.as_ref().map(|p| p.view_box_height).unwrap_or(0.0)
    }

    /// Get fps
    #[wasm_bindgen(getter)]
    pub fn fps(&self) -> i32 {
        self.movie.params.as_ref().map(|p| p.fps).unwrap_or(20)
    }

    /// Get total frames
    #[wasm_bindgen(getter)]
    pub fn frames(&self) -> i32 {
        self.movie.params.as_ref().map(|p| p.frames).unwrap_or(0)
    }

    /// Get sprite count
    #[wasm_bindgen(getter)]
    pub fn sprite_count(&self) -> usize {
        self.movie.sprites.len()
    }

    /// Get all image data (key -> Uint8Array)
    /// This is called once to load all images
    pub fn get_images(&self) -> Result<JsValue, JsValue> {
        let images_obj = js_sys::Object::new();
        for (key, data) in &self.movie.images {
            if key.starts_with("audio") {
                continue;
            }
            let arr = js_sys::Uint8Array::new_with_length(data.len() as u32);
            arr.copy_from(data);
            js_sys::Reflect::set(&images_obj, &key.into(), &arr)?;
        }
        Ok(images_obj.into())
    }

    /// Get image key for a specific sprite
    pub fn get_sprite_image_key(&self, sprite_index: usize) -> Option<String> {
        self.movie.sprites.get(sprite_index).map(|s| s.image_key.clone())
    }

    /// Get frame count for a specific sprite
    pub fn get_sprite_frame_count(&self, sprite_index: usize) -> usize {
        self.movie.sprites.get(sprite_index)
            .map(|s| s.frames.len())
            .unwrap_or(0)
    }

    /// Get a specific frame from a specific sprite
    /// This is called lazily when playback reaches this frame
    pub fn get_frame(&self, sprite_index: usize, frame_index: usize) -> Result<JsValue, JsValue> {
        let sprite = self.movie.sprites.get(sprite_index)
            .ok_or_else(|| JsValue::from_str("Sprite index out of bounds"))?;

        let frame = sprite.frames.get(frame_index)
            .ok_or_else(|| JsValue::from_str("Frame index out of bounds"))?;

        let svga_frame = convert_frame(frame);

        serde_wasm_bindgen::to_value(&svga_frame)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }


    /// Get a specific frame as raw pointer (True Raw Transfer)
    /// Returns the frame index in the arena. JS reads directly from WASM memory.
    ///
    /// This is the zero-copy version - no serialization, no memory copy.
    /// Get a specific frame as raw pointer (True Raw Transfer)
    /// Returns the frame index in the arena. JS reads directly from WASM memory.
    ///
    /// SAFETY: This clears the previous frame from the global arena to reuse memory.
    /// JS must read the data immediately before calling this function again.
    pub fn get_frame_ptr(&self, sprite_index: usize, frame_index: usize) -> Result<u32, JsValue> {
        let sprite = self.movie.sprites.get(sprite_index)
            .ok_or_else(|| JsValue::from_str("Sprite index out of bounds"))?;

        let frame = sprite.frames.get(frame_index)
            .ok_or_else(|| JsValue::from_str("Frame index out of bounds"))?;

        // Convert and store in arena, return frame index
        // Note: convert_frame_raw now handles clearing the arena internally or we do it here?
        // Let's do it in convert_frame_raw or just call clear here?
        // Since convert_frame_raw uses with_arena, we should probably add a clear capability or just call clear inside it?
        // But convert_frame_raw is a helper. Let's make it explicitly clear.

        let frame_idx = convert_frame_raw(frame, true); // true = clear_before_write
        Ok(frame_idx)
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

fn decompress(data: &[u8]) -> Result<Vec<u8>, std::io::Error> {
    let mut decoder = ZlibDecoder::new(data);
    let mut decompressed = Vec::new();
    decoder.read_to_end(&mut decompressed)?;
    Ok(decompressed)
}

fn convert_frame(frame: &proto::FrameEntity) -> SvgaFrame {
    let layout = frame.layout.as_ref().map(|l| SvgaLayout {
        x: l.x,
        y: l.y,
        width: l.width,
        height: l.height,
    }).unwrap_or(SvgaLayout {
        x: 0.0,
        y: 0.0,
        width: 0.0,
        height: 0.0,
    });

    let transform = frame.transform.as_ref().map(|t| SvgaTransform {
        a: t.a,
        b: t.b,
        c: t.c,
        d: t.d,
        tx: t.tx,
        ty: t.ty,
    }).unwrap_or_default();

    let shapes: Vec<SvgaShape> = frame
        .shapes
        .iter()
        .map(convert_shape)
        .collect();

    SvgaFrame {
        alpha: frame.alpha,
        layout,
        transform,
        clip_path: frame.clip_path.clone(),
        shapes,
    }
}

fn convert_shape(shape: &proto::ShapeEntity) -> SvgaShape {
    let shape_type = shape.r#type();
    let styles = shape.styles.as_ref().map(convert_style).unwrap_or_default();
    let transform = shape.transform.as_ref().map(|t| SvgaTransform {
        a: t.a,
        b: t.b,
        c: t.c,
        d: t.d,
        tx: t.tx,
        ty: t.ty,
    }).unwrap_or_default();

    match shape_type {
        proto::ShapeType::Shape => {
            if let Some(proto::shape_entity::Args::Shape(args)) = &shape.args {
                SvgaShape::Shape {
                    d: args.d.clone(),
                    styles,
                    transform,
                }
            } else {
                SvgaShape::Keep
            }
        }
        proto::ShapeType::Rect => {
            if let Some(proto::shape_entity::Args::Rect(args)) = &shape.args {
                SvgaShape::Rect {
                    x: args.x,
                    y: args.y,
                    width: args.width,
                    height: args.height,
                    corner_radius: args.corner_radius,
                    styles,
                    transform,
                }
            } else {
                SvgaShape::Keep
            }
        }
        proto::ShapeType::Ellipse => {
            if let Some(proto::shape_entity::Args::Ellipse(args)) = &shape.args {
                SvgaShape::Ellipse {
                    x: args.x,
                    y: args.y,
                    radius_x: args.radius_x,
                    radius_y: args.radius_y,
                    styles,
                    transform,
                }
            } else {
                SvgaShape::Keep
            }
        }
        proto::ShapeType::Keep => SvgaShape::Keep,
    }
}

fn convert_style(style: &proto::ShapeStyle) -> SvgaShapeStyle {
    let fill = style.fill.as_ref().map(|c| SvgaColor {
        r: c.r,
        g: c.g,
        b: c.b,
        a: c.a,
    });

    let stroke = style.stroke.as_ref().map(|c| SvgaColor {
        r: c.r,
        g: c.g,
        b: c.b,
        a: c.a,
    });

    let mut line_dash = Vec::new();
    if style.line_dash_i > 0.0 {
        line_dash.push(style.line_dash_i);
    }
    if style.line_dash_ii > 0.0 {
        if line_dash.is_empty() {
            line_dash.push(0.0);
        }
        line_dash.push(style.line_dash_ii);
    }
    if style.line_dash_iii > 0.0 {
        while line_dash.len() < 2 {
            line_dash.push(0.0);
        }
        line_dash.push(style.line_dash_iii);
    }

    SvgaShapeStyle {
        fill,
        stroke,
        stroke_width: if style.stroke_width > 0.0 { Some(style.stroke_width) } else { None },
        line_cap: Some(style.line_cap as u8),
        line_join: Some(style.line_join as u8),
        miter_limit: if style.miter_limit > 0.0 { Some(style.miter_limit) } else { None },
        line_dash: if line_dash.is_empty() { None } else { Some(line_dash) },
    }
}


// ============================================================================
// Raw Transfer Conversion (Zero-Copy)
// ============================================================================

/// Convert a proto frame to RawFrame and store in arena
/// Returns the frame index in the arena
fn convert_frame_raw(frame: &proto::FrameEntity, should_clear: bool) -> u32 {
    with_arena(|arena| {
        if should_clear {
            arena.clear();
        }
        // Convert shapes first to get their offset
        let shapes_start_offset = convert_shapes_raw(&frame.shapes, arena);
        let shapes_count = frame.shapes.len() as u32;

        // Add clip_path to string buffer
        let (clip_path_offset, clip_path_len) = arena.add_string(&frame.clip_path);

        // Get layout values
        let (layout_x, layout_y, layout_width, layout_height) = frame
            .layout
            .as_ref()
            .map(|l| (l.x, l.y, l.width, l.height))
            .unwrap_or((0.0, 0.0, 0.0, 0.0));

        // Get transform values
        let (transform_a, transform_b, transform_c, transform_d, transform_tx, transform_ty) = frame
            .transform
            .as_ref()
            .map(|t| (t.a, t.b, t.c, t.d, t.tx, t.ty))
            .unwrap_or((1.0, 0.0, 0.0, 1.0, 0.0, 0.0));

        let raw_frame = RawFrame {
            alpha: frame.alpha,
            layout_x,
            layout_y,
            layout_width,
            layout_height,
            transform_a,
            transform_b,
            transform_c,
            transform_d,
            transform_tx,
            transform_ty,
            clip_path_offset,
            clip_path_len,
            shapes_offset: shapes_start_offset,
            shapes_count,
        };

        arena.add_frame(raw_frame)
    })
}

/// Convert shapes to RawShape and store in arena
/// Returns the start offset of the shapes
fn convert_shapes_raw(shapes: &[proto::ShapeEntity], arena: &mut crate::raw_transfer::FrameArena) -> u32 {
    if shapes.is_empty() {
        return 0;
    }

    let start_offset = arena.shapes_len();

    for shape in shapes {
        let shape_type_enum = shape.r#type();

        // Get transform
        let (t_a, t_b, t_c, t_d, t_tx, t_ty) = shape
            .transform
            .as_ref()
            .map(|t| (t.a, t.b, t.c, t.d, t.tx, t.ty))
            .unwrap_or((1.0, 0.0, 0.0, 1.0, 0.0, 0.0));

        // Convert style if present
        let styles_offset = shape
            .styles
            .as_ref()
            .map(|s| convert_style_raw(s, arena))
            .unwrap_or(0);

        let (shape_type, data) = match shape_type_enum {
            proto::ShapeType::Shape => {
                if let Some(proto::shape_entity::Args::Shape(args)) = &shape.args {
                    let (d_offset, d_len) = arena.add_string(&args.d);
                    (SHAPE_TYPE_SHAPE, [d_offset, d_len, 0, 0, 0])
                } else {
                    (SHAPE_TYPE_KEEP, [0; 5])
                }
            }
            proto::ShapeType::Rect => {
                if let Some(proto::shape_entity::Args::Rect(args)) = &shape.args {
                    (
                        SHAPE_TYPE_RECT,
                        [
                            args.x.to_bits(),
                            args.y.to_bits(),
                            args.width.to_bits(),
                            args.height.to_bits(),
                            args.corner_radius.to_bits(),
                        ],
                    )
                } else {
                    (SHAPE_TYPE_KEEP, [0; 5])
                }
            }
            proto::ShapeType::Ellipse => {
                if let Some(proto::shape_entity::Args::Ellipse(args)) = &shape.args {
                    (
                        SHAPE_TYPE_ELLIPSE,
                        [
                            args.x.to_bits(),
                            args.y.to_bits(),
                            args.radius_x.to_bits(),
                            args.radius_y.to_bits(),
                            0,
                        ],
                    )
                } else {
                    (SHAPE_TYPE_KEEP, [0; 5])
                }
            }
            proto::ShapeType::Keep => (SHAPE_TYPE_KEEP, [0; 5]),
        };

        let raw_shape = RawShape {
            shape_type,
            _pad: [0; 3],
            transform_a: t_a,
            transform_b: t_b,
            transform_c: t_c,
            transform_d: t_d,
            transform_tx: t_tx,
            transform_ty: t_ty,
            styles_offset,
            data,
        };

        arena.add_shape(raw_shape);
    }

    start_offset
}

/// Convert style to RawStyle and store in arena
/// Returns the style offset
fn convert_style_raw(style: &proto::ShapeStyle, arena: &mut crate::raw_transfer::FrameArena) -> u32 {
    let mut flags: u8 = 0;

    let (fill_r, fill_g, fill_b, fill_a) = style
        .fill
        .as_ref()
        .map(|c| {
            flags |= STYLE_FLAG_HAS_FILL;
            (c.r, c.g, c.b, c.a)
        })
        .unwrap_or((0.0, 0.0, 0.0, 0.0));

    let (stroke_r, stroke_g, stroke_b, stroke_a) = style
        .stroke
        .as_ref()
        .map(|c| {
            flags |= STYLE_FLAG_HAS_STROKE;
            (c.r, c.g, c.b, c.a)
        })
        .unwrap_or((0.0, 0.0, 0.0, 0.0));

    let stroke_width = if style.stroke_width > 0.0 {
        flags |= STYLE_FLAG_HAS_STROKE_WIDTH;
        style.stroke_width
    } else {
        0.0
    };

    let line_cap = style.line_cap as u8;
    flags |= STYLE_FLAG_HAS_LINE_CAP;

    let line_join = style.line_join as u8;
    flags |= STYLE_FLAG_HAS_LINE_JOIN;

    let miter_limit = if style.miter_limit > 0.0 {
        flags |= STYLE_FLAG_HAS_MITER_LIMIT;
        style.miter_limit
    } else {
        0.0
    };

    // Build line dash
    let mut line_dash_values = Vec::new();
    if style.line_dash_i > 0.0 {
        line_dash_values.push(style.line_dash_i);
    }
    if style.line_dash_ii > 0.0 {
        if line_dash_values.is_empty() {
            line_dash_values.push(0.0);
        }
        line_dash_values.push(style.line_dash_ii);
    }
    if style.line_dash_iii > 0.0 {
        while line_dash_values.len() < 2 {
            line_dash_values.push(0.0);
        }
        line_dash_values.push(style.line_dash_iii);
    }

    let (line_dash_count, line_dash_offset) = if !line_dash_values.is_empty() {
        flags |= STYLE_FLAG_HAS_LINE_DASH;
        let offset = arena.add_line_dash(&line_dash_values);
        (line_dash_values.len() as u8, offset)
    } else {
        (0, 0)
    };

    let raw_style = RawStyle {
        flags,
        line_cap,
        line_join,
        line_dash_count,
        fill_r,
        fill_g,
        fill_b,
        fill_a,
        stroke_r,
        stroke_g,
        stroke_b,
        stroke_a,
        stroke_width,
        miter_limit,
        line_dash_offset,
    };

    arena.add_style(raw_style)
}
