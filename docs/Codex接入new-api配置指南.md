# Codex CLI 接入 new-api 配置指南

> 适用站点示例：`https://api.faction168.online`（鼠鼠🐭公益站）
> 生成日期：2026-06-06
> 目标：解决 Codex 报 `404 openai_error` 与 `stream closed before response.completed` 两个问题，并给出可直接使用的 `~/.codex/config.toml`。

---

## 0. 一句话结论（TL;DR）

1. **`base_url` 必须带 `/v1`**（Codex 会自动在后面拼 `/responses`）。去掉 `/v1` 一定错。
2. **Codex 现在只支持 `wire_api = "responses"`**（2026-02 起官方移除了 `"chat"`）。
3. 因此 **new-api 里给 Codex 用的模型，其绑定渠道的上游必须支持 OpenAI Responses 接口（`/v1/responses`）**。
4. 你看到的 `404 openai_error`，本质就是：请求已正确进入 new-api 中继并选到了渠道，但**那个渠道的上游不支持 Responses**（或上游 base_url / 模型映射配置有误），404 是上游透传回来的。

---

## 1. 两个报错的成因（源码级）

| 你的操作 | 实际请求 | 报错 | 根因（对应源码） |
|---|---|---|---|
| `base_url` 带 `/v1` | `POST /v1/responses` ✅ | `unexpected status 404 ... openai_error` | 路由命中→选到渠道→打到上游，**上游返回 404 并被透传**（`relay/responses_handler.go:127` + `service/error.go` `RelayErrorHandler`）。说明上游不支持 Responses 接口。 |
| `base_url` 去掉 `/v1` | `POST /responses` ❌ | `stream closed before response.completed` | `/responses` 不是注册路由，落到 SPA 兜底，**返回的是后台网页 HTML(200)**（`router/web-router.go:29`）。Codex 把 HTML 当 SSE 流解析，等不到 `response.completed` 就断开。 |

**排除法（为什么确定是"上游 404"而不是别的）：**
- 若是**缺路由**（new-api 版本过老）→ 报 `invalid_request_error` + `Invalid URL (POST /v1/responses)`（`controller/relay.go:458`）。**不是你的现象**。
- 若是**模型没绑定任何渠道** → 报 **HTTP 503 `model_not_found`**（`middleware/distributor.go:150-154`）。**不是 404**。
- 你拿到的是 **404 + openai_error** → 模型已匹配到渠道、请求已转发到上游 → **是上游能力/配置问题**。

---

## 1.5 实测确认：本站当前=仅 MiMo 模型 → Codex 无解（根因定论）

`curl /v1/models` 实测返回的模型**全部是小米 MiMo 系列**（`owned_by: xiaomi-mimo`，`supported_endpoint_types: ["anthropic","openai"]`），**没有 `gpt-5-codex` / `gpt-5`，也没有任何模型支持 `responses` 端点**。据此，最初的 `404 openai_error` 已 100% 定位：

1. MiMo 上游只实现了 **chat completions**（`/v1/chat/completions`）和 **anthropic messages**（`/v1/messages`），**没有 Responses 接口**。
2. new-api 的 MiMo 适配器（`relay/channel/mimo/adaptor.go`）把 `/v1/responses` 原样转发到 MiMo 的 `/v1/responses` → MiMo 无此端点 → **404**。
3. new-api 只有 **chat→responses** 的桥接（`relay/chat_completions_via_responses.go`），**没有** “responses 请求降级成 chat” 的反向能力。
4. Codex 现在**只会发 Responses**（`wire_api="chat"` 已被官方移除）。

→ **结论：在"只有 MiMo"的渠道配置下，Codex 无解**——无论 `config.toml` 怎么配都会 404，必须先新增一个真正支持 Responses 的上游渠道（见第 6 节）。

**若只是想在本站用 agentic 编码 CLI（不限定 Codex）：**
- ✅ **Claude Code**：走 anthropic 端点（MiMo 支持 `/v1/messages`），可用。
- ✅ Cline / Roo Code / Cursor 等走 chat completions 的客户端，模型用 `mimo-v2.5`。
- ❌ Codex：除非按第 6 节加 Responses 渠道。

