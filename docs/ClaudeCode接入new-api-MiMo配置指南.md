# Claude Code 接入 new-api（MiMo 模型 / anthropic 端点）配置指南

> 适用站点示例：`https://api.faction168.online`（鼠鼠🐭公益站，渠道为小米 MiMo）
> 生成日期：2026-06-06
> 背景：该站只有 MiMo 系列模型，`supported_endpoint_types` 含 `anthropic`，因此 **Codex 用不了（需 Responses），但 Claude Code 可以走 anthropic 端点**。

---

## 0. 为什么这条路可行（与 Codex 的区别）

| | Codex | Claude Code |
|---|---|---|
| 协议端点 | OpenAI **Responses** `/v1/responses` | Anthropic **Messages** `/v1/messages` |
| MiMo 是否支持 | ❌ 不支持 → 404 | ✅ 支持（`supported_endpoint_types: ["anthropic","openai"]`）|
| base_url 是否带 `/v1` | **带** `/v1`（Codex 拼 `/responses`）| **不带** `/v1`（SDK 自动拼 `/v1/messages`）|

new-api 侧：`/v1/messages` 路由 → MiMo 适配器 `ConvertClaudeRequest` → 转发到 MiMo 的 anthropic 端点（`relay/channel/mimo/adaptor.go`）。

---

## ⚠️ 先做：重置已泄露的令牌

之前的令牌 `sk-6LtK...` 已在排查过程中明文暴露，请先到 new-api 后台**删除并新建令牌**，下文用 `sk-你的令牌` 占位。

---

## 1. 关键参数（务必记住）

| 变量 | 值 | 说明 |
|---|---|---|
| `ANTHROPIC_BASE_URL` | `https://api.faction168.online` | ★ **不要带 `/v1`**（SDK 会自动加 `/v1/messages`）|
| `ANTHROPIC_AUTH_TOKEN` | `sk-你的令牌` | ★ 用 AUTH_TOKEN（发 `Authorization: Bearer`），**不要**同时设 `ANTHROPIC_API_KEY` |
| `ANTHROPIC_MODEL` | `mimo-v2.5-pro` | 主模型 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `mimo-v2.5` | 小/快模型（后台任务），新版变量 |
| `ANTHROPIC_SMALL_FAST_MODEL` | `mimo-v2.5` | 同上，旧版变量，一起设兼容老版本 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | `mimo-v2.5-pro` | Sonnet 档映射 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | `mimo-v2.5-pro` | Opus 档映射 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | `mimo-v2.5-pro` | 子代理模型 |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1` | 关掉对 anthropic 官方的非必要请求（遥测/更新检查），三方网关建议开 |

> **为什么要映射全部档位？** Claude Code 会按 opus/sonnet/haiku 档位发不同模型名（如后台用 haiku）。若不映射，它会请求站点不存在的 `claude-*` 模型 → 报错。把所有档位都指到 MiMo，任何请求都不会落空。

可用 MiMo 文本模型（来自实测 `/v1/models`）：`mimo-v2.5-pro`(贵一档)、`mimo-v2.5`、`mimo-v2-pro`、`mimo-v2-omni`。编码建议主模型用 `mimo-v2.5-pro`，快模型用 `mimo-v2.5`。（`*-tts`/`*-asr` 是语音模型，别用。）

---

## 2. 配置方式一：settings.json（推荐，跨平台、最省事）

编辑**用户级**设置（不要放进项目共享设置，避免令牌泄露）：
- Windows：`C:\Users\<你>\.claude\settings.json`
- macOS / Linux：`~/.claude/settings.json`

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.faction168.online",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的令牌",
    "ANTHROPIC_MODEL": "mimo-v2.5-pro",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "mimo-v2.5",
    "ANTHROPIC_SMALL_FAST_MODEL": "mimo-v2.5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "mimo-v2.5-pro",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "mimo-v2.5-pro",
    "CLAUDE_CODE_SUBAGENT_MODEL": "mimo-v2.5-pro",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}
```
保存后**重启 Claude Code**。

---

## 3. 配置方式二：环境变量

**Windows PowerShell（永久，写入用户环境变量，需重开终端）：**
```powershell
setx ANTHROPIC_BASE_URL "https://api.faction168.online"
setx ANTHROPIC_AUTH_TOKEN "sk-你的令牌"
setx ANTHROPIC_MODEL "mimo-v2.5-pro"
setx ANTHROPIC_DEFAULT_HAIKU_MODEL "mimo-v2.5"
setx ANTHROPIC_SMALL_FAST_MODEL "mimo-v2.5"
setx ANTHROPIC_DEFAULT_SONNET_MODEL "mimo-v2.5-pro"
setx ANTHROPIC_DEFAULT_OPUS_MODEL "mimo-v2.5-pro"
setx CLAUDE_CODE_SUBAGENT_MODEL "mimo-v2.5-pro"
setx CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC "1"
```

**macOS / Linux（bash/zsh，写入 ~/.zshrc 或 ~/.bashrc）：**
```bash
export ANTHROPIC_BASE_URL="https://api.faction168.online"
export ANTHROPIC_AUTH_TOKEN="sk-你的令牌"
export ANTHROPIC_MODEL="mimo-v2.5-pro"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="mimo-v2.5"
export ANTHROPIC_SMALL_FAST_MODEL="mimo-v2.5"
export ANTHROPIC_DEFAULT_SONNET_MODEL="mimo-v2.5-pro"
export ANTHROPIC_DEFAULT_OPUS_MODEL="mimo-v2.5-pro"
export CLAUDE_CODE_SUBAGENT_MODEL="mimo-v2.5-pro"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"
```

