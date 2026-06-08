# CLIProxyAPI(CPA) 阿里云接入 new-api 配置指南

> 适用场景：当前线上服务器使用宝塔面板，项目目录为 `/www/wwwroot/new-api`，已有 `new-api + mysql + redis` 的 `docker-compose.yml`，现在希望增加 `router-for-me/CLIProxyAPI` 作为 CPA 上游，再由 new-api 对外提供公益站能力。

## 0. 结论与推荐架构

推荐架构：

```text
用户 / OpenAI SDK / Codex
        |
        v
公网域名 + HTTPS + 宝塔 Nginx
        |
        v
new-api:3000 负责用户、令牌、额度、日志、防滥用
        |
        v
cli-proxy-api:8317 只作为 Docker 内网上游
        |
        v
Codex / Gemini / Claude / OpenAI-compatible 等上游账号
```

不推荐架构：

```text
用户 -> 直接访问 CLIProxyAPI:8317
```

原因：

- CLIProxyAPI 的 `api-keys` 适合做代理调用密钥，不适合替代公益站用户体系。
- 公益站需要额度、日志、分组、模型倍率、IP Guard、防共享、防倒卖，这些应继续交给 new-api。
- CPA 端口不应裸露公网，否则管理接口、OAuth 回调、上游账号都更容易被扫到。

## 1. 重要安全提醒

你当前贴出来的线上 `docker-compose.yml` 包含以下敏感值：

- MySQL root 密码
- Redis 密码
- `SESSION_SECRET`
- `CRYPTO_SECRET`

这些值已经出现在对话里，应视为已经泄露。建议在正式操作前重新生成并替换。

生成随机值示例：

```bash
openssl rand -hex 32
```

替换后重建服务：

```bash
cd /www/wwwroot/new-api
docker compose up -d
```

如果已经有真实用户数据，改 MySQL root 密码前要同步修改 `SQL_DSN` 和 MySQL 容器密码；Redis 密码也要同步修改 `REDIS_CONN_STRING` 和 redis 启动命令。

## 2. 当前服务器目录

根据截图，当前目录为：

```text
/www/wwwroot/new-api
```

目录内已有：

```text
data/
logs/
docker-compose.yml
migrate-sqlite-to-mysql.sh
one-api.db
```

后续所有命令默认在这里执行：

```bash
cd /www/wwwroot/new-api
```

## 3. 阿里云安全组要求

公网安全组只建议开放：

| 端口 | 来源 | 用途 |
| --- | --- | --- |
| 80 | 0.0.0.0/0 | HTTP 证书签发、跳转 HTTPS |
| 443 | 0.0.0.0/0 | HTTPS 访问 new-api |
| 22 | 你的固定 IP | SSH 登录服务器 |

不要开放：

| 端口 | 原因 |
| --- | --- |
| 3000 | new-api 由宝塔 Nginx 反代即可，不应直接公网访问 |
| 8317 | CPA API 只给 new-api 内网调用 |
| 1455 | Codex OAuth 回调端口，只用于 SSH 隧道 |
| 8085 | Gemini OAuth 回调端口，只用于 SSH 隧道 |
| 54545 | Claude OAuth 回调端口，只用于 SSH 隧道 |
| 51121 | Antigravity OAuth 回调端口，只用于 SSH 隧道 |
| 3306 | MySQL 不对公网开放 |
| 6379 | Redis 不对公网开放 |

## 4. 新增 CPA 配置目录

在现有 `/www/wwwroot/new-api` 下创建 CPA 专用目录：

```bash
cd /www/wwwroot/new-api
mkdir -p cpa/auths cpa/logs
```

目录结构将变为：

```text
/www/wwwroot/new-api
  docker-compose.yml
  data/
  logs/
  cpa/
    config.yaml
    auths/
    logs/
```

## 5. 创建 cpa/config.yaml

新建文件：

```bash
nano /www/wwwroot/new-api/cpa/config.yaml
```

推荐最小配置：

