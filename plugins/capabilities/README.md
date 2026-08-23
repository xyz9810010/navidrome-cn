# Navidrome 插件能力

此目录包含 Navidrome 插件能力的 Go 接口定义。这些接口是插件开发的**唯一权威来源**（source of truth），用于生成：

1. **Go PDK 包**（`pdk/go/*/`）- 面向 Go 插件开发者的类型安全包装器
2. **Rust PDK crate**（`pdk/rust/*/`）- 面向 Rust 插件开发者的类型安全包装器
3. **XTP YAML 模式文件**（`*.yaml`）- 面向其他 [Extism 插件语言](https://extism.org/docs/concepts/pdk/)（TypeScript、Python、C#、Zig、C++……）的模式文件

## 面向 Go 插件开发者

Go 开发者应使用 `plugins/pdk/go/` 中生成的 PDK 包。用法示例请参阅 `plugins/examples/` 中的 Go 示例插件。

## 面向 Rust 插件开发者

Rust 开发者应使用 `plugins/pdk/rust/nd-pdk` 中生成的 PDK crate。用法示例请参阅 `plugins/examples` 中的 Rust 示例插件。

## 面向非 Go 插件开发者

如果你使用其他语言（TypeScript、Rust、Python、C#、Zig、C++）开发插件，可以使用 XTP CLI 从本目录中的 YAML 模式文件生成类型安全的绑定。

### 前置条件

安装 XTP CLI：

```bash
# macOS
brew install dylibso/tap/xtp

# Other platforms - see https://docs.xtp.dylibso.com/docs/cli
curl https://static.dylibso.com/cli/install.sh | bash
```

### 生成插件脚手架

使用 XTP CLI 从任意能力模式生成插件样板代码：

```bash
# TypeScript
xtp plugin init --schema-file plugins/capabilities/metadata_agent.yaml \
    --template typescript --path my-plugin

# Rust
xtp plugin init --schema-file plugins/capabilities/scrobbler.yaml \
    --template rust --path my-plugin

# Python
xtp plugin init --schema-file plugins/capabilities/lifecycle.yaml \
    --template python --path my-plugin

# C#
xtp plugin init --schema-file plugins/capabilities/scheduler_callback.yaml \
    --template csharp --path my-plugin

# Go (alternative to using the PDK packages)
xtp plugin init --schema-file plugins/capabilities/websocket_callback.yaml \
    --template go --path my-plugin
```

### 可用的能力

| 能力         | 模式文件               | 描述                                                 |
|--------------------|---------------------------|-------------------------------------------------------------|
| 元数据代理     | `metadata_agent.yaml`     | 获取艺人简介、专辑图片和相似艺人 |
| Scrobbler          | `scrobbler.yaml`          | 向外部服务上报收听活动              |
| 生命周期          | `lifecycle.yaml`          | 插件初始化回调                             |
| 调度回调 | `scheduler_callback.yaml` | 定时任务执行                                    |
| WebSocket 回调 | `websocket_callback.yaml` | 实时 WebSocket 消息处理                        |

### 构建你的插件

生成脚手架后，实现所需函数并将插件构建为 WebAssembly 模块。具体的构建过程取决于你选择的语言——请参阅 [Extism PDK 文档](https://extism.org/docs/concepts/pdk) 获取各语言的指南。

## XTP 模式生成

本包中的 YAML 模式由能力 Go 接口通过 `ndpgen` 自动生成。
修改接口后，运行以下命令重新生成模式：

```bash
cd plugins/cmd/ndpgen && go run . -schemas -input=../../capabilities -shared=../../types
```

## 资源

- [XTP 文档](https://docs.xtp.dylibso.com/)
- [XTP Bindgen 仓库](https://github.com/dylibso/xtp-bindgen)
- [Extism 插件开发套件](https://extism.org/docs/concepts/pdk)
- [XTP 模式定义](https://raw.githubusercontent.com/dylibso/xtp-bindgen/5090518dd86ba5e734dc225a33066ecc0ed2e12d/plugin/schema.json)
