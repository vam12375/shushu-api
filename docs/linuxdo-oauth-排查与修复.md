# LinuxDO(L 站)OAuth 登录排查与修复记录

> 适用场景:基于 new-api 搭建的站点,接入 LinuxDO / GitHub / Discord / OIDC 第三方登录时,
> 出现「点了登录没反应」或「登录超时」。本文记录一次完整的排查过程与最终修复。

---

## 一、问题现象

点击 LinuxDO 登录后无法登录。后端日志先后出现两类异常:

```text
# 阶段一:code 落到了首页,无人处理
GET /?code=h4pIwp48...&state=4o78gXQD0dhq

# 阶段二:回调地址改对后,token 交换超时
[ERR] [OAuth-LinuxDO] ExchangeToken error:
      Post "https://connect.linux.do/oauth2/token": context deadline exceeded
GET /api/oauth/linuxdo?code=...&state=...   200   5.0s
```

---

## 二、根因与修复(两个独立问题)

### 问题 1:回调地址填错

**根因**:LinuxDO 授权 URL 不携带 `redirect_uri`(见 `web/default/src/lib/oauth.ts`),
LinuxDO 会使用**应用后台注册的回调地址**把浏览器送回来。原先填成了根路径 `/`,
导致 `code` 落到首页 `GET /?code=...`,而首页不处理它。

正确链路(前端 SPA 路由 `/oauth/$provider` 接住 code → 再 AJAX 调后端):

```text
GET /oauth/linuxdo?code=...&state=...        ← 前端回调页(web/default/src/routes/oauth/$provider.tsx)
GET /api/oauth/linuxdo?code=...&state=...      ← 前端调后端 HandleOAuth 完成登录
```

> 后端 `setupLogin` 返回的是 JSON(`controller/user.go`),所以回调必须先经前端页面,
> 不能直接指向后端 API。

**修复**:在 LinuxDO Connect 后台把「回调地址」改为:

```text
https://你的域名/oauth/linuxdo
```

各渠道回调地址对照:

| 渠道 | 回调地址 |
|------|---------|
| GitHub | `https://你的域名/oauth/github` |
| LinuxDO | `https://你的域名/oauth/linuxdo` |
| Discord | `https://你的域名/oauth/discord` |

### 问题 2:token 交换超时(5 秒太短)

**根因**:服务器(如国内 ECS)访问 `connect.linux.do` 较慢,而代码里 LinuxDO / Discord / OIDC
三个渠道的 HTTP 超时被写死成 **5 秒**(GitHub / Generic 本来就是 20 秒,属于疏漏不一致)。

**修复**:将 LinuxDO / Discord / OIDC 的超时统一改为**可配置、默认 20 秒**,
通过环境变量 `OAUTH_HTTP_TIMEOUT`(单位:秒)覆盖。涉及文件:

- `oauth/linuxdo.go`(2 处)
- `oauth/discord.go`(2 处,新增 `common` import)
- `oauth/oidc.go`(2 处,新增 `common` import)

改动核心:

```go
// 改前
client := http.Client{Timeout: 5 * time.Second}

// 改后:默认 20s,可用环境变量 OAUTH_HTTP_TIMEOUT 覆盖(单位:秒)
client := http.Client{Timeout: time.Duration(common.GetEnvOrDefault("OAUTH_HTTP_TIMEOUT", 20)) * time.Second}
```

> 注意:增大超时只对「网络慢」有效;若服务器到 LinuxDO 完全不通(被墙),
> 仍需为容器配置代理(`HTTPS_PROXY`/`HTTP_PROXY` 环境变量 + `NO_PROXY=localhost,127.0.0.1,mysql,redis`)。

---

## 三、可选:调大超时(无需改代码)

镜像已包含本次修复后,如默认 20s 仍不够,可在 `docker-compose.yml` 的 `new-api → environment` 加:

```yaml
    environment:
      - OAUTH_HTTP_TIMEOUT=30   # OAuth 跨境请求超时,单位秒,默认 20
```

---

## 四、重新构建并部署(自建 GHCR 镜像)

本项目通过 `.github/workflows/my-deploy.yml` 构建 `ghcr.io/<owner>/<repo>:latest`。
触发方式:① Actions 页面手动 Run;② push 一个 `deploy-*` tag。

```bash
# 1. 提交改动并推送到 GitHub 仓库
git add oauth/linuxdo.go oauth/discord.go oauth/oidc.go
git commit -m "fix: OAuth(LinuxDO/Discord/OIDC) 超时改为可配置默认20s,修复跨境登录超时"
git push origin main

# 2. 打 deploy tag 触发 GHCR 构建(版本号自定)
git tag deploy-oauth-timeout-20s
git push origin deploy-oauth-timeout-20s

# 3. 等 GitHub Actions 构建完成后,在服务器拉取新镜像并重启
docker compose pull
docker compose up -d
```

---

## 五、验证

重新点击 LinuxDO 登录,后端日志应从超时报错变为:

```text
[OAuth-LinuxDO] ExchangeToken success
[OAuth-LinuxDO] GetUserInfo success: id=..., username=...
```

并正常跳转登录。

**其他可能的报错**:
- `trust level too low` —— 不是网络问题,是 new-api 后台设置的「LinuxDO 最低信任等级」高于你的账号等级,调低即可。
- 仍 `context deadline exceeded` —— 网络确实不通(被墙),需配置代理而非仅增大超时。