```yaml
# CLIProxyAPI listens inside the container.
host: ""
port: 8317

tls:
  enable: false
  cert: ""
  key: ""

remote-management:
  # false means management routes are localhost-only from CPA's perspective.
  # Because this service is behind Docker networking, keep it false.
  allow-remote: false

  # Management API key. Use a long random value.
  # Leave non-empty if you need the management panel/API.
  secret-key: "CHANGE_ME_CPA_MANAGEMENT_SECRET"

  disable-control-panel: false

# Auth files are mounted to /root/.cli-proxy-api in the container.
auth-dir: "~/.cli-proxy-api"

# This key is used by new-api as the upstream API key.
# Do not give this key to public users.
api-keys:
  - "CHANGE_ME_CPA_UPSTREAM_API_KEY_FOR_NEW_API"

debug: false
commercial-mode: false
logging-to-file: true
logs-max-total-size-mb: 1024
error-logs-max-files: 10

# Usually keep usage aggregation off; new-api already records usage.
usage-statistics-enabled: false

# Optional proxy. If the server cannot reach an upstream, set a socks/http proxy here.
# Example: socks5://127.0.0.1:1080
proxy-url: ""

request-retry: 3
max-retry-credentials: 0
max-retry-interval: 30
disable-cooling: false

quota-exceeded:
  switch-project: true
  switch-preview-model: true
  antigravity-credits: true

routing:
  strategy: "round-robin"
  session-affinity: false
  session-affinity-ttl: "1h"

codex:
  identity-confuse: false

ws-auth: true
enable-gemini-cli-endpoint: false
nonstream-keepalive-interval: 0

streaming:
  keepalive-seconds: 15
  bootstrap-retries: 1
```

必须替换：

```text
CHANGE_ME_CPA_MANAGEMENT_SECRET
CHANGE_ME_CPA_UPSTREAM_API_KEY_FOR_NEW_API
```

生成方法：

```bash
openssl rand -hex 32
```

## 6. 修改现有 docker-compose.yml

当前线上 compose 已有 `new-api`、`redis`、`mysql` 三个服务。推荐直接把 `cli-proxy-api` 加到同一个 compose 文件里。

### 6.1 推荐完整 compose 模板

下面是按你当前线上配置改写后的模板。敏感值全部改成占位符，请不要把真实密码写进公开仓库。

```yaml
version: '3.4'

services:
  new-api:
    image: ghcr.io/vam12375/shushu-api:latest
    container_name: new-api
    restart: always
    command: --log-dir /app/logs
    ports:
      # 如宝塔 Nginx 在宿主机反代，可进一步改成 "127.0.0.1:3000:3000"
      - "3000:3000"
    volumes:
      - ./data:/data
      - ./logs:/app/logs
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - SQL_DSN=root:CHANGE_ME_MYSQL_PASSWORD@tcp(mysql:3306)/new-api
      - REDIS_CONN_STRING=redis://:CHANGE_ME_REDIS_PASSWORD@redis:6379
      - SESSION_SECRET=CHANGE_ME_SESSION_SECRET
      - CRYPTO_SECRET=CHANGE_ME_CRYPTO_SECRET
      - TZ=Asia/Shanghai
      - ERROR_LOG_ENABLED=true
      - BATCH_UPDATE_ENABLED=true
      - NODE_NAME=new-api-node-1
      - TRUSTED_PROXIES=172.16.0.0/12,127.0.0.1
      - IP_GUARD_ENABLED=true
      - IP_GUARD_WINDOW_MINUTES=30
      - IP_GUARD_DISTINCT_IP_THRESHOLD=3
      - IP_GUARD_STRIKE_WINDOW_HOURS=24
      - IP_GUARD_STRIKE_THRESHOLD=3
      - LINUX_DO_TOKEN_ENDPOINT=https://ldproxy.faction168.online/oauth2/token
      - LINUX_DO_USER_ENDPOINT=https://ldproxy.faction168.online/api/user
    depends_on:
      - redis
      - mysql
      - cli-proxy-api
    networks:
      - new-api-network
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O - http://localhost:3000/api/status | grep -o '\"success\":\\s*true' || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  cli-proxy-api:
    image: eceasy/cli-proxy-api:latest
    container_name: cli-proxy-api
    restart: unless-stopped
    pull_policy: always
    environment:
      - TZ=Asia/Shanghai
    ports:
      # 只绑定宿主机本地回环，禁止公网直接访问。
      # new-api 在 Docker 内网通过 http://cli-proxy-api:8317 访问，不依赖这里的端口映射。
      - "127.0.0.1:8317:8317"

      # OAuth 登录回调端口，只用于 SSH 隧道，不开放安全组。
      - "127.0.0.1:8085:8085"
      - "127.0.0.1:1455:1455"
      - "127.0.0.1:54545:54545"
      - "127.0.0.1:51121:51121"
      - "127.0.0.1:11451:11451"
    volumes:
      - ./cpa/config.yaml:/CLIProxyAPI/config.yaml
      - ./cpa/auths:/root/.cli-proxy-api
      - ./cpa/logs:/CLIProxyAPI/logs
    networks:
      - new-api-network

  redis:
    image: redis:latest
    container_name: redis
    restart: always
    command: ["redis-server", "--requirepass", "CHANGE_ME_REDIS_PASSWORD"]
    networks:
      - new-api-network

  mysql:
    image: mysql:8.2
    container_name: mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: CHANGE_ME_MYSQL_PASSWORD
      MYSQL_DATABASE: new-api
      MYSQL_CHARACTER_SET_SERVER: utf8mb4
      MYSQL_COLLATION_SERVER: utf8mb4_unicode_ci
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - new-api-network

volumes:
  mysql_data:

networks:
  new-api-network:
    driver: bridge
```

