//! SVG Path Pre-compiler
//!
//! Compiles SVG path strings (e.g., "M 0 0 L 10 10") into pre-compiled
//! drawing commands to eliminate regex parsing during render loops.

use serde::{Deserialize, Serialize};

/// Drawing command opcodes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum DrawOp {
    M = 0,   // moveTo absolute
    MRel = 1,   // moveTo relative
    L = 2,   // lineTo absolute
    LRel = 3,   // lineTo relative
    H = 4,   // horizontal lineTo absolute
    HRel = 5,   // horizontal lineTo relative
    V = 6,   // vertical lineTo absolute
    VRel = 7,   // vertical lineTo relative
    C = 8,   // bezierCurveTo absolute
    CRel = 9,   // bezierCurveTo relative
    S = 10,  // smooth bezierCurveTo absolute
    SRel = 11,  // smooth bezierCurveTo relative
    Q = 12,  // quadraticCurveTo absolute
    QRel = 13,  // quadraticCurveTo relative
    Z = 14,  // closePath
}

impl DrawOp {
    pub fn from_char(c: char) -> Option<Self> {
        match c {
            'M' => Some(DrawOp::M),
            'm' => Some(DrawOp::MRel),
            'L' => Some(DrawOp::L),
            'l' => Some(DrawOp::LRel),
            'H' => Some(DrawOp::H),
            'h' => Some(DrawOp::HRel),
            'V' => Some(DrawOp::V),
            'v' => Some(DrawOp::VRel),
            'C' => Some(DrawOp::C),
            'c' => Some(DrawOp::CRel),
            'S' => Some(DrawOp::S),
            's' => Some(DrawOp::SRel),
            'Q' => Some(DrawOp::Q),
            'q' => Some(DrawOp::QRel),
            'Z' | 'z' => Some(DrawOp::Z),
            _ => None,
        }
    }
}

/// Pre-compiled drawing command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrawCmd {
    pub op: u8,
    pub args: Vec<f32>,
}

impl DrawCmd {
    pub fn new(op: DrawOp, args: Vec<f32>) -> Self {
        Self {
            op: op as u8,
            args,
        }
    }
}

/// Compiled path containing pre-parsed drawing commands
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompiledPath {
    pub commands: Vec<DrawCmd>,
}

/// Compile an SVG path string to pre-compiled drawing commands.
/// This should be called at load time, not render time.
pub fn compile_path(d: &str) -> CompiledPath {
    let mut commands = Vec::new();

    if d.is_empty() {
        return CompiledPath { commands };
    }

    // State machine for parsing
    let mut current_cmd: Option<char> = None;
    let mut current_args: Vec<f32> = Vec::new();
    let mut num_buffer = String::new();
    let mut in_number = false;

    let chars: Vec<char> = d.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];

        if c.is_alphabetic() {
            // Flush current number if any
            if !num_buffer.is_empty() {
                if let Ok(num) = num_buffer.parse::<f32>() {
                    current_args.push(num);
                }
                num_buffer.clear();
            }

            // Flush previous command
            if let Some(cmd_char) = current_cmd {
                flush_command(&mut commands, cmd_char, &mut current_args);
            }

            current_cmd = Some(c);
            in_number = false;
        } else if c.is_ascii_digit() || c == '.' || c == '-' || c == '+' {
            // Handle negative sign - could be separator or part of number
            if c == '-' && in_number && !num_buffer.is_empty() {
                // This is a separator (negative sign for next number)
                if let Ok(num) = num_buffer.parse::<f32>() {
                    current_args.push(num);
                }
                num_buffer.clear();
            }
            num_buffer.push(c);
            in_number = true;
        } else if c == ',' || c.is_whitespace() {
            // Separator - flush current number
            if !num_buffer.is_empty() {
                if let Ok(num) = num_buffer.parse::<f32>() {
                    current_args.push(num);
                }
                num_buffer.clear();
            }
            in_number = false;
        }

        i += 1;
    }

    // Flush final number
    if !num_buffer.is_empty() {
        if let Ok(num) = num_buffer.parse::<f32>() {
            current_args.push(num);
        }
    }

    // Flush final command
    if let Some(cmd_char) = current_cmd {
        flush_command(&mut commands, cmd_char, &mut current_args);
    }

    CompiledPath { commands }
}

fn flush_command(commands: &mut Vec<DrawCmd>, cmd_char: char, args: &mut Vec<f32>) {
    if let Some(op) = DrawOp::from_char(cmd_char) {
        // Handle commands that may have multiple coordinate sets
        let args_per_cmd = match cmd_char {
            'M' | 'm' | 'L' | 'l' => 2,
            'H' | 'h' | 'V' | 'v' => 1,
            'C' | 'c' => 6,
            'S' | 's' | 'Q' | 'q' => 4,
            'Z' | 'z' => 0,
            _ => 0,
        };

        if args_per_cmd == 0 {
            // Z command has no args
            commands.push(DrawCmd::new(op, vec![]));
        } else {
            // Split args into multiple commands if needed
            let chunks: Vec<_> = args.chunks(args_per_cmd).collect();
            for chunk in chunks {
                if chunk.len() == args_per_cmd {
                    commands.push(DrawCmd::new(op, chunk.to_vec()));
                }
            }
        }
    }
    args.clear();
}

/// Compile an SVG path string to a packed f32 array for efficient JS transfer.
/// Format: [op, arg_count, ...args, op, arg_count, ...args, ...]
/// This avoids creating nested JS objects for each command.
pub fn compile_path_packed(d: &str) -> Vec<f32> {
    let compiled = compile_path(d);
    let mut packed = Vec::with_capacity(compiled.commands.len() * 8);

    for cmd in &compiled.commands {
        packed.push(cmd.op as f32);
        packed.push(cmd.args.len() as f32);
        packed.extend(&cmd.args);
    }

    packed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_path() {
        let path = compile_path("M 0 0 L 10 10 Z");
        assert_eq!(path.commands.len(), 3);
        assert_eq!(path.commands[0].op, DrawOp::M as u8);
        assert_eq!(path.commands[0].args, vec![0.0, 0.0]);
        assert_eq!(path.commands[1].op, DrawOp::L as u8);
        assert_eq!(path.commands[1].args, vec![10.0, 10.0]);
        assert_eq!(path.commands[2].op, DrawOp::Z as u8);
    }

    #[test]
    fn test_bezier_path() {
        let path = compile_path("M 0 0 C 10 20 30 40 50 60");
        assert_eq!(path.commands.len(), 2);
        assert_eq!(path.commands[1].op, DrawOp::C as u8);
        assert_eq!(path.commands[1].args, vec![10.0, 20.0, 30.0, 40.0, 50.0, 60.0]);
    }

    #[test]
    fn test_negative_numbers() {
        let path = compile_path("M -10 -20 L 10 -5");
        assert_eq!(path.commands.len(), 2);
        assert_eq!(path.commands[0].args, vec![-10.0, -20.0]);
        assert_eq!(path.commands[1].args, vec![10.0, -5.0]);
    }
}