---

## 2. 一个必须知道的重要变化：`wire_api` 只能是 `responses`

> 来源：OpenAI 官方 Codex 文档与社区核实（见文末链接）。
>
> 原文要点：*"`responses` is the only supported value, and it is the default when omitted. Chat Completions support has been removed. All providers, including third-party and open-source endpoints, must now use the Responses API. If you set `wire_api = "chat"`, Codex refuses to start."*

含义：
- **不要再写 `wire_api = "chat"`**（新版 Codex 会拒绝启动）。
- 既然 Codex 端只能用 Responses，**适配工作必须落在 new-api 侧**：给 Codex 用的模型，必须有一个**支持 Responses 的渠道**。
- new-api **不会**把 `/v1/responses` 自动降级转换成上游的 `/v1/chat/completions`（标准 OpenAI 渠道是原样转发路径，见 `relay/channel/openai/adaptor.go:171`）。所以上游不支持 = 必 404。

---

## 3. 第一步：先自测"上游是否支持 Responses"（决定能不能用）

在改 Codex 配置前，先确认 new-api 里 `gpt-5-codex`（或你打算用的模型）能否走通 `/v1/responses`。

### 方法 A：curl 直测（最快）

> ⚠️ 令牌写法：直接写 `Bearer sk-xxxx`，**不要带尖括号 `< >`**（带上会被当成令牌的一部分，导致 `401 token.invalid`）。

**bash / macOS / Linux：**
```bash
curl -i https://api.faction168.online/v1/responses \
  -H "Authorization: Bearer sk-你的令牌" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5-codex","input":"say hi","stream":false}'
```

**Windows PowerShell（5.1 对内嵌引号处理有坑，分两步最稳）：**
```powershell
# 第一步：先单独验证令牌是否有效(无 body,不会有引号问题)
curl.exe -i https://api.faction168.online/v1/models -H "Authorization: Bearer sk-你的令牌"

# 第二步：测 Responses —— 把 body 写到文件再用 @file,彻底避开 PowerShell 引号拆分问题
'{"model":"gpt-5-codex","input":"say hi","stream":false}' | Out-File -Encoding ascii body.json
curl.exe -i https://api.faction168.online/v1/responses `
  -H "Authorization: Bearer sk-你的令牌" `
  -H "Content-Type: application/json" `
  -d "@body.json"