### 6.2 关于 new-api 的 3000 端口

如果宝塔 Nginx 是宿主机反代到 `127.0.0.1:3000`，建议把：

```yaml
ports:
  - "3000:3000"
```

改成：

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

这样即使阿里云安全组误开放了 3000，公网也无法直接访问容器。

改完后宝塔反代地址使用：

```text
http://127.0.0.1:3000
```

### 6.3 关于 CPA 的 8317 端口

`cli-proxy-api` 加入同一个 Docker 网络后，new-api 访问地址是：

```text
http://cli-proxy-api:8317
```

不是：

```text
http://127.0.0.1:8317
```

原因：`127.0.0.1` 在 new-api 容器里指的是 new-api 容器自身，不是 CPA 容器。

`127.0.0.1:8317:8317` 这条端口映射只给宿主机本地测试和 SSH 隧道使用，不给公网使用。

## 7. 启动与检查

进入目录：

```bash
cd /www/wwwroot/new-api
```

拉取镜像：

```bash
docker compose pull
```

启动：

```bash
docker compose up -d
```

查看状态：

```bash
docker compose ps
```

查看 CPA 日志：

```bash
docker compose logs -f --tail=100 cli-proxy-api
```

查看 new-api 日志：

```bash
docker compose logs -f --tail=100 new-api
```

宿主机本地测试 CPA：

```bash
curl http://127.0.0.1:8317/v1/models \
  -H "Authorization: Bearer CHANGE_ME_CPA_UPSTREAM_API_KEY_FOR_NEW_API"
```

如果返回模型列表，说明 CPA API 服务已经可访问。

如果返回 401，检查 `cpa/config.yaml` 的 `api-keys`。

如果连接失败，检查：

```bash
docker compose ps cli-proxy-api
docker compose logs --tail=200 cli-proxy-api
```

## 8. CPA OAuth 登录

CPA 的 OAuth 登录通常需要浏览器回调到本地端口。服务器没有浏览器时，使用 `-no-browser`，再按 CPA 输出的 SSH 隧道命令在你自己的电脑上执行。

### 8.1 Codex 登录

服务器执行：

```bash
cd /www/wwwroot/new-api
docker compose exec cli-proxy-api /CLIProxyAPI/CLIProxyAPI -no-browser --codex-login
```

它会输出：

- 授权 URL
- 一条 SSH 隧道命令

在你本地电脑终端执行它给出的 SSH 隧道命令。

如果服务器 SSH 端口不是 22，需要把命令里补上：

```bash
-p 你的SSH端口
```

然后在本地浏览器打开授权 URL，完成登录。登录成功后，auth 文件会保存在：

```text
/www/wwwroot/new-api/cpa/auths
```

### 8.2 Gemini 登录

服务器执行：

```bash
cd /www/wwwroot/new-api
docker compose exec cli-proxy-api /CLIProxyAPI/CLIProxyAPI -no-browser --login
```

按输出提示在本地建立 SSH 隧道并完成浏览器登录。

### 8.3 Claude 登录

服务器执行：

```bash
cd /www/wwwroot/new-api
docker compose exec cli-proxy-api /CLIProxyAPI/CLIProxyAPI -no-browser --claude-login
```

按输出提示操作。

### 8.4 Antigravity 登录

服务器执行：

```bash
cd /www/wwwroot/new-api
docker compose exec cli-proxy-api /CLIProxyAPI/CLIProxyAPI -no-browser --antigravity-login
```

按输出提示操作。

## 9. 在 new-api 后台添加 CPA 渠道

登录 new-api 管理后台，添加一个新渠道。

推荐配置：

