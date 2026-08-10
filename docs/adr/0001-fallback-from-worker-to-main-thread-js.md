---
status: accepted
date: 2026-07-16
---

# Worker 通道失败时降级到主线程 JS

`Parser` 的自动解析策略以可用性为底线：保持现有 WASM 后端行为，在进入 JS 后端后优先使用 Worker；如果 Worker 构造、脚本执行或通信通道失败，则由 `JsParser` 使用同一 `parseWithCore` 实现在主线程完成解析。Worker 正常返回的资源解析失败不更换执行通道重试，显式 `parserStrategy: 'wasm'` 仍严格失败，`isDisableWebWorker: true` 仍直接使用主线程。

## Worker channel

- Worker 使用内部结构化请求和响应，通过 `requestId` 关联并发任务；协议、pending 状态和通道错误不进入公共接口。
- Worker 构造、脚本执行错误会使当前 pending 任务降级，并按 Worker URL 在当前页面触发熔断；刷新页面后重新尝试。单次 `postMessage` 失败只降级对应任务；无法关联请求的 `messageerror` 会重建当前通道并降级其中所有 pending 任务，但两者都不触发页面级熔断。
- 同一 Worker URL 首次降级输出 `warn`，后续降级输出 `debug`。不增加公共回调或配置。
- 不增加 READY 握手或解析超时；没有真实故障证据前，不为 Worker 无报错且永久无响应的理论情况增加协议和误判风险。

## Lifecycle and performance

- `destroy()` 终止当前 Worker，并以取消错误拒绝所有 pending 任务；取消不触发主线程降级。后续 `load()` 可以创建新的解析会话，不能恢复已取消任务。
- 自动主线程降级继续处于现有解析任务内，不新增并发队列；公开 `Parser` 仍受全局资源解析并发限制，单资源图片解码并发和 Player 播放不受影响。
- Vite 的 `optimizeDeps.exclude` 仍是正确集成要求。运行时降级只用于保证意外故障下的解析可用性，不能代替 WASM 和 Worker 的正确资源路径，也不能作为开发与生产路径不一致的常态方案。

## Development integration diagnostic

- 当 Player 模块位于 Vite 默认 optimizer 路径，并且 WASM 初始化或 Worker 执行通道实际失败时，浏览器控制台直接输出一次开发集成诊断，说明需要把 `@hagoss/svga-web-player` 加入 `optimizeDeps.exclude` 并使用 `--force` 重启 Vite。
- WASM 与 Worker 共用当前页面模块实例内的去重状态。诊断不经过 Player logger、不受 `setLogLevel()` 控制，也不新增公共 option、事件、错误码或 Vite plugin。
- 诊断只报告已确认的 Vite 配置问题，不说明后续降级是否成功；输出本身不抛异常，不参与解析策略、Worker 熔断或主线程恢复的状态决策。

## Verification

- 单元测试通过 `JsParser` 接口覆盖并发响应关联、解析失败、通道失败、熔断以及 `destroy()` 后重新使用。
- 真实 Vite dev 浏览器验证必须同时覆盖未 exclude 时通过主线程恢复播放，以及正确 exclude 时继续使用 WASM/Worker 且不触发降级。