```
> 不要在 PowerShell 里用 `-d '{\"model\":...\"say hi\"...}'`：内嵌 `\"` 会在 `say hi` 的空格处被拆开，curl 把后半段当成第二个 URL 报 `curl: (3) unmatched ... in URL`。
>
> 备选(纯 PowerShell,能看到错误响应体)：
> ```powershell
> $body = '{"model":"gpt-5-codex","input":"say hi","stream":false}'
> try {
>   Invoke-RestMethod -Uri "https://api.faction168.online/v1/responses" -Method Post `
>     -ContentType "application/json" -Headers @{ Authorization = "Bearer sk-你的令牌" } -Body $body
> } catch {
>   $_.Exception.Response.StatusCode.value__
>   (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
> }
> ```

**判定：**
- 返回 `200` + 一段 JSON（含 `output` / `response` 字段）→ ✅ 该模型的渠道**支持 Responses**，可直接用，`wire_api = "responses"`。
- 返回 `404`（body 里有 `openai_error` 或上游报错）→ ❌ 该渠道上游**不支持 Responses**，需要先在 new-api 侧加/换一个支持 Responses 的渠道（见第 6 节）。
- 返回 `503 model_not_found` → 模型名在该分组下没有可用渠道，先去后台把模型绑定到渠道。
- 返回 `401` → 令牌错误。

### 方法 B：用 new-api 后台的渠道测试

渠道管理 → 对应渠道 → 测试 → 测试类型下拉选 **「OpenAI Responses (/v1/responses)」** → 逐个渠道测，能直接看出哪个渠道支持 Responses。

---

## 4. `~/.codex/config.toml` 配置

> 文件路径：
> - macOS / Linux：`~/.codex/config.toml`
> - Windows：`C:\Users\<你>\.codex\config.toml`

### 4.1 推荐：自定义 provider 块（最清晰、可控）

```toml
# ===== 顶层：选用哪个 provider 和哪个模型 =====
model          = "gpt-5-codex"     # 必须是该渠道在 new-api 里真实支持/映射的模型名
model_provider = "newapi"          # 指向下方 [model_providers.newapi]

# 可选：推理强度（minimal / low / medium / high）
# model_reasoning_effort = "high"

# ===== 自定义 provider 定义 =====
[model_providers.newapi]
name     = "new-api"
base_url = "https://api.faction168.online/v1"   # ★ 必须带 /v1，Codex 会自动拼 /responses
wire_api = "responses"                          # ★ 只能是 responses
env_key  = "NEWAPI_KEY"                          # ★ 指向"环境变量名"，不是把 key 写在这里

# 可选稳定性调优（公益站/网络抖动时有用）
# request_max_retries    = 4
# stream_max_retries     = 10
# stream_idle_timeout_ms = 300000                # SSE 空闲超时，默认 300000(5分钟)
```

> ⚠️ `env_key` 填的是**环境变量的名字**（这里叫 `NEWAPI_KEY`），不能直接把 `sk-xxx` 写进去。Codex 运行时会读取该环境变量并作为 `Bearer` 令牌发送。设置方法见第 5 节。

### 4.2 备选：复用内置 `openai` provider（更省事，但可控性差）

内置的 `openai` provider 是保留 ID，不能用 `[model_providers.openai]` 覆盖，但可以用环境变量改它的 base_url：

```bash
export OPENAI_BASE_URL="https://api.faction168.online/v1"
export OPENAI_API_KEY="<你的new-api令牌 sk-xxx>"
codex -m gpt-5-codex
```
> 适合临时验证；正式使用建议用 4.1 的自定义 provider，避免和"ChatGPT 登录态"混淆。

### 字段速查

| 字段 | 必填 | 说明 |
|---|---|---|
| `model` | ✅ | 模型名，必须与 new-api 渠道实际支持的一致 |
| `model_provider` | ✅ | 指向 `[model_providers.<id>]` 的 id |
| `base_url` | ✅ | **务必带 `/v1`**，且**不要**写成 `.../v1/responses`、也别写成 `.../v1/`（双斜杠）|
| `wire_api` | ✅ | 只能 `"responses"` |
| `env_key` | ✅ | 持有 API Key 的**环境变量名** |
| `request_max_retries` / `stream_max_retries` / `stream_idle_timeout_ms` | ⛔可选 | 网络不稳时的重试/超时调优 |

---

## 5. 设置 API Key 环境变量

把 `env_key = "NEWAPI_KEY"` 对应的环境变量设好（值为你的 new-api 令牌 `sk-xxx`）：

**macOS / Linux（bash/zsh）：**
```bash
echo 'export NEWAPI_KEY="sk-你的令牌"' >> ~/.zshrc   # 或 ~/.bashrc
source ~/.zshrc
```

**Windows PowerShell（当前会话）：**
```powershell
$env:NEWAPI_KEY = "sk-你的令牌"
```

**Windows 永久（写入用户环境变量，需重开终端）：**
```powershell
setx NEWAPI_KEY "sk-你的令牌"
```

---

## 6. new-api 侧必须满足的条件（关键，多数 404 卡在这）

Codex 端只能发 Responses，所以**适配全在 new-api 侧**。至少满足其一：

1. **OpenAI 官方渠道**：用真实 OpenAI API Key 的渠道，原生支持 `/v1/responses`，模型用 `gpt-5-codex` / `gpt-5`。
2. **Codex 类型渠道**（`ChannelType = Codex`）：用 ChatGPT 账号的 OAuth Key（JSON，含 `access_token` + `account_id`），new-api 会转发到 `chatgpt.com/backend-api/codex/responses`，正是 Codex CLI 原生端点（见 `relay/channel/codex/adaptor.go`）。
3. **支持 Responses 的三方中转**：确认该上游确实实现了 `/v1/responses`（很多便宜中转**只做** `/v1/chat/completions`，那就不行）。

同时检查：
- **模型名对齐**：Codex 里的 `model` 必须能在 new-api 对应分组里路由到上面这种渠道（必要时用模型重定向/映射把 `gpt-5-codex` 映到上游实际模型名）。
- **渠道 base_url 不要重复 `/v1`**：否则会拼成 `.../v1/v1/responses` → 404。

> 💡 **针对公益站的现实提醒**：如果你的渠道大多是三方中转、且只支持 chat completions，那么**所有渠道都会让 Codex 404**。解决办法是**单独为 Codex 增加一个支持 Responses 的渠道**（OpenAI 官方 或 Codex OAuth 渠道），并把 `gpt-5-codex` 指过去。

---

## 7. 验证流程

1. **先 curl 测 `/v1/responses`**（第 3 节）→ 必须 `200`。
2. **再启动 Codex：**
   ```bash
   codex -m gpt-5-codex
   # 或在交互里 /model 切换到 gpt-5-codex
   ```
3. **若仍报错，看 new-api 日志**：搜索
   ```
   relay error (channel #N, status code 404)
   ```
   能直接看到是哪个渠道、打到哪个上游 URL 失败的——据此定位是"上游不支持"还是"base_url/模型配错"。

---

## 8. 常见错误对照表

| 报错 | 含义 | 处理 |
|---|---|---|
| `404 ... openai_error`（路径是 `/v1/responses`） | 上游渠道不支持 Responses / base_url 或模型映射错 | 换/加支持 Responses 的渠道（第 6 节）；查日志确认渠道 |
| `stream closed before response.completed` | `base_url` 去掉了 `/v1`，打到网页兜底返回 HTML | `base_url` 加回 `/v1` |
| `wire_api = "chat" is no longer supported` | Codex 新版移除了 chat 协议 | 改 `wire_api = "responses"` |
| `503 model_not_found` | 该模型在分组下无可用渠道 | 后台把模型绑定到渠道 / 检查分组 |
| `401` | 令牌无效 | 检查 `NEWAPI_KEY` / 令牌额度与状态 |
| `.../v1/v1/responses` 之类 404 | 渠道 base_url 重复带了 `/v1` | 渠道 base_url 改成不带 `/v1` 的主机根地址 |

---

## 9. 最小可用配置（确认上游支持 Responses 后，直接抄）

`~/.codex/config.toml`：
```toml
model          = "gpt-5-codex"
model_provider = "newapi"

[model_providers.newapi]
name     = "new-api"
base_url = "https://api.faction168.online/v1"
wire_api = "responses"
env_key  = "NEWAPI_KEY"
```
环境变量：
```bash
export NEWAPI_KEY="sk-你的令牌"   # Windows: setx NEWAPI_KEY "sk-你的令牌"
```

---

## 参考来源

- [Advanced Configuration – Codex | OpenAI Developers](https://developers.openai.com/codex/config-advanced)
- [Configuration Reference – Codex | OpenAI Developers](https://developers.openai.com/codex/config-reference)
- [Codex CLI Custom Model Providers: The Complete Configuration Guide](https://codex.danielvaughan.com/2026/04/23/codex-cli-custom-model-providers-configuration-guide/)
- [Config.toml Updated Keys · Issue #2760 · openai/codex](https://github.com/openai/codex/issues/2760)

> 说明：本指南中的 new-api 行为（路由 `/v1/responses`、SPA 兜底、上游 404 透传、Codex 渠道转发 `chatgpt.com/backend-api/codex/responses`）均依据本仓库源码：`router/relay-router.go`、`router/web-router.go`、`relay/responses_handler.go`、`service/error.go`、`middleware/distributor.go`、`relay/channel/openai/adaptor.go`、`relay/channel/codex/adaptor.go`。
