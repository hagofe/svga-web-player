# Changelog

This repository starts from a public source snapshot. Earlier release notes are
kept without links to the source-control system that produced them.

## 2.6.9 (2026-07-22)


### Bug Fixes

* **parser:** diagnose Vite optimizer misconfiguration

## 2.6.8 (2026-07-21)

## 2.6.7 (2026-07-21)


### Bug Fixes

* **parser:** cancel active main-thread fallback
* **parser:** circuit-break unavailable workers
* **parser:** close worker fallback races
* **parser:** fall back when worker channel fails
* **parser:** recover invalid worker responses

## Unreleased

### Bug Fixes

* recover JS parsing on the main thread when the Worker channel is unavailable

## 2.6.6 (2026-07-15)


### Bug Fixes

* clean up player visibility observer lifecycle

## 2.6.5 (2026-06-01)


### Bug Fixes

* resolve lazy keep frames

## 2.6.4 (2026-05-26)


### Bug Fixes

* improve image bitmap handling by checking for ImageBitmap support

## 2.6.3 (2026-02-09)


### Bug Fixes

* worker文件改成同源加载

## 2.6.2 (2026-01-30)


### Bug Fixes

* 回滚实现，实际上是vconsole影响的

## 2.6.1 (2026-01-29)


### Bug Fixes

* 尝试改成直接fetch加载传递arrayBuffer
* 显示传递wasm路径尝试修复项目构建后初始化wasm报错

# 2.6.0 (2026-01-23)


### Features

* 增加log模块，补充关键节点的log日志

# 2.5.0 (2026-01-21)


### Features

* 为播放器容器添加 data-renderer 属性并更新 README 文档

## 2.4.2 (2026-01-20)


### Bug Fixes

* 导出worker文件和wasm文件
* 导出更多类型和枚举

## 2.4.1 (2026-01-14)


### Bug Fixes

* 修正动态元素插入错误

# 2.4.0 (2026-01-06)


### Bug Fixes

* resolve WebGL rendering issues with WASM and JS parsers
* 修复wasm parser无视了keep shape问题


### Features

* init & upgrade to use vite@8 and oxlint
