/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from 'protobufjs/minimal'

// Common aliases
const $Reader = $protobuf.Reader,
  $util = $protobuf.util

// Exported root namespace
const $root = $protobuf.roots['default'] || ($protobuf.roots['default'] = {})

export const com = ($root.com = (() => {
  /**
   * Namespace com.
   * @exports com
   * @namespace
   */
  const com = {}

  com.opensource = (function () {
    /**
     * Namespace opensource.
     * @memberof com
     * @namespace
     */
    const opensource = {}

    opensource.svga = (function () {
      /**
       * Namespace svga.
       * @memberof com.opensource
       * @namespace
       */
      const svga = {}

      svga.MovieParams = (function () {
        /**
         * Properties of a MovieParams.
         * @memberof com.opensource.svga
         * @interface IMovieParams
         * @property {number|null} [viewBoxWidth] MovieParams viewBoxWidth
         * @property {number|null} [viewBoxHeight] MovieParams viewBoxHeight
         * @property {number|null} [fps] MovieParams fps
         * @property {number|null} [frames] MovieParams frames
         */

        /**
         * Constructs a new MovieParams.
         * @memberof com.opensource.svga
         * @classdesc Represents a MovieParams.
         * @implements IMovieParams
         * @constructor
         * @param {com.opensource.svga.IMovieParams=} [properties] Properties to set
         */
        function MovieParams(properties) {
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * MovieParams viewBoxWidth.
         * @member {number} viewBoxWidth
         * @memberof com.opensource.svga.MovieParams
         * @instance
         */
        MovieParams.prototype.viewBoxWidth = 0

        /**
         * MovieParams viewBoxHeight.
         * @member {number} viewBoxHeight
         * @memberof com.opensource.svga.MovieParams
         * @instance
         */
        MovieParams.prototype.viewBoxHeight = 0

        /**
         * MovieParams fps.
         * @member {number} fps
         * @memberof com.opensource.svga.MovieParams
         * @instance
         */
        MovieParams.prototype.fps = 0

        /**
         * MovieParams frames.
         * @member {number} frames
         * @memberof com.opensource.svga.MovieParams
         * @instance
         */
        MovieParams.prototype.frames = 0

        /**
         * Creates a new MovieParams instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.MovieParams
         * @static
         * @param {com.opensource.svga.IMovieParams=} [properties] Properties to set
         * @returns {com.opensource.svga.MovieParams} MovieParams instance
         */
        MovieParams.create = function create(properties) {
          return new MovieParams(properties)
        }

        /**
         * Decodes a MovieParams message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.MovieParams
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.MovieParams} MovieParams
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MovieParams.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.MovieParams()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.viewBoxWidth = reader.float()
                break
              }
              case 2: {
                message.viewBoxHeight = reader.float()
                break
              }
              case 3: {
                message.fps = reader.int32()
                break
              }
              case 4: {
                message.frames = reader.int32()
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return MovieParams
      })()

      svga.Layout = (function () {
        /**
         * Properties of a Layout.
         * @memberof com.opensource.svga
         * @interface ILayout
         * @property {number|null} [x] Layout x
         * @property {number|null} [y] Layout y
         * @property {number|null} [width] Layout width
         * @property {number|null} [height] Layout height
         */

        /**
         * Constructs a new Layout.
         * @memberof com.opensource.svga
         * @classdesc Represents a Layout.
         * @implements ILayout
         * @constructor
         * @param {com.opensource.svga.ILayout=} [properties] Properties to set
         */
        function Layout(properties) {
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * Layout x.
         * @member {number} x
         * @memberof com.opensource.svga.Layout
         * @instance
         */
        Layout.prototype.x = 0

        /**
         * Layout y.
         * @member {number} y
         * @memberof com.opensource.svga.Layout
         * @instance
         */
        Layout.prototype.y = 0

        /**
         * Layout width.
         * @member {number} width
         * @memberof com.opensource.svga.Layout
         * @instance
         */
        Layout.prototype.width = 0

        /**
         * Layout height.
         * @member {number} height
         * @memberof com.opensource.svga.Layout
         * @instance
         */
        Layout.prototype.height = 0

        /**
         * Creates a new Layout instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.Layout
         * @static
         * @param {com.opensource.svga.ILayout=} [properties] Properties to set
         * @returns {com.opensource.svga.Layout} Layout instance
         */
        Layout.create = function create(properties) {
          return new Layout(properties)
        }

        /**
         * Decodes a Layout message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.Layout
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.Layout} Layout
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Layout.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.Layout()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.x = reader.float()
                break
              }
              case 2: {
                message.y = reader.float()
                break
              }
              case 3: {
                message.width = reader.float()
                break
              }
              case 4: {
                message.height = reader.float()
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return Layout
      })()

      svga.Transform = (function () {
        /**
         * Properties of a Transform.
         * @memberof com.opensource.svga
         * @interface ITransform
         * @property {number|null} [a] Transform a
         * @property {number|null} [b] Transform b
         * @property {number|null} [c] Transform c
         * @property {number|null} [d] Transform d
         * @property {number|null} [tx] Transform tx
         * @property {number|null} [ty] Transform ty
         */

        /**
         * Constructs a new Transform.
         * @memberof com.opensource.svga
         * @classdesc Represents a Transform.
         * @implements ITransform
         * @constructor
         * @param {com.opensource.svga.ITransform=} [properties] Properties to set
         */
        function Transform(properties) {
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * Transform a.
         * @member {number} a
         * @memberof com.opensource.svga.Transform
         * @instance
         */
        Transform.prototype.a = 0

        /**
         * Transform b.
         * @member {number} b
         * @memberof com.opensource.svga.Transform
         * @instance
         */
        Transform.prototype.b = 0

        /**
         * Transform c.
         * @member {number} c
         * @memberof com.opensource.svga.Transform
         * @instance
         */
        Transform.prototype.c = 0

        /**
         * Transform d.
         * @member {number} d
         * @memberof com.opensource.svga.Transform
         * @instance
         */
        Transform.prototype.d = 0

        /**
         * Transform tx.
         * @member {number} tx
         * @memberof com.opensource.svga.Transform
         * @instance
         */
        Transform.prototype.tx = 0

        /**
         * Transform ty.
         * @member {number} ty
         * @memberof com.opensource.svga.Transform
         * @instance
         */
        Transform.prototype.ty = 0

        /**
         * Creates a new Transform instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.Transform
         * @static
         * @param {com.opensource.svga.ITransform=} [properties] Properties to set
         * @returns {com.opensource.svga.Transform} Transform instance
         */
        Transform.create = function create(properties) {
          return new Transform(properties)
        }

        /**
         * Decodes a Transform message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.Transform
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.Transform} Transform
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Transform.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.Transform()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.a = reader.float()
                break
              }
              case 2: {
                message.b = reader.float()
                break
              }
              case 3: {
                message.c = reader.float()
                break
              }
              case 4: {
                message.d = reader.float()
                break
              }
              case 5: {
                message.tx = reader.float()
                break
              }
              case 6: {
                message.ty = reader.float()
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return Transform
      })()

      svga.RGBAColor = (function () {
        /**
         * Properties of a RGBAColor.
         * @memberof com.opensource.svga
         * @interface IRGBAColor
         * @property {number|null} [r] RGBAColor r
         * @property {number|null} [g] RGBAColor g
         * @property {number|null} [b] RGBAColor b
         * @property {number|null} [a] RGBAColor a
         */

        /**
         * Constructs a new RGBAColor.
         * @memberof com.opensource.svga
         * @classdesc Represents a RGBAColor.
         * @implements IRGBAColor
         * @constructor
         * @param {com.opensource.svga.IRGBAColor=} [properties] Properties to set
         */
        function RGBAColor(properties) {
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * RGBAColor r.
         * @member {number} r
         * @memberof com.opensource.svga.RGBAColor
         * @instance
         */
        RGBAColor.prototype.r = 0

        /**
         * RGBAColor g.
         * @member {number} g
         * @memberof com.opensource.svga.RGBAColor
         * @instance
         */
        RGBAColor.prototype.g = 0

        /**
         * RGBAColor b.
         * @member {number} b
         * @memberof com.opensource.svga.RGBAColor
         * @instance
         */
        RGBAColor.prototype.b = 0

        /**
         * RGBAColor a.
         * @member {number} a
         * @memberof com.opensource.svga.RGBAColor
         * @instance
         */
        RGBAColor.prototype.a = 0

        /**
         * Creates a new RGBAColor instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.RGBAColor
         * @static
         * @param {com.opensource.svga.IRGBAColor=} [properties] Properties to set
         * @returns {com.opensource.svga.RGBAColor} RGBAColor instance
         */
        RGBAColor.create = function create(properties) {
          return new RGBAColor(properties)
        }

        /**
         * Decodes a RGBAColor message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.RGBAColor
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.RGBAColor} RGBAColor
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RGBAColor.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.RGBAColor()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.r = reader.float()
                break
              }
              case 2: {
                message.g = reader.float()
                break
              }
              case 3: {
                message.b = reader.float()
                break
              }
              case 4: {
                message.a = reader.float()
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return RGBAColor
      })()

      /**
       * LineCap enum.
       * @name com.opensource.svga.LineCap
       * @enum {number}
       * @property {number} LineCap_BUTT=0 LineCap_BUTT value
       * @property {number} LineCap_ROUND=1 LineCap_ROUND value
       * @property {number} LineCap_SQUARE=2 LineCap_SQUARE value
       */
      svga.LineCap = (function () {
        const valuesById = {},
          values = Object.create(valuesById)
        values[(valuesById[0] = 'LineCap_BUTT')] = 0
        values[(valuesById[1] = 'LineCap_ROUND')] = 1
        values[(valuesById[2] = 'LineCap_SQUARE')] = 2
        return values
      })()

      /**
       * LineJoin enum.
       * @name com.opensource.svga.LineJoin
       * @enum {number}
       * @property {number} LineJoin_MITER=0 LineJoin_MITER value
       * @property {number} LineJoin_ROUND=1 LineJoin_ROUND value
       * @property {number} LineJoin_BEVEL=2 LineJoin_BEVEL value
       */
      svga.LineJoin = (function () {
        const valuesById = {},
          values = Object.create(valuesById)
        values[(valuesById[0] = 'LineJoin_MITER')] = 0
        values[(valuesById[1] = 'LineJoin_ROUND')] = 1
        values[(valuesById[2] = 'LineJoin_BEVEL')] = 2
        return values
      })()

      svga.ShapeStyle = (function () {
        /**
         * Properties of a ShapeStyle.
         * @memberof com.opensource.svga
         * @interface IShapeStyle
         * @property {com.opensource.svga.IRGBAColor|null} [fill] ShapeStyle fill
         * @property {com.opensource.svga.IRGBAColor|null} [stroke] ShapeStyle stroke
         * @property {number|null} [strokeWidth] ShapeStyle strokeWidth
         * @property {com.opensource.svga.LineCap|null} [lineCap] ShapeStyle lineCap
         * @property {com.opensource.svga.LineJoin|null} [lineJoin] ShapeStyle lineJoin
         * @property {number|null} [miterLimit] ShapeStyle miterLimit
         * @property {number|null} [lineDashI] ShapeStyle lineDashI
         * @property {number|null} [lineDashII] ShapeStyle lineDashII
         * @property {number|null} [lineDashIII] ShapeStyle lineDashIII
         */

        /**
         * Constructs a new ShapeStyle.
         * @memberof com.opensource.svga
         * @classdesc Represents a ShapeStyle.
         * @implements IShapeStyle
         * @constructor
         * @param {com.opensource.svga.IShapeStyle=} [properties] Properties to set
         */
        function ShapeStyle(properties) {
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * ShapeStyle fill.
         * @member {com.opensource.svga.IRGBAColor|null|undefined} fill
         * @memberof com.opensource.svga.ShapeStyle
         * @instance
         */
        ShapeStyle.prototype.fill = null

        /**
         * ShapeStyle stroke.
         * @member {com.opensource.svga.IRGBAColor|null|undefined} stroke
         * @memberof com.opensource.svga.ShapeStyle
         * @instance
         */
        ShapeStyle.prototype.stroke = null

        /**
         * ShapeStyle strokeWidth.
         * @member {number} strokeWidth
         * @memberof com.opensource.svga.ShapeStyle
         * @instance
         */
        ShapeStyle.prototype.strokeWidth = 0

        /**
         * ShapeStyle lineCap.
         * @member {com.opensource.svga.LineCap} lineCap
         * @memberof com.opensource.svga.ShapeStyle
         * @instance
         */
        ShapeStyle.prototype.lineCap = 0

        /**
         * ShapeStyle lineJoin.
         * @member {com.opensource.svga.LineJoin} lineJoin
         * @memberof com.opensource.svga.ShapeStyle
         * @instance
         */
        ShapeStyle.prototype.lineJoin = 0

        /**
         * ShapeStyle miterLimit.
         * @member {number} miterLimit
         * @memberof com.opensource.svga.ShapeStyle
         * @instance
         */
        ShapeStyle.prototype.miterLimit = 0

        /**
         * ShapeStyle lineDashI.
         * @member {number} lineDashI
         * @memberof com.opensource.svga.ShapeStyle
         * @instance
         */
        ShapeStyle.prototype.lineDashI = 0

        /**
         * ShapeStyle lineDashII.
         * @member {number} lineDashII
         * @memberof com.opensource.svga.ShapeStyle
         * @instance
         */
        ShapeStyle.prototype.lineDashII = 0

        /**
         * ShapeStyle lineDashIII.
         * @member {number} lineDashIII
         * @memberof com.opensource.svga.ShapeStyle
         * @instance
         */
        ShapeStyle.prototype.lineDashIII = 0

        /**
         * Creates a new ShapeStyle instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.ShapeStyle
         * @static
         * @param {com.opensource.svga.IShapeStyle=} [properties] Properties to set
         * @returns {com.opensource.svga.ShapeStyle} ShapeStyle instance
         */
        ShapeStyle.create = function create(properties) {
          return new ShapeStyle(properties)
        }

        /**
         * Decodes a ShapeStyle message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.ShapeStyle
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.ShapeStyle} ShapeStyle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ShapeStyle.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.ShapeStyle()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.fill = $root.com.opensource.svga.RGBAColor.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              case 2: {
                message.stroke = $root.com.opensource.svga.RGBAColor.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              case 3: {
                message.strokeWidth = reader.float()
                break
              }
              case 4: {
                message.lineCap = reader.int32()
                break
              }
              case 5: {
                message.lineJoin = reader.int32()
                break
              }
              case 6: {
                message.miterLimit = reader.float()
                break
              }
              case 7: {
                message.lineDashI = reader.float()
                break
              }
              case 8: {
                message.lineDashII = reader.float()
                break
              }
              case 9: {
                message.lineDashIII = reader.float()
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return ShapeStyle
      })()

      /**
       * ShapeType enum.
       * @name com.opensource.svga.ShapeType
       * @enum {number}
       * @property {number} SHAPE=0 SHAPE value
       * @property {number} RECT=1 RECT value
       * @property {number} ELLIPSE=2 ELLIPSE value
       * @property {number} KEEP=3 KEEP value
       */
      svga.ShapeType = (function () {
        const valuesById = {},
          values = Object.create(valuesById)
        values[(valuesById[0] = 'SHAPE')] = 0
        values[(valuesById[1] = 'RECT')] = 1
        values[(valuesById[2] = 'ELLIPSE')] = 2
        values[(valuesById[3] = 'KEEP')] = 3
        return values
      })()

      svga.ShapeArgs = (function () {
        /**
         * Properties of a ShapeArgs.
         * @memberof com.opensource.svga
         * @interface IShapeArgs
         * @property {string|null} [d] ShapeArgs d
         */

        /**
         * Constructs a new ShapeArgs.
         * @memberof com.opensource.svga
         * @classdesc Represents a ShapeArgs.
         * @implements IShapeArgs
         * @constructor
         * @param {com.opensource.svga.IShapeArgs=} [properties] Properties to set
         */
        function ShapeArgs(properties) {
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * ShapeArgs d.
         * @member {string} d
         * @memberof com.opensource.svga.ShapeArgs
         * @instance
         */
        ShapeArgs.prototype.d = ''

        /**
         * Creates a new ShapeArgs instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.ShapeArgs
         * @static
         * @param {com.opensource.svga.IShapeArgs=} [properties] Properties to set
         * @returns {com.opensource.svga.ShapeArgs} ShapeArgs instance
         */
        ShapeArgs.create = function create(properties) {
          return new ShapeArgs(properties)
        }

        /**
         * Decodes a ShapeArgs message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.ShapeArgs
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.ShapeArgs} ShapeArgs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ShapeArgs.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.ShapeArgs()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.d = reader.string()
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return ShapeArgs
      })()

      svga.RectArgs = (function () {
        /**
         * Properties of a RectArgs.
         * @memberof com.opensource.svga
         * @interface IRectArgs
         * @property {number|null} [x] RectArgs x
         * @property {number|null} [y] RectArgs y
         * @property {number|null} [width] RectArgs width
         * @property {number|null} [height] RectArgs height
         * @property {number|null} [cornerRadius] RectArgs cornerRadius
         */

        /**
         * Constructs a new RectArgs.
         * @memberof com.opensource.svga
         * @classdesc Represents a RectArgs.
         * @implements IRectArgs
         * @constructor
         * @param {com.opensource.svga.IRectArgs=} [properties] Properties to set
         */
        function RectArgs(properties) {
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * RectArgs x.
         * @member {number} x
         * @memberof com.opensource.svga.RectArgs
         * @instance
         */
        RectArgs.prototype.x = 0

        /**
         * RectArgs y.
         * @member {number} y
         * @memberof com.opensource.svga.RectArgs
         * @instance
         */
        RectArgs.prototype.y = 0

        /**
         * RectArgs width.
         * @member {number} width
         * @memberof com.opensource.svga.RectArgs
         * @instance
         */
        RectArgs.prototype.width = 0

        /**
         * RectArgs height.
         * @member {number} height
         * @memberof com.opensource.svga.RectArgs
         * @instance
         */
        RectArgs.prototype.height = 0

        /**
         * RectArgs cornerRadius.
         * @member {number} cornerRadius
         * @memberof com.opensource.svga.RectArgs
         * @instance
         */
        RectArgs.prototype.cornerRadius = 0

        /**
         * Creates a new RectArgs instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.RectArgs
         * @static
         * @param {com.opensource.svga.IRectArgs=} [properties] Properties to set
         * @returns {com.opensource.svga.RectArgs} RectArgs instance
         */
        RectArgs.create = function create(properties) {
          return new RectArgs(properties)
        }

        /**
         * Decodes a RectArgs message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.RectArgs
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.RectArgs} RectArgs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RectArgs.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.RectArgs()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.x = reader.float()
                break
              }
              case 2: {
                message.y = reader.float()
                break
              }
              case 3: {
                message.width = reader.float()
                break
              }
              case 4: {
                message.height = reader.float()
                break
              }
              case 5: {
                message.cornerRadius = reader.float()
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return RectArgs
      })()

      svga.EllipseArgs = (function () {
        /**
         * Properties of an EllipseArgs.
         * @memberof com.opensource.svga
         * @interface IEllipseArgs
         * @property {number|null} [x] EllipseArgs x
         * @property {number|null} [y] EllipseArgs y
         * @property {number|null} [radiusX] EllipseArgs radiusX
         * @property {number|null} [radiusY] EllipseArgs radiusY
         */

        /**
         * Constructs a new EllipseArgs.
         * @memberof com.opensource.svga
         * @classdesc Represents an EllipseArgs.
         * @implements IEllipseArgs
         * @constructor
         * @param {com.opensource.svga.IEllipseArgs=} [properties] Properties to set
         */
        function EllipseArgs(properties) {
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * EllipseArgs x.
         * @member {number} x
         * @memberof com.opensource.svga.EllipseArgs
         * @instance
         */
        EllipseArgs.prototype.x = 0

        /**
         * EllipseArgs y.
         * @member {number} y
         * @memberof com.opensource.svga.EllipseArgs
         * @instance
         */
        EllipseArgs.prototype.y = 0

        /**
         * EllipseArgs radiusX.
         * @member {number} radiusX
         * @memberof com.opensource.svga.EllipseArgs
         * @instance
         */
        EllipseArgs.prototype.radiusX = 0

        /**
         * EllipseArgs radiusY.
         * @member {number} radiusY
         * @memberof com.opensource.svga.EllipseArgs
         * @instance
         */
        EllipseArgs.prototype.radiusY = 0

        /**
         * Creates a new EllipseArgs instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.EllipseArgs
         * @static
         * @param {com.opensource.svga.IEllipseArgs=} [properties] Properties to set
         * @returns {com.opensource.svga.EllipseArgs} EllipseArgs instance
         */
        EllipseArgs.create = function create(properties) {
          return new EllipseArgs(properties)
        }

        /**
         * Decodes an EllipseArgs message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.EllipseArgs
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.EllipseArgs} EllipseArgs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EllipseArgs.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.EllipseArgs()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.x = reader.float()
                break
              }
              case 2: {
                message.y = reader.float()
                break
              }
              case 3: {
                message.radiusX = reader.float()
                break
              }
              case 4: {
                message.radiusY = reader.float()
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return EllipseArgs
      })()

      svga.ShapeEntity = (function () {
        /**
         * Properties of a ShapeEntity.
         * @memberof com.opensource.svga
         * @interface IShapeEntity
         * @property {com.opensource.svga.ShapeType|null} [type] ShapeEntity type
         * @property {com.opensource.svga.IShapeArgs|null} [shape] ShapeEntity shape
         * @property {com.opensource.svga.IRectArgs|null} [rect] ShapeEntity rect
         * @property {com.opensource.svga.IEllipseArgs|null} [ellipse] ShapeEntity ellipse
         * @property {com.opensource.svga.IShapeStyle|null} [styles] ShapeEntity styles
         * @property {com.opensource.svga.ITransform|null} [transform] ShapeEntity transform
         */

        /**
         * Constructs a new ShapeEntity.
         * @memberof com.opensource.svga
         * @classdesc Represents a ShapeEntity.
         * @implements IShapeEntity
         * @constructor
         * @param {com.opensource.svga.IShapeEntity=} [properties] Properties to set
         */
        function ShapeEntity(properties) {
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * ShapeEntity type.
         * @member {com.opensource.svga.ShapeType} type
         * @memberof com.opensource.svga.ShapeEntity
         * @instance
         */
        ShapeEntity.prototype.type = 0

        /**
         * ShapeEntity shape.
         * @member {com.opensource.svga.IShapeArgs|null|undefined} shape
         * @memberof com.opensource.svga.ShapeEntity
         * @instance
         */
        ShapeEntity.prototype.shape = null

        /**
         * ShapeEntity rect.
         * @member {com.opensource.svga.IRectArgs|null|undefined} rect
         * @memberof com.opensource.svga.ShapeEntity
         * @instance
         */
        ShapeEntity.prototype.rect = null

        /**
         * ShapeEntity ellipse.
         * @member {com.opensource.svga.IEllipseArgs|null|undefined} ellipse
         * @memberof com.opensource.svga.ShapeEntity
         * @instance
         */
        ShapeEntity.prototype.ellipse = null

        /**
         * ShapeEntity styles.
         * @member {com.opensource.svga.IShapeStyle|null|undefined} styles
         * @memberof com.opensource.svga.ShapeEntity
         * @instance
         */
        ShapeEntity.prototype.styles = null

        /**
         * ShapeEntity transform.
         * @member {com.opensource.svga.ITransform|null|undefined} transform
         * @memberof com.opensource.svga.ShapeEntity
         * @instance
         */
        ShapeEntity.prototype.transform = null

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields

        /**
         * ShapeEntity args.
         * @member {"shape"|"rect"|"ellipse"|undefined} args
         * @memberof com.opensource.svga.ShapeEntity
         * @instance
         */
        Object.defineProperty(ShapeEntity.prototype, 'args', {
          get: $util.oneOfGetter(($oneOfFields = ['shape', 'rect', 'ellipse'])),
          set: $util.oneOfSetter($oneOfFields)
        })

        /**
         * Creates a new ShapeEntity instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.ShapeEntity
         * @static
         * @param {com.opensource.svga.IShapeEntity=} [properties] Properties to set
         * @returns {com.opensource.svga.ShapeEntity} ShapeEntity instance
         */
        ShapeEntity.create = function create(properties) {
          return new ShapeEntity(properties)
        }

        /**
         * Decodes a ShapeEntity message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.ShapeEntity
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.ShapeEntity} ShapeEntity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ShapeEntity.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.ShapeEntity()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.type = reader.int32()
                break
              }
              case 2: {
                message.shape = $root.com.opensource.svga.ShapeArgs.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              case 3: {
                message.rect = $root.com.opensource.svga.RectArgs.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              case 4: {
                message.ellipse = $root.com.opensource.svga.EllipseArgs.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              case 10: {
                message.styles = $root.com.opensource.svga.ShapeStyle.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              case 11: {
                message.transform = $root.com.opensource.svga.Transform.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return ShapeEntity
      })()

      svga.FrameEntity = (function () {
        /**
         * Properties of a FrameEntity.
         * @memberof com.opensource.svga
         * @interface IFrameEntity
         * @property {number|null} [alpha] FrameEntity alpha
         * @property {com.opensource.svga.ILayout|null} [layout] FrameEntity layout
         * @property {com.opensource.svga.ITransform|null} [transform] FrameEntity transform
         * @property {string|null} [clipPath] FrameEntity clipPath
         * @property {Array.<com.opensource.svga.IShapeEntity>|null} [shapes] FrameEntity shapes
         */

        /**
         * Constructs a new FrameEntity.
         * @memberof com.opensource.svga
         * @classdesc Represents a FrameEntity.
         * @implements IFrameEntity
         * @constructor
         * @param {com.opensource.svga.IFrameEntity=} [properties] Properties to set
         */
        function FrameEntity(properties) {
          this.shapes = []
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * FrameEntity alpha.
         * @member {number} alpha
         * @memberof com.opensource.svga.FrameEntity
         * @instance
         */
        FrameEntity.prototype.alpha = 0

        /**
         * FrameEntity layout.
         * @member {com.opensource.svga.ILayout|null|undefined} layout
         * @memberof com.opensource.svga.FrameEntity
         * @instance
         */
        FrameEntity.prototype.layout = null

        /**
         * FrameEntity transform.
         * @member {com.opensource.svga.ITransform|null|undefined} transform
         * @memberof com.opensource.svga.FrameEntity
         * @instance
         */
        FrameEntity.prototype.transform = null

        /**
         * FrameEntity clipPath.
         * @member {string} clipPath
         * @memberof com.opensource.svga.FrameEntity
         * @instance
         */
        FrameEntity.prototype.clipPath = ''

        /**
         * FrameEntity shapes.
         * @member {Array.<com.opensource.svga.IShapeEntity>} shapes
         * @memberof com.opensource.svga.FrameEntity
         * @instance
         */
        FrameEntity.prototype.shapes = $util.emptyArray

        /**
         * Creates a new FrameEntity instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.FrameEntity
         * @static
         * @param {com.opensource.svga.IFrameEntity=} [properties] Properties to set
         * @returns {com.opensource.svga.FrameEntity} FrameEntity instance
         */
        FrameEntity.create = function create(properties) {
          return new FrameEntity(properties)
        }

        /**
         * Decodes a FrameEntity message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.FrameEntity
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.FrameEntity} FrameEntity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FrameEntity.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.FrameEntity()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.alpha = reader.float()
                break
              }
              case 2: {
                message.layout = $root.com.opensource.svga.Layout.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              case 3: {
                message.transform = $root.com.opensource.svga.Transform.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              case 4: {
                message.clipPath = reader.string()
                break
              }
              case 5: {
                if (!(message.shapes && message.shapes.length))
                  message.shapes = []
                message.shapes.push(
                  $root.com.opensource.svga.ShapeEntity.decode(
                    reader,
                    reader.uint32()
                  )
                )
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return FrameEntity
      })()

      svga.SpriteEntity = (function () {
        /**
         * Properties of a SpriteEntity.
         * @memberof com.opensource.svga
         * @interface ISpriteEntity
         * @property {string|null} [imageKey] SpriteEntity imageKey
         * @property {Array.<com.opensource.svga.IFrameEntity>|null} [frames] SpriteEntity frames
         */

        /**
         * Constructs a new SpriteEntity.
         * @memberof com.opensource.svga
         * @classdesc Represents a SpriteEntity.
         * @implements ISpriteEntity
         * @constructor
         * @param {com.opensource.svga.ISpriteEntity=} [properties] Properties to set
         */
        function SpriteEntity(properties) {
          this.frames = []
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * SpriteEntity imageKey.
         * @member {string} imageKey
         * @memberof com.opensource.svga.SpriteEntity
         * @instance
         */
        SpriteEntity.prototype.imageKey = ''

        /**
         * SpriteEntity frames.
         * @member {Array.<com.opensource.svga.IFrameEntity>} frames
         * @memberof com.opensource.svga.SpriteEntity
         * @instance
         */
        SpriteEntity.prototype.frames = $util.emptyArray

        /**
         * Creates a new SpriteEntity instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.SpriteEntity
         * @static
         * @param {com.opensource.svga.ISpriteEntity=} [properties] Properties to set
         * @returns {com.opensource.svga.SpriteEntity} SpriteEntity instance
         */
        SpriteEntity.create = function create(properties) {
          return new SpriteEntity(properties)
        }

        /**
         * Decodes a SpriteEntity message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.SpriteEntity
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.SpriteEntity} SpriteEntity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SpriteEntity.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.SpriteEntity()
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.imageKey = reader.string()
                break
              }
              case 2: {
                if (!(message.frames && message.frames.length))
                  message.frames = []
                message.frames.push(
                  $root.com.opensource.svga.FrameEntity.decode(
                    reader,
                    reader.uint32()
                  )
                )
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return SpriteEntity
      })()

      svga.MovieEntity = (function () {
        /**
         * Properties of a MovieEntity.
         * @memberof com.opensource.svga
         * @interface IMovieEntity
         * @property {string|null} [version] MovieEntity version
         * @property {com.opensource.svga.IMovieParams|null} [params] MovieEntity params
         * @property {Object.<string,Uint8Array>|null} [images] MovieEntity images
         * @property {Array.<com.opensource.svga.ISpriteEntity>|null} [sprites] MovieEntity sprites
         */

        /**
         * Constructs a new MovieEntity.
         * @memberof com.opensource.svga
         * @classdesc Represents a MovieEntity.
         * @implements IMovieEntity
         * @constructor
         * @param {com.opensource.svga.IMovieEntity=} [properties] Properties to set
         */
        function MovieEntity(properties) {
          this.images = {}
          this.sprites = []
          if (properties)
            for (
              let keys = Object.keys(properties), i = 0;
              i < keys.length;
              ++i
            )
              if (properties[keys[i]] != null)
                this[keys[i]] = properties[keys[i]]
        }

        /**
         * MovieEntity version.
         * @member {string} version
         * @memberof com.opensource.svga.MovieEntity
         * @instance
         */
        MovieEntity.prototype.version = ''

        /**
         * MovieEntity params.
         * @member {com.opensource.svga.IMovieParams|null|undefined} params
         * @memberof com.opensource.svga.MovieEntity
         * @instance
         */
        MovieEntity.prototype.params = null

        /**
         * MovieEntity images.
         * @member {Object.<string,Uint8Array>} images
         * @memberof com.opensource.svga.MovieEntity
         * @instance
         */
        MovieEntity.prototype.images = $util.emptyObject

        /**
         * MovieEntity sprites.
         * @member {Array.<com.opensource.svga.ISpriteEntity>} sprites
         * @memberof com.opensource.svga.MovieEntity
         * @instance
         */
        MovieEntity.prototype.sprites = $util.emptyArray

        /**
         * Creates a new MovieEntity instance using the specified properties.
         * @function create
         * @memberof com.opensource.svga.MovieEntity
         * @static
         * @param {com.opensource.svga.IMovieEntity=} [properties] Properties to set
         * @returns {com.opensource.svga.MovieEntity} MovieEntity instance
         */
        MovieEntity.create = function create(properties) {
          return new MovieEntity(properties)
        }

        /**
         * Decodes a MovieEntity message from the specified reader or buffer.
         * @function decode
         * @memberof com.opensource.svga.MovieEntity
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {com.opensource.svga.MovieEntity} MovieEntity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MovieEntity.decode = function decode(reader, length, error) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.com.opensource.svga.MovieEntity(),
            key,
            value
          while (reader.pos < end) {
            let tag = reader.uint32()
            if (tag === error) break
            switch (tag >>> 3) {
              case 1: {
                message.version = reader.string()
                break
              }
              case 2: {
                message.params = $root.com.opensource.svga.MovieParams.decode(
                  reader,
                  reader.uint32()
                )
                break
              }
              case 3: {
                if (message.images === $util.emptyObject) message.images = {}
                let end2 = reader.uint32() + reader.pos
                key = ''
                value = []
                while (reader.pos < end2) {
                  let tag2 = reader.uint32()
                  switch (tag2 >>> 3) {
                    case 1:
                      key = reader.string()
                      break
                    case 2:
                      value = reader.bytes()
                      break
                    default:
                      reader.skipType(tag2 & 7)
                      break
                  }
                }
                message.images[key] = value
                break
              }
              case 4: {
                if (!(message.sprites && message.sprites.length))
                  message.sprites = []
                message.sprites.push(
                  $root.com.opensource.svga.SpriteEntity.decode(
                    reader,
                    reader.uint32()
                  )
                )
                break
              }
              default:
                reader.skipType(tag & 7)
                break
            }
          }
          return message
        }

        return MovieEntity
      })()

      return svga
    })()

    return opensource
  })()

  return com
})())

export { $root as default }
