<div align="center">

![new-api](/web/default/public/logo.png)

# 鼠鼠🐭公益站-------基于NEW-API进行二次开发


🍥 **下一代 AI 网关 — 统一接入 40+ 大模型供应商**

<p align="center">
  <strong>简体中文</strong> |
  <a href="./README.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/QuantumNous/new-api/releases/latest">
    <img src="https://img.shields.io/github/v/release/QuantumNous/new-api?color=brightgreen&include_prereleases" alt="release">
  </a>
  <a href="https://github.com/QuantumNous/new-api/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/QuantumNous/new-api?color=brightgreen" alt="license">
  </a>
  <a href="https://goreportcard.com/report/github.com/QuantumNous/new-api">
    <img src="https://goreportcard.com/badge/github.com/QuantumNous/new-api" alt="GoReportCard">
  </a>
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> •
  <a href="#-主要特性">主要特性</a> •
  <a href="#-部署">部署</a> •
  <a href="#-系统架构">系统架构</a> •
  <a href="#-文档">文档</a>
</p>

</div>

> [!NOTE]
> **本项目是基于 [NEW-API](https://github.com/Calcium-Ion/new-api) 的社区分支，由 [Calcium-Ion](https://github.com/Calcium-Ion) 原始创建。**
> 我们衷心感谢原作者及上游项目的所有贡献者奠定的坚实基础。
> 本分支在 AGPL v3 许可证下继续开发，由 [QuantumNous](https://github.com/QuantumNous) 维护，增加了一系列扩展功能与改进。

---

## 📝 项目概述

New API 是一个生产级 AI API 网关，将 40+ 上游 AI 供应商聚合到统一的 OpenAI 兼容接口之下。它提供统一的身份认证、速率限制、成本核算，以及现代化的管理后台——专为需要管理多个 AI 服务账号、跨团队追踪用量、规模化控制成本的组织而设计。

> [!IMPORTANT]
> - 本项目仅面向**合法授权**的 AI API 网关、组织内部鉴权、多模型管理、用量统计、成本核算和私有化部署场景。
> - 使用者必须合法取得上游 API Key、账号、模型服务及接口权限，并遵守上游服务条款及适用法律法规。

---

## 🚀 快速开始

### Docker Compose（推荐）

```bash
git clone https://github.com/QuantumNous/new-api.git
cd new-api
docker compose up -d
```

部署完成后访问 `http://localhost:3000` 进入管理后台。

### Docker 命令

```bash
# 使用 SQLite（最简模式）
docker run -d --name new-api \
  -p 3000:3000 \
  -e TZ=Asia/Shanghai \
  -v ./data:/data \
  quantumnous/new-api:latest

# 使用 MySQL / PostgreSQL
docker run -d --name new-api \
  -p 3000:3000 \
  -e SQL_DSN="root:password@tcp(host:3306)/new-api?charset=utf8mb4&parseTime=True&loc=Local" \
  -e TZ=Asia/Shanghai \
  -v ./data:/data \
  quantumnous/new-api:latest
```

> 完整环境变量说明见 [环境变量](#-环境变量) 章节。

---

## ✨ 主要特性

### 🎨 平台能力

| 特性 | 说明 |
|------|------|
| 🖥️ 现代化后台 | React 19 + TypeScript + Tailwind CSS 管理控制台 |
| 🌍 多语言 | 简体中文、English、Français、Русский、日本語、Tiếng Việt |
| 📊 数据分析 | 实时用量仪表盘、成本拆解、趋势图表 |
| 🔐 认证体系 | JWT、WebAuthn/Passkeys、OAuth（GitHub、Discord、OIDC、Telegram、微信） |
| 🗄️ 多数据库 | SQLite、MySQL ≥ 5.7.8、PostgreSQL ≥ 9.6 |

### 🤖 AI 网关

| 特性 | 说明 |
|------|------|
| 🔄 协议转换 | OpenAI ↔ Claude Messages ↔ Google Gemini ↔ OpenAI Responses |
| 📡 40+ 供应商 | OpenAI、Claude、Gemini、AWS Bedrock、Azure、DeepSeek、通义千问、Ollama 等 |
| 🎯 智能路由 | 加权负载均衡、故障自动切换、渠道亲和性策略 |
| 📡 流式支持 | SSE 流式输出，覆盖聊天、实时对话、异步任务轮询 |

### 💰 计费与成本控制

| 特性 | 说明 |
|------|------|
| 📊 用量核算 | 按次、按 Token、按缓存命中的精确成本追踪 |
| 🎯 分级计费 | 基于表达式的动态定价，支持自定义公式 |
| 💳 支付集成 | Stripe、易支付、Creem、Waffo Pancake |
| 🔑 额度管理 | 用户级、分组级、Key 级的多层额度分配 |

---

## 🏗️ 系统架构

```
客户端 (OpenAI SDK / Web UI)
        │
        ▼
┌──────────────────────────────────┐
│         New API 网关               │
│  ┌─────────┐  ┌───────────────┐  │
│  │ 路由层    │  │  中间件层       │  │
│  │          │  │  认证/限流/CORS │  │
│  └────┬─────┘  └───────────────┘  │
│       │                            │
│  ┌────▼─────────────────────────┐ │
│  │     中继引擎                   │ │
│  │  OpenAI │ Claude │ Gemini ... │ │
│  └────┬─────────────────────────┘ │
│       │                            │
│  ┌────▼─────┐  ┌───────────────┐  │
│  │ 计费引擎   │  │   服务层       │  │
│  └──────────┘  └───────────────┘  │
└──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│  OpenAI · Claude · Gemini · AWS   │
│  Azure · DeepSeek · 通义千问 ...  │
│      40+ 上游 AI 供应商            │
└──────────────────────────────────┘
```

---

## 📡 供应商支持

<details>
<summary><strong>38 个渠道适配器（点击展开）</strong></summary>

| 供应商 | 适配器标识 | 支持功能 |
|--------|-----------|----------|
| OpenAI / Azure | `openai` | 聊天、嵌入、图像、音频、视频、实时、Responses |
| Anthropic Claude | `claude` | Messages API、Computer Use、Citations |
| Google Gemini | `gemini` | 多模态、原生 API、Vertex AI、思考模式 |
| AWS Bedrock | `aws` | 多模型路由、IAM 凭证管理 |
| DeepSeek | `deepseek` | V3/R1 模型 |
| 阿里通义千问 | `ali` | 聊天、图像（通义万相）、Rerank |
| 百度文心一言 | `baidu`、`baidu_v2` | 对话、插件 |
| 智谱 GLM / CogView | `zhipu`、`zhipu_4v` | 对话、图像生成 |
| Moonshot (Kimi) | `moonshot` | 对话 |
| Mistral AI | `mistral` | 对话 |
| Cohere | `cohere` | 对话、Rerank |
| Ollama (本地) | `ollama` | 对话、流式 |
| SiliconFlow | `siliconflow` | 对话、嵌入 |
| OpenRouter | `openrouter` | 聚合路由 |
| Cloudflare Workers AI | `cloudflare` | 对话 |
| xAI (Grok) | `xai` | 对话 |
| Perplexity | `perplexity` | 对话 |
| Jina AI | `jina` | 嵌入、Rerank |
| 讯飞星火 | `xunfei` | 对话 |
| 字节跳动火山引擎 | `volcengine` | 对话、TTS |
| 腾讯云 | `tencent` | 对话 |
| Minimax | `minimax` | 对话、图像、TTS |
| 零一万物 | `lingyiwanwu` | 对话 |
| 360 AI | `ai360` | 对话 |
| 即梦 (字节) | `jimeng` | 图像生成 |
| Mimo | `mimo` | 视频 |
| MOKA AI | `mokaai` | 对话 |
| Dify | `dify` | ChatFlow |
| Coze | `coze` | 对话 |
| Replicate | `replicate` | 模型托管 |
| Google PaLM | `palm` | 对话 |
| Xorbits Inference | `xinference` | 本地推理 |
| 子模型委托 | `submodel` | 转发代理 |
| 异步任务 | `task` | Suno、Sora、Kling、Hailuo、Vidu |
| Codex | `codex` | OAuth 访问 |

</details>

---

## 🚢 部署

### 环境要求

| 组件 | 要求 |
|------|------|
| 数据库 | SQLite（默认）、MySQL ≥ 5.7.8 或 PostgreSQL ≥ 9.6 |
| 缓存 | Redis（推荐）或内存缓存 |
| 运行时 | Docker / Docker Compose，或 Go 1.25+ |

### 环境变量

<details>
<summary><strong>核心变量</strong></summary>

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `SESSION_SECRET` | 会话加密密钥（**多机部署必须设置**） | — |
| `CRYPTO_SECRET` | 数据加密密钥（**共享 Redis 必须设置**） | — |
| `SQL_DSN` | 数据库连接字符串 | SQLite `data/new-api.db` |
| `REDIS_CONN_STRING` | Redis 连接字符串 (`redis://host:port`) | — |
| `STREAMING_TIMEOUT` | SSE 流式超时（秒） | `300` |
| `STREAM_SCANNER_MAX_BUFFER_MB` | 流式扫描器单行最大缓冲（MB） | `64` |
| `MAX_REQUEST_BODY_MB` | 请求体最大体积（MB，解压后计） | `32` |
| `AZURE_DEFAULT_API_VERSION` | Azure API 默认版本 | `2025-04-01-preview` |
| `TZ` | 容器时区 | `Asia/Shanghai` |
| `ERROR_LOG_ENABLED` | 启用详细错误日志 | `false` |

</details>

### 生产环境检查清单

> [!WARNING]
> - **生产环境必须设置 `SESSION_SECRET`**，否则多实例登录状态不一致
> - **共享 Redis 时必须设置 `CRYPTO_SECRET`**，否则加密数据无法跨实例解密
> - 生产环境建议使用 Nginx/Caddy 反向代理进行 TLS 终止
> - Docker 部署时务必挂载 `/data` 为持久化卷

---

## 🔗 相关项目

| 项目 | 说明 |
|------|------|
| [NEW-API](https://github.com/Calcium-Ion/new-api) | 上游项目（本项目为其分支） |
| [One API](https://github.com/songquanpeng/one-api) | 原始项目（MIT 许可证） |
| [Midjourney-Proxy](https://github.com/novicezk/midjourney-proxy) | Midjourney 接口集成 |

---

## 📜 许可证

本项目采用 [GNU Affero 通用公共许可证 v3.0 (AGPL v3)](./LICENSE) 授权。

本项目是基于 [NEW-API](https://github.com/Calcium-Ion/new-api) 的开源分支，NEW-API 本身源自 [One API](https://github.com/songquanpeng/one-api)（MIT 许可证）。

如果贵组织的政策不允许使用 AGPL v3 许可的软件，或希望规避 AGPL v3 的开源义务，请联系：[support@quantumnous.com](mailto:support@quantumnous.com)

---

<div align="center">

### 💖 感谢使用 New API

如果这个项目对你有帮助，欢迎给我们一个 ⭐️ Star！

**[发行版](https://github.com/QuantumNous/new-api/releases)** • **[问题反馈](https://github.com/QuantumNous/new-api/issues)** • **[讨论区](https://github.com/QuantumNous/new-api/discussions)**

<sub>Built with ❤️ by QuantumNous</sub>

</div>
