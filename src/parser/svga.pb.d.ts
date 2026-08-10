import * as $protobuf from 'protobufjs'
import Long = require('long')
/** Namespace com. */
export namespace com {
  /** Namespace opensource. */
  namespace opensource {
    /** Namespace svga. */
    namespace svga {
      /** Properties of a MovieParams. */
      interface IMovieParams {
        /** MovieParams viewBoxWidth */
        viewBoxWidth?: number | null

        /** MovieParams viewBoxHeight */
        viewBoxHeight?: number | null

        /** MovieParams fps */
        fps?: number | null

        /** MovieParams frames */
        frames?: number | null
      }

      /** Represents a MovieParams. */
      class MovieParams implements IMovieParams {
        /**
         * Constructs a new MovieParams.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.IMovieParams)

        /** MovieParams viewBoxWidth. */
        public viewBoxWidth: number

        /** MovieParams viewBoxHeight. */
        public viewBoxHeight: number

        /** MovieParams fps. */
        public fps: number

        /** MovieParams frames. */
        public frames: number

        /**
         * Creates a new MovieParams instance using the specified properties.
         * @param [properties] Properties to set
         * @returns MovieParams instance
         */
        public static create(
          properties?: com.opensource.svga.IMovieParams
        ): com.opensource.svga.MovieParams

        /**
         * Decodes a MovieParams message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MovieParams
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.MovieParams
      }

      /** Properties of a Layout. */
      interface ILayout {
        /** Layout x */
        x?: number | null

        /** Layout y */
        y?: number | null

        /** Layout width */
        width?: number | null

        /** Layout height */
        height?: number | null
      }

      /** Represents a Layout. */
      class Layout implements ILayout {
        /**
         * Constructs a new Layout.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.ILayout)

        /** Layout x. */
        public x: number

        /** Layout y. */
        public y: number

        /** Layout width. */
        public width: number

        /** Layout height. */
        public height: number

        /**
         * Creates a new Layout instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Layout instance
         */
        public static create(
          properties?: com.opensource.svga.ILayout
        ): com.opensource.svga.Layout

        /**
         * Decodes a Layout message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Layout
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.Layout
      }

      /** Properties of a Transform. */
      interface ITransform {
        /** Transform a */
        a?: number | null

        /** Transform b */
        b?: number | null

        /** Transform c */
        c?: number | null

        /** Transform d */
        d?: number | null

        /** Transform tx */
        tx?: number | null

        /** Transform ty */
        ty?: number | null
      }

      /** Represents a Transform. */
      class Transform implements ITransform {
        /**
         * Constructs a new Transform.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.ITransform)

        /** Transform a. */
        public a: number

        /** Transform b. */
        public b: number

        /** Transform c. */
        public c: number

        /** Transform d. */
        public d: number

        /** Transform tx. */
        public tx: number

        /** Transform ty. */
        public ty: number

        /**
         * Creates a new Transform instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Transform instance
         */
        public static create(
          properties?: com.opensource.svga.ITransform
        ): com.opensource.svga.Transform

        /**
         * Decodes a Transform message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Transform
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.Transform
      }

      /** Properties of a RGBAColor. */
      interface IRGBAColor {
        /** RGBAColor r */
        r?: number | null

        /** RGBAColor g */
        g?: number | null

        /** RGBAColor b */
        b?: number | null

        /** RGBAColor a */
        a?: number | null
      }

      /** Represents a RGBAColor. */
      class RGBAColor implements IRGBAColor {
        /**
         * Constructs a new RGBAColor.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.IRGBAColor)

        /** RGBAColor r. */
        public r: number

        /** RGBAColor g. */
        public g: number

        /** RGBAColor b. */
        public b: number

        /** RGBAColor a. */
        public a: number

        /**
         * Creates a new RGBAColor instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RGBAColor instance
         */
        public static create(
          properties?: com.opensource.svga.IRGBAColor
        ): com.opensource.svga.RGBAColor

        /**
         * Decodes a RGBAColor message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RGBAColor
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.RGBAColor
      }

      /** LineCap enum. */
      enum LineCap {
        LineCap_BUTT = 0,
        LineCap_ROUND = 1,
        LineCap_SQUARE = 2
      }

      /** LineJoin enum. */
      enum LineJoin {
        LineJoin_MITER = 0,
        LineJoin_ROUND = 1,
        LineJoin_BEVEL = 2
      }

      /** Properties of a ShapeStyle. */
      interface IShapeStyle {
        /** ShapeStyle fill */
        fill?: com.opensource.svga.IRGBAColor | null

        /** ShapeStyle stroke */
        stroke?: com.opensource.svga.IRGBAColor | null

        /** ShapeStyle strokeWidth */
        strokeWidth?: number | null

        /** ShapeStyle lineCap */
        lineCap?: com.opensource.svga.LineCap | null

        /** ShapeStyle lineJoin */
        lineJoin?: com.opensource.svga.LineJoin | null

        /** ShapeStyle miterLimit */
        miterLimit?: number | null

