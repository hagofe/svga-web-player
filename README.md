# @hagoss/svga-web-player

> 基于 [SVGAPlayer-Web-Lite](https://github.com/svga/SVGAPlayer-Web-Lite) 深度重构的高性能 SVGA 播放器

这是一个 SVGA 在移动端 Web 上的播放器，它的目标是 **更轻量**、**更高效**

## ✨ 新特性

本项目在原 SVGAPlayer-Web-Lite 基础上进行了大幅重构，主要改进包括：

### 🚀 Rust/WASM 高性能解析器
- **WASM 体积仅 108KB**，支持流式加载
- 相比 JS 解析器 **2~4x 性能提升**
- 基于零拷贝数据传输（`#[repr(C)]` 结构体 + Arena 内存管理）
- 支持选择解析策略：`auto`（自动选择最优）、`wasm`（强制 WASM）、`js`（强制 JS）

### 🎮 WebGL 渲染器
- GPU 加速渲染，大幅提升复杂动画性能
- **Texture Atlas 自动打包** - 所有精灵图合并为单张纹理，减少 Draw Call
- **批量渲染 (Sprite Batching)** - 合并绘制调用
- **GPU Shape 渲染** - 矢量图形也可在 GPU 上渲染
- 共享 WebGL Context 单例，避免超过浏览器 16 个 Context 限制
- 支持 Canvas 2D 自动降级

### 📦 多实例资源管理
- **AssetManager** 全局资源缓存 - 多个 Player 实例共享解析结果和 ImageBitmap
- 引用计数自动释放 - 当最后一个使用者销毁时自动清理资源
- 避免重复下载和解析相同的 SVGA 文件

### ⚡ 并发控制
- **全局解析队列** - 限制并发解析数量（默认 2 个），防止内存峰值
- **图片解码并发** - 可配置 ImageBitmap 解码并发数

### 🔧 其他优化
- **SVG Path 预编译** - 加载时将 SVG 路径编译为指令数组，渲染时无需正则解析
- **Lazy Sprite Frames** - 帧数据按需从 WASM 内存读取，减少初始化开销
- **Hybrid Parser** - 统一的解析器接口，自动选择最优策略

### 🔮 未来计划
- [ ] WebGPU 渲染器（架构已就绪）

## 实现

- [x] 兼容 Android 4.4+ / iOS 9+
- [x] 更好的异步操作
- [x] 多线程 (WebWorker) 解析文件数据
- [x] OffscreenCanvas / ImageBitmap
- [x] Rust/WASM 高性能解析
- [x] WebGL GPU 加速渲染
- [x] 多实例资源缓存

### 📦 包体积

| 模块                    | 原始大小 | Gzip 后   | 说明                      |
| ----------------------- | -------- | --------- | ------------------------- |
| `index.mjs`             | 129 KB   | **30 KB** | 核心库（含 WebGL 渲染器） |
| `parser-worker.iife.js` | 60 KB    | **15 KB** | WebWorker (JS 解析)       |
| `svga_wasm_bg.wasm`     | 106 KB   | **43 KB** | WASM 解析器               |

**使用场景体积对比**：
- 🚀 **WASM 模式（推荐）**: ~73 KB gzip（核心库 + WASM）
- 📦 **纯 JS 模式**: ~45 KB gzip（核心库 + Worker）

> 💡 对比原版 SVGAPlayer-Web-Lite (55KB / gzip 18KB)，虽然增加了 WebGL 渲染器、AssetManager、并发控制等大量功能，但通过优化，核心库 gzip 后仅增加约 12KB。WASM 解析器额外 43KB 带来 2~4x 性能提升，性价比很高。

## 差异

* 不支持播放 SVGA 1.x 格式
* 不支持声音播放

## 安装

### NPM

```sh
pnpm add @hagoss/svga-web-player
# 或者
npm i @hagoss/svga-web-player
```

## 使用

### 简单使用

```html
<canvas id="canvas"></canvas>
```

```js
import { Parser, Player } from '@hagoss/svga-web-player'

const parser = new Parser()
const svga = await parser.load('xx.svga')

const player = new Player(document.getElementById('canvas'))
await player.mount(svga)

player.onStart = () => console.log('onStart')
player.onResume = () => console.log('onResume')
player.onPause = () => console.log('onPause')
player.onStop = () => console.log('onStop')
player.onProcess = () => console.log('onProcess', player.progress)
player.onEnd = () => console.log('onEnd')

// 开始播放动画
player.start()

// 暂停播放动画
// player.pause()

// 继续播放动画
// player.resume()

// 停止播放动画
// player.stop()

// 清空动画
// player.clear()

// 销毁
// parser.destroy()
// player.destroy()
```

### 使用 WebGL 渲染器

```js
import { Parser, Player, WebGLRenderer, CanvasRenderer } from '@hagoss/svga-web-player'

const parser = new Parser()
const svga = await parser.load('xx.svga')

// 使用 WebGL 渲染器
const player = new Player({
  container: document.getElementById('canvas'),
  renderers: [new WebGLRenderer(), new CanvasRenderer()]
})
await player.mount(svga)
player.start()
```

### 使用 AssetManager 多实例共享

```js
import { Parser, Player, assetManager } from '@hagoss/svga-web-player'

const parser = new Parser()

// 预加载并缓存
const svga = await assetManager.preload('xx.svga', (url) => parser.load(url))

// 创建多个 Player 共享同一份 VideoEntity
const player1 = new Player(canvas1)
const player2 = new Player(canvas2)

await player1.mount(svga)
await player2.mount(svga)

// 释放资源（引用计数为 0 时自动清理）
assetManager.release('xx.svga')
```

### ParserConfigOptions

```ts
new Parser({
  // 解析策略：'auto' | 'wasm' | 'js'
  // auto: 自动选择最优策略（WASM 优先，失败自动降级到 JS）
  // wasm: 强制使用 WASM
  // js: 强制使用 JS
  parserStrategy: 'auto',

  // 全局解析并发限制，防止内存峰值，默认值 2
  globalConcurrencyLimit: 2,

  // 图片解码并发数，默认值 6
  maxImageDecodeConcurrency: 6,

  // 是否取消使用 WebWorker，默认值 false
  isDisableWebWorker: false,

  // 是否取消使用 ImageBitmap，默认值 false
  isDisableImageBitmapShim: false
})
```

### PlayerConfigOptions

```ts
const enum PLAYER_FILL_MODE {
  // 播放完成后停在首帧
  FORWARDS = 'forwards',
  // 播放完成后停在尾帧
  BACKWARDS = 'backwards'
}

const enum PLAYER_PLAY_MODE {
  // 顺序播放
  FORWARDS = 'forwards',
  // 倒序播放
  FALLBACKS = 'fallbacks'
}

new Player({
  // 播放动画的 Canvas 元素
  container?: HTMLCanvasElement

  // 循环次数，默认值 0（无限循环）
  loop?: number | boolean

  // 最后停留的目标模式，默认值 forwards
  // 类似于 https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode
  fillMode?: PLAYER_FILL_MODE

  // 播放模式，默认值 forwards
  playMode?: PLAYER_PLAY_MODE

  // 开始播放的帧数，默认值 0
  startFrame?: number

  // 结束播放的帧数，默认值 0
  endFrame?: number

  // 循环播放开始的帧数，可设置每次循环从中间开始。默认值 0，每次播放到 endFrame 后，跳转到此帧开始循环，若此值小于 startFrame 则不生效
  // 类似于 https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loopStart
  loopStartFrame?: number

  // 是否开启缓存已播放过的帧数据，默认值 false
  // 开启后对已绘制的帧进行缓存，提升重复播放动画性能
  isCacheFrames?: boolean

  // 是否开启动画容器视窗检测，默认值 false
  // 开启后利用 Intersection Observer API 检测动画容器是否处于视窗内，若处于视窗外，停止描绘渲染帧避免造成资源消耗
  // https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API
  isUseIntersectionObserver?: boolean

  // 是否使用避免执行延迟，默认值 false
  // 开启后使用 `WebWorker` 确保动画按时执行（避免个别情况下浏览器延迟或停止执行动画任务）
  // https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API#Policies_in_place_to_aid_background_page_performance
  isOpenNoExecutionDelay?: boolean
})
```

### 替换元素 / 插入动态元素

可通过修改解析后的数据元，从而实现修改元素、插入动态元素功能

```js
const svga = await parser.load('xx.svga')

// 替换元素
const image = new Image()
image.src = 'https://xxx.com/xxx.png'
svga.replaceElements['key'] = image

// 动态元素
const text = 'hello gg'
const fontCanvas = document.getElementById('font')
const fontContext = fontCanvas.getContext('2d')
fontCanvas.height = 30
fontContext.font = '30px Arial'
fontContext.textAlign = 'center'
fontContext.textBaseline = 'middle'
fontContext.fillStyle = '#000'
fontContext.fillText(text, fontCanvas.clientWidth / 2, fontCanvas.clientHeight / 2)
svga.dynamicElements['key'] = fontCanvas

await player.mount(svga)
```

### DB

利用 [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) 进行持久化缓存已下载并解析的数据元，可避免重复消耗资源对相同 SVGA 下载和解析

```js
import { DB } from '@hagoss/svga-web-player'

try {
  const url = 'xx.svga'
  const db = new DB()
  let svga = await db.find(url)
  if (!svga) {
    // Parser 需要配置取消使用 ImageBitmap 特性，ImageBitmap 数据无法直接存储到 DB 内
    const parser = new Parser({ isDisableImageBitmapShim: true })
    svga = await parser.load(url)
    await db.insert(url, svga)
  }
  await player.mount(svga)
} catch (error) {
  console.error(error)
}
```

## TypeScript 声明 SVGA 文件

```ts
// global.d.ts
declare module '*.svga'
```

## Webpack SVGA

SVGA 文件可用 [url-loader](https://www.npmjs.com/package/raw-loader) 配置 Webpack 进行打包构建，例如：

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.svga$/i,
        use: 'url-loader'
      }
    ]
  }
}