| 项目 | 值 |
| --- | --- |
| 渠道类型 | OpenAI |
| 名称 | CPA / CLIProxyAPI |
| Base URL | `http://cli-proxy-api:8317` |
| API Key | `CHANGE_ME_CPA_UPSTREAM_API_KEY_FOR_NEW_API` |
| 模型 | 按 CPA 返回的模型填写 |
| 分组 | 公益站对应分组 |
| 状态 | 启用 |

注意：

- Base URL 不要写 `/v1`。
- 不要写 `http://127.0.0.1:8317`。
- API Key 填 CPA `config.yaml` 里的 `api-keys`，不是 CPA 管理密钥。
- 对 Codex 模型，测试类型优先选 `OpenAI Responses (/v1/responses)`。

### 9.1 渠道测试

在 new-api 后台：

```text
渠道管理 -> CPA 渠道 -> 测试
```

建议依次测试：

- OpenAI Chat Completions
- OpenAI Responses `/v1/responses`
- 模型列表同步

如果 Codex 能力用于 Codex CLI，重点确认 `/v1/responses` 可用。

## 10. 给用户暴露的地址

用户不直接使用 CPA。

用户使用 new-api 的地址：

```text
https://你的new-api域名/v1
```

示例：

```bash
export OPENAI_BASE_URL="https://你的new-api域名/v1"
export OPENAI_API_KEY="用户在 new-api 创建的 sk-xxx"
```

Python SDK 示例：

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://你的new-api域名/v1",
    api_key="用户在 new-api 创建的 sk-xxx",
)

resp = client.responses.create(
    model="gpt-5-codex",
    input="hello",
)

print(resp)
```

## 11. 宝塔 Nginx 设置

new-api 网站反代到：

```text
http://127.0.0.1:3000
```

推荐反代配置：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

proxy_http_version 1.1;
proxy_set_header Connection "";

proxy_buffering off;
proxy_request_buffering off;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
client_max_body_size 50m;
```

如果前面还接了 Cloudflare，应使用 Cloudflare 的真实 IP 头：

```nginx
proxy_set_header X-Real-IP        $http_cf_connecting_ip;
proxy_set_header X-Forwarded-For  $http_cf_connecting_ip;
proxy_set_header Host             $host;
proxy_set_header X-Forwarded-Proto $scheme;
```

并确保 new-api 环境变量存在：

```yaml
- TRUSTED_PROXIES=172.16.0.0/12,127.0.0.1
```

上线后一定要在 new-api 日志页检查真实 IP。不能显示 Docker 内网 IP、Cloudflare 出口 IP 或宝塔本机 IP。

## 12. 公益站防滥用建议

你当前配置已经开启：

```yaml
- IP_GUARD_ENABLED=true
- IP_GUARD_WINDOW_MINUTES=30
- IP_GUARD_DISTINCT_IP_THRESHOLD=3
- IP_GUARD_STRIKE_WINDOW_HOURS=24
- IP_GUARD_STRIKE_THRESHOLD=3
```

含义：

- 30 分钟内同一用户令牌出现 3 个不同 IP：禁用该用户令牌。
- 24 小时内触发 3 次：封禁用户。

首次接入 CPA 后，建议先观察几天：

```yaml
- IP_GUARD_DISTINCT_IP_THRESHOLD=5
```

确认不会误伤正常用户后，再调回：

```yaml
- IP_GUARD_DISTINCT_IP_THRESHOLD=3
```

还建议在 new-api 侧设置：

- 普通用户只允许 1 个令牌。
- 每日额度上限。
- 高价模型单独分组，不默认开放。
- 图片、视频、长上下文模型不要默认开放。
- 开启日志与错误日志。
- 对新注册用户使用较低初始额度。

## 13. 常见问题

### 13.1 new-api 渠道测试连接失败

检查 Base URL 是否写错。

正确：

```text
http://cli-proxy-api:8317
```

错误：

```text
http://127.0.0.1:8317
http://localhost:8317
http://cli-proxy-api:8317/v1
```

然后在 new-api 容器内测试：

```bash
docker compose exec new-api wget -q -O - http://cli-proxy-api:8317/v1/models
```

如果需要带 Authorization：

```bash
docker compose exec new-api wget -q -O - \
  --header="Authorization: Bearer CHANGE_ME_CPA_UPSTREAM_API_KEY_FOR_NEW_API" \
  http://cli-proxy-api:8317/v1/models
```

### 13.2 CPA 返回 401