        /** ShapeStyle lineDashI */
        lineDashI?: number | null

        /** ShapeStyle lineDashII */
        lineDashII?: number | null

        /** ShapeStyle lineDashIII */
        lineDashIII?: number | null
      }

      /** Represents a ShapeStyle. */
      class ShapeStyle implements IShapeStyle {
        /**
         * Constructs a new ShapeStyle.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.IShapeStyle)

        /** ShapeStyle fill. */
        public fill?: com.opensource.svga.IRGBAColor | null

        /** ShapeStyle stroke. */
        public stroke?: com.opensource.svga.IRGBAColor | null

        /** ShapeStyle strokeWidth. */
        public strokeWidth: number

        /** ShapeStyle lineCap. */
        public lineCap: com.opensource.svga.LineCap

        /** ShapeStyle lineJoin. */
        public lineJoin: com.opensource.svga.LineJoin

        /** ShapeStyle miterLimit. */
        public miterLimit: number

        /** ShapeStyle lineDashI. */
        public lineDashI: number

        /** ShapeStyle lineDashII. */
        public lineDashII: number

        /** ShapeStyle lineDashIII. */
        public lineDashIII: number

        /**
         * Creates a new ShapeStyle instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ShapeStyle instance
         */
        public static create(
          properties?: com.opensource.svga.IShapeStyle
        ): com.opensource.svga.ShapeStyle

        /**
         * Decodes a ShapeStyle message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ShapeStyle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.ShapeStyle
      }

      /** ShapeType enum. */
      enum ShapeType {
        SHAPE = 0,
        RECT = 1,
        ELLIPSE = 2,
        KEEP = 3
      }

      /** Properties of a ShapeArgs. */
      interface IShapeArgs {
        /** ShapeArgs d */
        d?: string | null
      }

      /** Represents a ShapeArgs. */
      class ShapeArgs implements IShapeArgs {
        /**
         * Constructs a new ShapeArgs.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.IShapeArgs)

        /** ShapeArgs d. */
        public d: string

        /**
         * Creates a new ShapeArgs instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ShapeArgs instance
         */
        public static create(
          properties?: com.opensource.svga.IShapeArgs
        ): com.opensource.svga.ShapeArgs

        /**
         * Decodes a ShapeArgs message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ShapeArgs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.ShapeArgs
      }

      /** Properties of a RectArgs. */
      interface IRectArgs {
        /** RectArgs x */
        x?: number | null

        /** RectArgs y */
        y?: number | null

        /** RectArgs width */
        width?: number | null

        /** RectArgs height */
        height?: number | null

        /** RectArgs cornerRadius */
        cornerRadius?: number | null
      }

      /** Represents a RectArgs. */
      class RectArgs implements IRectArgs {
        /**
         * Constructs a new RectArgs.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.IRectArgs)

        /** RectArgs x. */
        public x: number

        /** RectArgs y. */
        public y: number

        /** RectArgs width. */
        public width: number

        /** RectArgs height. */
        public height: number

        /** RectArgs cornerRadius. */
        public cornerRadius: number

        /**
         * Creates a new RectArgs instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RectArgs instance
         */
        public static create(
          properties?: com.opensource.svga.IRectArgs
        ): com.opensource.svga.RectArgs

        /**
         * Decodes a RectArgs message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RectArgs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.RectArgs
      }

      /** Properties of an EllipseArgs. */
      interface IEllipseArgs {
        /** EllipseArgs x */
        x?: number | null

        /** EllipseArgs y */
        y?: number | null

        /** EllipseArgs radiusX */
        radiusX?: number | null

        /** EllipseArgs radiusY */
        radiusY?: number | null
      }

      /** Represents an EllipseArgs. */
      class EllipseArgs implements IEllipseArgs {
        /**
         * Constructs a new EllipseArgs.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.IEllipseArgs)

        /** EllipseArgs x. */
        public x: number

        /** EllipseArgs y. */
        public y: number

        /** EllipseArgs radiusX. */
        public radiusX: number

        /** EllipseArgs radiusY. */
        public radiusY: number

        /**
         * Creates a new EllipseArgs instance using the specified properties.
         * @param [properties] Properties to set
         * @returns EllipseArgs instance
         */
        public static create(
          properties?: com.opensource.svga.IEllipseArgs
        ): com.opensource.svga.EllipseArgs

        /**
         * Decodes an EllipseArgs message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns EllipseArgs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.EllipseArgs
      }

      /** Properties of a ShapeEntity. */
      interface IShapeEntity {
        /** ShapeEntity type */
        type?: com.opensource.svga.ShapeType | null

        /** ShapeEntity shape */
        shape?: com.opensource.svga.IShapeArgs | null

        /** ShapeEntity rect */
        rect?: com.opensource.svga.IRectArgs | null

        /** ShapeEntity ellipse */
        ellipse?: com.opensource.svga.IEllipseArgs | null

        /** ShapeEntity styles */
        styles?: com.opensource.svga.IShapeStyle | null