// js
import { Parser } from '@hagoss/svga-web-player'
import xx from './xx.svga'
const parser = new Parser()
const svga = await parser.load(xx)
```

## Vite SVGA

SVGA 文件可通过配置 Vite 作为 [静态资源](https://vitejs.dev/guide/assets.html#explicit-url-imports) 打包构建。

> **⚠️ 重要**：由于本库使用 `new URL(..., import.meta.url)` 模式加载 WASM 和 Worker 文件，Vite 的依赖预构建会破坏这些动态资源路径。**必须**将本库排除在预构建之外：

```js
// vite.config.ts
export default defineConfig({
  // 必须：排除预构建，否则 dev 环境无法正确加载 WASM 和 Worker
  optimizeDeps: {
    exclude: ['@hagoss/svga-web-player']
  },
  // 可选：将 .svga 文件作为静态资源处理
  assetsInclude: ['**/*.svga']
})

// js
import { Parser } from '@hagoss/svga-web-player'
import xx from './xx.svga?url'
const parser = new Parser()
const svga = await parser.load(xx)
```

## [VSCode Plugin SVGA Preview](https://marketplace.visualstudio.com/items?itemName=svga-perview.svga-perview)

在 VSCode 编辑器预览 SVGA 文件，感谢 [@ETTTTT](https://github.com/ETTTTT) 提供。

## 贡献

我们感谢社区提供错误修正和改进。

### 环境要求

- Node.js v18+
- pnpm v9+
- Rust + wasm-pack（仅开发需要）

```sh
# 安装 wasm-pack (如果没有安装)
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# 安装依赖
pnpm install

# 开发模式（启动本地服务器）
pnpm dev

# 类型检查
pnpm type:check

# 代码检查
pnpm lint

# 编译 WASM
pnpm build:wasm

# 构建
pnpm build
```

## 致谢

本项目基于 [SVGAPlayer-Web-Lite](https://github.com/svga/SVGAPlayer-Web-Lite) 开发，感谢原作者的贡献。

## 许可证

本项目采用 [Apache License 2.0](./LICENSE) 发布。第三方来源及修改说明见 [NOTICE](./NOTICE)。