> 优先级：环境变量 > settings.json 同名字段。两者别冲突。

---

## 4. 验证

### 4.1 先用 curl 直测 `/v1/messages`（确认端点+鉴权通）

**Windows PowerShell（body 写文件，避开引号坑）：**
```powershell
'{"model":"mimo-v2.5-pro","max_tokens":64,"messages":[{"role":"user","content":"say hi"}]}' | Out-File -Encoding ascii msg.json
curl.exe -i https://api.faction168.online/v1/messages `
  -H "Authorization: Bearer sk-你的令牌" `
  -H "anthropic-version: 2023-06-01" `
  -H "Content-Type: application/json" `
  -d "@msg.json"
```
**bash：**
```bash
curl -i https://api.faction168.online/v1/messages \
  -H "Authorization: Bearer sk-你的令牌" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"mimo-v2.5-pro","max_tokens":64,"messages":[{"role":"user","content":"say hi"}]}'
```
返回 `200` + 含 `"type":"message"` 的 JSON → 端点 OK。

### 4.2 关键：测「工具调用」是否可用（决定 Claude Code 能不能干活）

Claude Code 重度依赖 tool_use（读写文件、跑命令都靠它）。**先确认 MiMo 经 anthropic 端点支持工具：**
```powershell
'{"model":"mimo-v2.5-pro","max_tokens":256,"tools":[{"name":"get_weather","description":"Get weather of a city","input_schema":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}],"messages":[{"role":"user","content":"北京天气如何?必须调用 get_weather 工具。"}]}' | Out-File -Encoding ascii tooltest.json
curl.exe -s https://api.faction168.online/v1/messages -H "Authorization: Bearer sk-你的令牌" -H "anthropic-version: 2023-06-01" -H "Content-Type: application/json" -d "@tooltest.json"
```
- 返回里出现 `"type":"tool_use"` 内容块 → ✅ 工具可用，Claude Code 能正常编码。
- 只返回普通文本 / 报错 / 忽略 tools → ⚠️ 工具不被支持，Claude Code 可以聊天但**无法可靠地改文件、执行命令**。

### 4.3 启动 Claude Code 并自检

```bash
claude
# 进入后输入 /status，确认 ANTHROPIC_BASE_URL 指向你的站、模型是 mimo-*
```

---

## 5. 已知限制 / 注意事项

1. **工具调用是最大风险点**：务必先跑 4.2。MiMo 的 anthropic 兼容若不完整支持 tool_use，Claude Code 的 agentic 能力会打折甚至不可用。
2. **Claude 专有特性不一定 round-trip**：`cache control`（提示缓存）、`extended thinking`（扩展思考）、`computer use` 等经第三方转换可能失效或报错。建议先关思考、用基础对话+工具流。
3. **上下文窗口**：MiMo 的上下文/最大输出可能小于 Claude，长对话/大文件时注意截断。
4. **鉴权**：只设 `ANTHROPIC_AUTH_TOKEN`；若同时设了 `ANTHROPIC_API_KEY` 可能冲突或走错 header。
5. **安全**：令牌放**用户级** `~/.claude/settings.json` 或本机环境变量，**不要**提交到仓库或项目共享的 `.claude/settings.json`。

---

## 6. 常见错误对照

| 现象 | 含义 | 处理 |
|---|---|---|
| `404` / `Invalid URL` 且路径是 `/v1/v1/messages` | `ANTHROPIC_BASE_URL` 多带了 `/v1` | 去掉 `/v1`，只填到域名根 |
| `401` | 令牌无效 / 用了 `ANTHROPIC_API_KEY`(x-api-key) 但站点要 Bearer | 改用 `ANTHROPIC_AUTH_TOKEN` |
| `model_not_found` / 503 | 请求了站点没有的模型（如 `claude-3-5-haiku`）| 把第 1 节所有模型档位都映射到 mimo |
| 能聊天但不会改文件/执行 | 工具调用不被上游支持 | 见 4.2；该上游不适合做 agentic 编码 |
| 连接 anthropic 官方超时/报错 | 非必要流量打到了 api.anthropic.com | 设 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` |

---

## 7. 最小可用配置（确认 4.1/4.2 通过后直接抄）

`~/.claude/settings.json`：
```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.faction168.online",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的令牌",
    "ANTHROPIC_MODEL": "mimo-v2.5-pro",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "mimo-v2.5",
    "ANTHROPIC_SMALL_FAST_MODEL": "mimo-v2.5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "mimo-v2.5-pro",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "mimo-v2.5-pro",
    "CLAUDE_CODE_SUBAGENT_MODEL": "mimo-v2.5-pro",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}
```

---

## 参考来源

- [Environment variables - Claude Code Docs](https://code.claude.com/docs/en/env-vars)
- [Claude Code with Model Studio (env 配置示例) - 阿里云](https://help.aliyun.com/zh/model-studio/claude-code)
- [Claude Code - Zuplo AI Gateway Docs](https://zuplo.com/docs/ai-gateway/integrations/claude-code)

> new-api 行为依据本仓库源码：`router/relay-router.go`(`/v1/messages` 路由)、`relay/channel/mimo/adaptor.go`(`ConvertClaudeRequest` 转发到 MiMo anthropic 端点)。
