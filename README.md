<div align="center">

![new-api](/web/default/public/logo.png)

# New API

🍥 **Next-Generation AI Gateway — Unified Access to 40+ LLM Providers**

<p align="center">
  <a href="./README.zh_CN.md">简体中文</a> |
  <strong>English</strong>
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
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-documentation">Documentation</a>
</p>

</div>

> [!NOTE]
> **This project is a community fork and continuation of [NEW-API](https://github.com/Calcium-Ion/new-api) by [Calcium-Ion](https://github.com/Calcium-Ion).**
> We are grateful to the original author and all contributors to the upstream project for their foundational work.
> This fork continues development under the AGPL v3 license with additional features and improvements maintained by [QuantumNous](https://github.com/QuantumNous).

---

## 📝 Overview

New API is a production-ready AI API gateway that aggregates 40+ upstream AI providers behind a single, OpenAI-compatible interface. It provides unified authentication, rate limiting, cost accounting, and a modern admin dashboard — purpose-built for organizations that need to manage multiple AI service accounts, track usage across teams, and control costs at scale.

> [!IMPORTANT]
> - This project is intended for **lawful and authorized** AI API gateway, organization-level authentication, multi-model management, usage analytics, cost accounting, and private deployment scenarios.
> - Users must lawfully obtain upstream API keys, accounts, model services, and interface permissions, and comply with upstream terms of service and applicable laws.

---

## 🚀 Quick Start

### Docker Compose (Recommended)

```bash
git clone https://github.com/QuantumNous/new-api.git
cd new-api
docker compose up -d
```

Then visit `http://localhost:3000` to access the dashboard.

### Docker

```bash
# SQLite (simplest)
docker run -d --name new-api \
  -p 3000:3000 \
  -e TZ=Asia/Shanghai \
  -v ./data:/data \
  quantumnous/new-api:latest

# MySQL / PostgreSQL
docker run -d --name new-api \
  -p 3000:3000 \
  -e SQL_DSN="root:password@tcp(host:3306)/new-api?charset=utf8mb4&parseTime=True&loc=Local" \
  -e TZ=Asia/Shanghai \
  -v ./data:/data \
  quantumnous/new-api:latest
```

> For all environment variables, see [Environment Variables](#-environment-variables).

---

## ✨ Key Features

### 🎨 Platform

| Feature | Description |
|---------|-------------|
| 🖥️ Modern Dashboard | React 19 + TypeScript + Tailwind CSS admin console |
| 🌍 Multi-Language | English, 简体中文, Français, Русский, 日本語, Tiếng Việt |
| 📊 Analytics | Real-time usage dashboards, cost breakdowns, trend charts |
| 🔐 Auth & SSO | JWT, WebAuthn/Passkeys, OAuth (GitHub, Discord, OIDC, Telegram, WeChat) |
| 🗄️ Multi-Database | SQLite, MySQL ≥ 5.7.8, PostgreSQL ≥ 9.6 |

### 🤖 AI Gateway

| Feature | Description |
|---------|-------------|
| 🔄 Protocol Translation | OpenAI ↔ Claude Messages ↔ Google Gemini ↔ OpenAI Responses |
| 📡 40+ Providers | OpenAI, Claude, Gemini, AWS Bedrock, Azure, DeepSeek, Qwen, Ollama, and more |
| 🎯 Smart Routing | Weighted load balancing, automatic failover, channel affinity |
| 📡 Streaming | SSE streaming for chat, realtime, and async task polling |

### 💰 Billing & Cost Control

| Feature | Description |
|---------|-------------|
| 📊 Usage Accounting | Per-request, per-token, and cache-hit cost tracking |
| 🎯 Tiered Billing | Expression-based dynamic pricing with custom formulas |
| 💳 Payment Gateways | Stripe, EPay, Creem, Waffo Pancake |
| 🔑 Quota Management | User-level, group-level, and key-level quota allocation |

---

## 🏗️ Architecture

```
Client (OpenAI SDK / Web UI)
        │
        ▼
┌──────────────────────────────────┐
│         New API Gateway           │
│  ┌─────────┐  ┌───────────────┐  │
│  │  Router  │  │  Middleware    │  │
│  │          │  │  Auth/Rate/CORS│  │
│  └────┬─────┘  └───────────────┘  │
│       │                            │
│  ┌────▼─────────────────────────┐ │
│  │     Relay Engine              │ │
│  │  OpenAI │ Claude │ Gemini ... │ │
│  └────┬─────────────────────────┘ │
│       │                            │
│  ┌────▼─────┐  ┌───────────────┐  │
│  │ Billing   │  │   Service     │  │
│  │ Engine    │  │   Layer       │  │
│  └──────────┘  └───────────────┘  │
└──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│  OpenAI · Claude · Gemini · AWS   │
│  Azure · DeepSeek · Qwen · ...   │
│      40+ Upstream Providers       │
└──────────────────────────────────┘
```

---

## 📡 Supported Providers

<details>
<summary><strong>38 Channel Adapters (click to expand)</strong></summary>

| Provider | Adapter |
|----------|---------|
| OpenAI / Azure | `openai` — Chat, Embeddings, Image, Audio, Video, Realtime, Responses |
| Anthropic Claude | `claude` — Messages API, Computer Use, Citations |
| Google Gemini | `gemini` — Multimodal, Native API, Vertex AI, Thinking mode |
| AWS Bedrock | `aws` — Multi-model routing, IAM credential management |
| DeepSeek | `deepseek` — V3/R1 models |
| Alibaba Qwen (Tongyi) | `ali` — Chat, Image (Wan), Rerank |
| Baidu Wenxin | `baidu`, `baidu_v2` |
| Zhipu GLM / CogView | `zhipu`, `zhipu_4v` |
| Moonshot (Kimi) | `moonshot` |
| Mistral AI | `mistral` |
| Cohere | `cohere` |
| Ollama (local) | `ollama` |
| SiliconFlow | `siliconflow` |
| OpenRouter | `openrouter` |
| Cloudflare Workers AI | `cloudflare` |
| xAI (Grok) | `xai` |
| Perplexity | `perplexity` |
| Jina AI | `jina` |
| iFlytek Spark | `xunfei` |
| ByteDance Volcengine | `volcengine` |
| Tencent Cloud | `tencent` |
| Minimax | `minimax` |
| Lingyiwanwu (01.AI) | `lingyiwanwu` |
| 360 AI | `ai360` |
| Jimeng (ByteDance) | `jimeng` |
| Mimo | `mimo` |
| MOKA AI | `mokaai` |
| Dify | `dify` |
| Coze | `coze` |
| Replicate | `replicate` |
| Google PaLM | `palm` |
| Xorbits Inference | `xinference` |
| SubModel (delegation) | `submodel` |
| Task (async) | `task` — Suno, Sora, Kling, Hailuo, Vidu |
| Codex | `codex` — OAuth-based access |

</details>

---

## 🚢 Deployment

### Requirements

| Component | Requirement |
|-----------|-------------|
| Database | SQLite (default), MySQL ≥ 5.7.8, or PostgreSQL ≥ 9.6 |
| Cache | Redis (recommended) or in-memory cache |
| Runtime | Docker / Docker Compose, or Go 1.25+ |

### Environment Variables

<details>
<summary><strong>Essential Variables</strong></summary>

| Variable | Description | Default |
|----------|-------------|---------|
| `SESSION_SECRET` | Session encryption key (**required** for multi-instance) | — |
| `CRYPTO_SECRET` | Data encryption key (**required** for shared Redis) | — |
| `SQL_DSN` | Database connection string | SQLite `data/new-api.db` |
| `REDIS_CONN_STRING` | Redis connection string (`redis://host:port`) | — |
| `STREAMING_TIMEOUT` | SSE streaming timeout (seconds) | `300` |
| `STREAM_SCANNER_MAX_BUFFER_MB` | Max single-line buffer for stream scanner (MB) | `64` |
| `MAX_REQUEST_BODY_MB` | Max decompressed request body (MB) | `32` |
| `AZURE_DEFAULT_API_VERSION` | Azure API default version | `2025-04-01-preview` |
| `TZ` | Container timezone | `Asia/Shanghai` |
| `ERROR_LOG_ENABLED` | Enable detailed error logging | `false` |

</details>

### Production Checklist

> [!WARNING]
> - **Set `SESSION_SECRET`** — otherwise login sessions are inconsistent across instances.
> - **Set `CRYPTO_SECRET`** when sharing Redis — otherwise encrypted data cannot be read.
> - Use a reverse proxy (Nginx/Caddy) for TLS termination in production.
> - Mount `/data` as a persistent volume when using Docker.

---

## 🔗 Related Projects

| Project | Description |
|---------|-------------|
| [NEW-API](https://github.com/Calcium-Ion/new-api) | Upstream project (this is a fork) |
| [One API](https://github.com/songquanpeng/one-api) | Original project (MIT License) |
| [Midjourney-Proxy](https://github.com/novicezk/midjourney-proxy) | Midjourney integration |

---

## 📜 License

This project is licensed under the [GNU Affero General Public License v3.0](./LICENSE).

It is developed as an open-source fork based on [NEW-API](https://github.com/Calcium-Ion/new-api), which itself originated from [One API](https://github.com/songquanpeng/one-api) (MIT License).

For organizations that cannot use AGPL v3 licensed software, contact: [support@quantumnous.com](mailto:support@quantumnous.com)

---

<div align="center">

### 💖 Thanks for using New API

If this project helps you, please give it a ⭐️ Star!

**[Releases](https://github.com/QuantumNous/new-api/releases)** • **[Issues](https://github.com/QuantumNous/new-api/issues)** • **[Discussions](https://github.com/QuantumNous/new-api/discussions)**

<sub>Built with ❤️ by QuantumNous</sub>

</div>