        /** ShapeEntity transform */
        transform?: com.opensource.svga.ITransform | null
      }

      /** Represents a ShapeEntity. */
      class ShapeEntity implements IShapeEntity {
        /**
         * Constructs a new ShapeEntity.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.IShapeEntity)

        /** ShapeEntity type. */
        public type: com.opensource.svga.ShapeType

        /** ShapeEntity shape. */
        public shape?: com.opensource.svga.IShapeArgs | null

        /** ShapeEntity rect. */
        public rect?: com.opensource.svga.IRectArgs | null

        /** ShapeEntity ellipse. */
        public ellipse?: com.opensource.svga.IEllipseArgs | null

        /** ShapeEntity styles. */
        public styles?: com.opensource.svga.IShapeStyle | null

        /** ShapeEntity transform. */
        public transform?: com.opensource.svga.ITransform | null

        /** ShapeEntity args. */
        public args?: 'shape' | 'rect' | 'ellipse'

        /**
         * Creates a new ShapeEntity instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ShapeEntity instance
         */
        public static create(
          properties?: com.opensource.svga.IShapeEntity
        ): com.opensource.svga.ShapeEntity

        /**
         * Decodes a ShapeEntity message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ShapeEntity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.ShapeEntity
      }

      /** Properties of a FrameEntity. */
      interface IFrameEntity {
        /** FrameEntity alpha */
        alpha?: number | null

        /** FrameEntity layout */
        layout?: com.opensource.svga.ILayout | null

        /** FrameEntity transform */
        transform?: com.opensource.svga.ITransform | null

        /** FrameEntity clipPath */
        clipPath?: string | null

        /** FrameEntity shapes */
        shapes?: com.opensource.svga.IShapeEntity[] | null
      }

      /** Represents a FrameEntity. */
      class FrameEntity implements IFrameEntity {
        /**
         * Constructs a new FrameEntity.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.IFrameEntity)

        /** FrameEntity alpha. */
        public alpha: number

        /** FrameEntity layout. */
        public layout?: com.opensource.svga.ILayout | null

        /** FrameEntity transform. */
        public transform?: com.opensource.svga.ITransform | null

        /** FrameEntity clipPath. */
        public clipPath: string

        /** FrameEntity shapes. */
        public shapes: com.opensource.svga.IShapeEntity[]

        /**
         * Creates a new FrameEntity instance using the specified properties.
         * @param [properties] Properties to set
         * @returns FrameEntity instance
         */
        public static create(
          properties?: com.opensource.svga.IFrameEntity
        ): com.opensource.svga.FrameEntity

        /**
         * Decodes a FrameEntity message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FrameEntity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.FrameEntity
      }

      /** Properties of a SpriteEntity. */
      interface ISpriteEntity {
        /** SpriteEntity imageKey */
        imageKey?: string | null

        /** SpriteEntity frames */
        frames?: com.opensource.svga.IFrameEntity[] | null
      }

      /** Represents a SpriteEntity. */
      class SpriteEntity implements ISpriteEntity {
        /**
         * Constructs a new SpriteEntity.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.ISpriteEntity)

        /** SpriteEntity imageKey. */
        public imageKey: string

        /** SpriteEntity frames. */
        public frames: com.opensource.svga.IFrameEntity[]

        /**
         * Creates a new SpriteEntity instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SpriteEntity instance
         */
        public static create(
          properties?: com.opensource.svga.ISpriteEntity
        ): com.opensource.svga.SpriteEntity

        /**
         * Decodes a SpriteEntity message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SpriteEntity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.SpriteEntity
      }

      /** Properties of a MovieEntity. */
      interface IMovieEntity {
        /** MovieEntity version */
        version?: string | null

        /** MovieEntity params */
        params?: com.opensource.svga.IMovieParams | null

        /** MovieEntity images */
        images?: { [k: string]: Uint8Array } | null

        /** MovieEntity sprites */
        sprites?: com.opensource.svga.ISpriteEntity[] | null
      }

      /** Represents a MovieEntity. */
      class MovieEntity implements IMovieEntity {
        /**
         * Constructs a new MovieEntity.
         * @param [properties] Properties to set
         */
        constructor(properties?: com.opensource.svga.IMovieEntity)

        /** MovieEntity version. */
        public version: string

        /** MovieEntity params. */
        public params?: com.opensource.svga.IMovieParams | null

        /** MovieEntity images. */
        public images: { [k: string]: Uint8Array }

        /** MovieEntity sprites. */
        public sprites: com.opensource.svga.ISpriteEntity[]

        /**
         * Creates a new MovieEntity instance using the specified properties.
         * @param [properties] Properties to set
         * @returns MovieEntity instance
         */
        public static create(
          properties?: com.opensource.svga.IMovieEntity
        ): com.opensource.svga.MovieEntity

        /**
         * Decodes a MovieEntity message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MovieEntity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number
        ): com.opensource.svga.MovieEntity
      }
    }
  }
}