检查：

- `cpa/config.yaml` 的 `api-keys` 是否正确。
- new-api 渠道里的 API Key 是否填了同一个值。
- 修改 `config.yaml` 后是否重启 CPA：

```bash
docker compose restart cli-proxy-api
```

### 13.3 OAuth 登录后模型仍不可用

检查 auth 文件是否生成：

```bash
ls -la /www/wwwroot/new-api/cpa/auths
```

查看 CPA 日志：

```bash
docker compose logs --tail=200 cli-proxy-api
```

确认上游账号本身有可用额度或权限。

### 13.4 流式响应中断

检查宝塔 Nginx 是否设置：

```nginx
proxy_buffering off;
proxy_request_buffering off;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
```

同时 CPA 配置保留：

```yaml
streaming:
  keepalive-seconds: 15
  bootstrap-retries: 1
```

### 13.5 IP Guard 误封

先确认真实 IP 透传。new-api 日志里应显示用户公网 IP。

如果刚上线流量复杂，可临时调高：

```yaml
- IP_GUARD_DISTINCT_IP_THRESHOLD=5
```

或者短期观察：

```yaml
- IP_GUARD_ENABLED=false
```

验证真实 IP 后再开启。

## 14. 备份与恢复

必须备份：

```text
/www/wwwroot/new-api/docker-compose.yml
/www/wwwroot/new-api/cpa/config.yaml
/www/wwwroot/new-api/cpa/auths/
/www/wwwroot/new-api/data/
/www/wwwroot/new-api/logs/
mysql_data volume
```

备份 compose 和 CPA 配置：

```bash
cd /www/wwwroot/new-api
mkdir -p backups
cp docker-compose.yml "backups/docker-compose.$(date +%F-%H%M%S).yml"
cp cpa/config.yaml "backups/cpa-config.$(date +%F-%H%M%S).yaml"
tar -czf "backups/cpa-auths.$(date +%F-%H%M%S).tar.gz" cpa/auths
```

MySQL 备份示例：

```bash
docker compose exec -T mysql mysqldump -uroot -pCHANGE_ME_MYSQL_PASSWORD new-api > "backups/new-api.$(date +%F-%H%M%S).sql"
```

注意：命令行里直接写密码会进入 shell 历史，生产环境可改用交互输入或临时配置文件。

## 15. 更新 CPA

```bash
cd /www/wwwroot/new-api
docker compose pull cli-proxy-api
docker compose up -d cli-proxy-api
docker compose logs --tail=100 cli-proxy-api
```

更新 new-api：

```bash
cd /www/wwwroot/new-api
docker compose pull new-api
docker compose up -d new-api
docker compose logs --tail=100 new-api
```

## 16. 最终上线检查清单

- [ ] 阿里云安全组未开放 `8317/1455/8085/54545/51121/3306/6379`。
- [ ] `new-api` 可通过域名 HTTPS 访问。
- [ ] 宝塔 Nginx 已设置长超时和关闭流式缓冲。
- [ ] new-api 日志页显示真实用户 IP。
- [ ] `cli-proxy-api` 只绑定宿主机 `127.0.0.1`，没有公网裸露。
- [ ] `cpa/config.yaml` 中 `api-keys` 与 new-api 渠道 API Key 一致。
- [ ] new-api 渠道 Base URL 是 `http://cli-proxy-api:8317`。
- [ ] 渠道测试 `OpenAI Responses (/v1/responses)` 通过。
- [ ] CPA OAuth auth 文件已生成并可持久化。
- [ ] MySQL、Redis、SESSION、CRYPTO、CPA 管理密钥都已轮换为新值。
- [ ] 普通用户额度、分组、模型权限已经设置。
- [ ] IP Guard 阈值已经按实际流量校准。

## 17. 参考链接

- CLIProxyAPI GitHub: <https://github.com/router-for-me/CLIProxyAPI>
- CLIProxyAPI Docker Compose 示例: <https://raw.githubusercontent.com/router-for-me/CLIProxyAPI/main/docker-compose.yml>
- CLIProxyAPI 配置示例: <https://raw.githubusercontent.com/router-for-me/CLIProxyAPI/main/config.example.yaml>
- CLIProxyAPI Docker 服务器 OAuth 教程: <https://help.router-for.me/cn/hands-on/tutorial-5>
- 阿里云 ECS 安全组文档: <https://help.aliyun.com/zh/ecs/user-guide/start-using-security-groups>
