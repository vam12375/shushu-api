# 腾讯云从 0 部署 New API 完整指南

本文档面向第一次在腾讯云部署 New API 的用户，按“购买云资源 -> 初始化服务器 -> Docker Compose 启动 -> 域名 HTTPS -> 后台初始化 -> 运维备份”的顺序编写。

默认推荐方案：

- 云服务器：腾讯云 CVM 或轻量应用服务器，Ubuntu Server 22.04/24.04 LTS。
- 运行方式：Docker Compose。
- 数据库：起步使用同机 MySQL 容器；生产增强可换成腾讯云云数据库 MySQL。
- 缓存：起步使用同机 Redis 容器；生产增强可换成腾讯云分布式缓存 Redis/Valkey。
- 对外入口：Nginx 反向代理，公网只开放 80/443，应用 3000 端口仅监听本机。

> 注意：中国大陆地域的服务器如果绑定域名并对公网提供网站/API 服务，通常需要完成 ICP 备案。香港、新加坡等非中国大陆地域通常不需要大陆 ICP 备案，但域名解析、TLS 证书和服务合规仍需自行确认。

---

## 1. 部署架构

### 1.1 单机 Docker Compose 架构

适合个人、团队内部、小规模生产环境：

```text
用户 / OpenAI SDK
        |
        | HTTPS 443
        v
腾讯云公网 IP / 域名
        |
        v
Nginx（宿主机）
        |
        | http://127.0.0.1:3000
        v
new-api 容器
        |
        +--> mysql 容器（仅 Docker 内网）
        |
        +--> redis 容器（仅 Docker 内网）
```

优点：

- 成本低，部署快。
- 迁移简单，备份 `docker-compose.yml`、`.env`、MySQL dump、`data/`、`logs/` 即可。
- 3000 端口不暴露到公网，公网只走 Nginx 的 HTTPS。

缺点：

- 数据库和应用在同一台服务器，单机故障会影响全部服务。
- 数据库备份、监控、主从容灾需要自己维护。

### 1.2 生产增强架构

适合更稳定的生产环境：

```text
用户 / OpenAI SDK
        |
        | HTTPS 443
        v
Nginx / CLB / WAF
        |
        v
new-api 容器（CVM）
        |
        +--> 腾讯云云数据库 MySQL（内网）
        |
        +--> 腾讯云 Redis/Valkey（内网）
```

增强点：

- 数据库使用腾讯云自动备份、监控、扩容能力。
- Redis 使用托管实例，降低内存缓存故障风险。
- 多实例时可再加 CLB，多个 New API 容器共享同一 MySQL、Redis、`SESSION_SECRET`、`CRYPTO_SECRET`。

---

## 2. 从 0 准备腾讯云资源

### 2.1 注册账号与实名认证

1. 注册腾讯云账号。
2. 完成实名认证。
3. 开通余额提醒，避免欠费停机。
4. 如果选择中国大陆地域并使用域名，提前准备 ICP 备案材料。

### 2.2 选择服务器类型

二选一即可：

| 方案 | 适合场景 | 建议 |
| --- | --- | --- |
| 轻量应用服务器 | 入门、个人、小团队、低成本 | 最容易上手，控制台防火墙简单 |
| CVM 云服务器 | 正式生产、需要 VPC、云数据库、CLB、弹性扩展 | 推荐生产环境使用 |

规格建议：

| 规模 | 建议配置 |
| --- | --- |
| 测试/自用 | 1 核 2 GB 内存，40 GB SSD |
| 小团队生产 | 2 核 4 GB 内存，80 GB SSD |
| 中等流量 | 4 核 8 GB 内存以上，数据库建议上腾讯云 MySQL |

地域建议：

- 面向中国大陆用户，且上游 AI 服务可稳定访问：选择广州、上海、北京等大陆地域，并完成备案。
- 面向海外或需要访问海外上游模型：优先评估中国香港、新加坡等地域的网络质量。
- 如果使用腾讯云云数据库 MySQL/Redis，CVM 和数据库尽量放在同一地域、同一 VPC。

### 2.3 创建服务器

以 Ubuntu Server 为例：

1. 进入腾讯云控制台。
2. 选择 **轻量应用服务器** 或 **云服务器 CVM**。
3. 创建实例：
   - 镜像：Ubuntu Server 22.04 LTS 或 24.04 LTS。
   - 公网 IP：需要。
   - 带宽：起步 5 Mbps 以上；如果请求/响应很大可提高。
   - 登录方式：推荐 SSH 密钥；也可以先用密码，后续改成密钥。
4. 记录服务器公网 IP，例如：

```text
203.0.113.10
```

---

## 3. 配置腾讯云防火墙/安全组

### 3.1 需要开放的端口

| 端口 | 协议 | 来源 | 用途 |
| --- | --- | --- | --- |
| 22 | TCP | 你的固定公网 IP | SSH 登录 |
| 80 | TCP | 0.0.0.0/0 | HTTP，申请/续期证书、跳转 HTTPS |
| 443 | TCP | 0.0.0.0/0 | HTTPS 正式访问 |

不建议开放：

| 端口 | 原因 |
| --- | --- |
| 3000 | New API 应用端口只给本机 Nginx 访问，不直接暴露公网 |
| 3306 | MySQL 只给容器内网或指定 CVM 内网访问 |
| 6379 | Redis 只给容器内网或指定 CVM 内网访问 |

### 3.2 轻量应用服务器

路径大致为：

1. 轻量应用服务器控制台。
2. 进入实例详情。
3. 打开 **防火墙** 页签。
4. 添加规则：
   - TCP 22，来源填你的公网 IP，例如 `198.51.100.20/32`。
   - TCP 80，来源 `0.0.0.0/0`。
   - TCP 443，来源 `0.0.0.0/0`。
5. 删除或收紧不需要的入站规则。

### 3.3 CVM 云服务器

路径大致为：

1. 云服务器 CVM 控制台。
2. 找到实例绑定的安全组。
3. 进入安全组规则。
4. 在 **入站规则** 添加：
   - TCP 22，来源填你的公网 IP。
   - TCP 80，来源 `0.0.0.0/0`。
   - TCP 443，来源 `0.0.0.0/0`。
5. 确认安全组已经关联到目标 CVM。

---

## 4. 登录服务器并初始化系统

以下命令默认在 Ubuntu 上执行。

### 4.1 SSH 登录

```bash
ssh root@203.0.113.10
```

如果使用普通用户：

```bash
ssh ubuntu@203.0.113.10
```

### 4.2 更新系统

```bash
sudo apt update
sudo apt -y upgrade
sudo apt -y install ca-certificates curl gnupg lsb-release git openssl ufw nginx
```

### 4.3 设置时区

```bash
sudo timedatectl set-timezone Asia/Shanghai
timedatectl
```

### 4.4 配置系统防火墙 UFW

腾讯云安全组/防火墙是第一层，Ubuntu UFW 是第二层。

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

如果你已经把 SSH 改成其他端口，先放行新端口再启用 UFW。

---

## 5. 安装 Docker 和 Docker Compose

### 5.1 安装 Docker 官方源

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 5.2 安装 Docker Engine 和 Compose 插件

```bash
sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 5.3 验证安装

```bash
docker --version
docker compose version
sudo docker run --rm hello-world
```

### 5.4 创建部署用户（推荐）

如果你一直使用 `root` 也可以跳过本节。生产环境建议创建普通用户：

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy
```

重新登录：

```bash
exit
ssh deploy@203.0.113.10
```

验证当前用户可以直接运行 Docker：

```bash
docker ps
```

---

## 6. 准备部署目录

```bash
sudo mkdir -p /opt/new-api
sudo chown -R "$USER":"$USER" /opt/new-api
cd /opt/new-api
```

创建目录：

```bash
mkdir -p data logs backups
```

目录用途：

| 路径 | 用途 |
| --- | --- |
| `/opt/new-api/docker-compose.yml` | Compose 编排文件 |
| `/opt/new-api/.env` | 密码、密钥、域名等敏感配置 |
| `/opt/new-api/data` | 应用持久化目录 |
| `/opt/new-api/logs` | 应用日志 |
| `/opt/new-api/backups` | 手动/定时备份 |

---

## 7. 生成生产密钥

执行以下命令生成随机值：

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 24
openssl rand -hex 24
openssl rand -hex 24
```

分别用于：

| 变量 | 建议长度 | 说明 |
| --- | --- | --- |
| `SESSION_SECRET` | 64 hex 字符 | 会话签名密钥，生产必须固定 |
| `CRYPTO_SECRET` | 64 hex 字符 | 加密密钥，共享 Redis/多实例时必须固定 |
| `MYSQL_ROOT_PASSWORD` | 48 hex 字符 | MySQL root 密码 |
| `MYSQL_PASSWORD` | 48 hex 字符 | New API 专用 MySQL 用户密码 |
| `REDIS_PASSWORD` | 48 hex 字符 | Redis 密码 |

> 不要每次重启都重新生成 `SESSION_SECRET` 和 `CRYPTO_SECRET`。它们必须写入 `.env` 后长期保持不变，否则可能导致登录态失效或加密数据无法解密。

---

## 8. 创建 `.env`

在 `/opt/new-api` 下创建：

```bash
nano .env
```

写入并替换所有占位值：

```dotenv
# 基础配置
DOMAIN=api.example.com
TZ=Asia/Shanghai
NODE_NAME=tencent-cloud-node-1

# New API 安全密钥：务必替换为 openssl rand 生成的值
SESSION_SECRET=replace_with_64_hex_chars
CRYPTO_SECRET=replace_with_64_hex_chars

# MySQL 容器配置
MYSQL_DATABASE=new-api
MYSQL_USER=newapi
MYSQL_ROOT_PASSWORD=replace_with_mysql_root_password
MYSQL_PASSWORD=replace_with_mysql_user_password

# Redis 容器配置
REDIS_PASSWORD=replace_with_redis_password
```

保存后收紧权限：

```bash
chmod 600 .env
```

检查文件：

```bash
ls -l .env
```

权限应类似：

```text
-rw------- 1 deploy deploy ... .env
```

---

## 9. 创建 `docker-compose.yml`

在 `/opt/new-api` 下创建：

```bash
nano docker-compose.yml
```

写入：

```yaml
services:
  new-api:
    image: calciumion/new-api:latest
    container_name: new-api
    restart: unless-stopped
    command: --log-dir /app/logs
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - ./data:/data
      - ./logs:/app/logs
    environment:
      PORT: "3000"
      SQL_DSN: "${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(mysql:3306)/${MYSQL_DATABASE}?charset=utf8mb4&parseTime=True&loc=Local"
      REDIS_CONN_STRING: "redis://:${REDIS_PASSWORD}@redis:6379/0"
      SESSION_SECRET: "${SESSION_SECRET}"
      CRYPTO_SECRET: "${CRYPTO_SECRET}"
      TZ: "${TZ}"
      ERROR_LOG_ENABLED: "true"
      BATCH_UPDATE_ENABLED: "true"
      NODE_NAME: "${NODE_NAME}"
      STREAMING_TIMEOUT: "300"
      MAX_REQUEST_BODY_MB: "64"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - new-api-network
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O - http://localhost:3000/api/status | grep -o '\"success\":\\s*true' || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 40s

  mysql:
    image: mysql:8.0
    container_name: new-api-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "${MYSQL_ROOT_PASSWORD}"
      MYSQL_DATABASE: "${MYSQL_DATABASE}"
      MYSQL_USER: "${MYSQL_USER}"
      MYSQL_PASSWORD: "${MYSQL_PASSWORD}"
      MYSQL_CHARACTER_SET_SERVER: utf8mb4
      MYSQL_COLLATION_SERVER: utf8mb4_unicode_ci
      TZ: "${TZ}"
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --default-time-zone=+08:00
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - new-api-network
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -p$${MYSQL_ROOT_PASSWORD} --silent"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  redis:
    image: redis:7-alpine
    container_name: new-api-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - redis_data:/data
    networks:
      - new-api-network
    healthcheck:
      test: ["CMD-SHELL", "redis-cli -a \"$${REDIS_PASSWORD}\" ping | grep PONG"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 10s

volumes:
  mysql_data:
  redis_data:

networks:
  new-api-network:
    driver: bridge
```

关键点：

- `127.0.0.1:3000:3000` 表示 3000 端口只在服务器本机可访问。
- MySQL 和 Redis 不映射公网端口。
- `SESSION_SECRET`、`CRYPTO_SECRET` 从 `.env` 固定读取。
- `MAX_REQUEST_BODY_MB=64` 需要和 Nginx 的 `client_max_body_size` 配合。

---

## 10. 启动服务

### 10.1 拉取镜像

```bash
cd /opt/new-api
docker compose pull
```

如果国内网络拉取 Docker Hub 镜像较慢，可以：

- 尝试更换腾讯云香港/新加坡等地域。
- 配置可用的 Docker 镜像加速源。
- 自行在 CI 中构建并推送到自己的腾讯云容器镜像服务 TCR。

### 10.2 启动

```bash
docker compose up -d
```

### 10.3 查看状态

```bash
docker compose ps
```

正常时应看到：

```text
new-api        running / healthy
new-api-mysql  running / healthy
new-api-redis  running / healthy
```

### 10.4 查看日志

```bash
docker compose logs -f new-api
```

退出日志跟随：

```text
Ctrl + C
```

### 10.5 本机健康检查

```bash
curl -fsS http://127.0.0.1:3000/api/status
```

预期包含：

```json
{"success":true}
```

此时应用已经在服务器本机启动成功，但公网还不能通过 HTTPS 访问，需要继续配置域名和 Nginx。

---

## 11. 配置域名解析

假设你的域名是：

```text
example.com
```

希望 New API 使用：

```text
api.example.com
```

### 11.1 DNSPod 添加 A 记录

1. 进入 DNSPod 控制台。
2. 选择域名 `example.com`。
3. 添加记录：

| 字段 | 值 |
| --- | --- |
| 主机记录 | `api` |
| 记录类型 | `A` |
| 线路类型 | 默认 |
| 记录值 | 服务器公网 IP，例如 `203.0.113.10` |
| TTL | 默认即可，例如 600 |

### 11.2 验证解析

在本地电脑或服务器执行：

```bash
nslookup api.example.com
```

或：

```bash
dig api.example.com
```

如果返回服务器公网 IP，说明解析生效。

---

## 12. 配置 HTTPS

你可以使用腾讯云 SSL 证书，也可以用 Certbot 自动签发 Let's Encrypt 证书。二选一即可。

### 12.1 方案 A：使用腾讯云 SSL 证书

适合已经在腾讯云管理证书的用户。

1. 进入腾讯云 SSL 证书控制台。
2. 申请免费或付费证书。
3. 证书域名填写 `api.example.com`。
4. 按提示完成 DNS 验证。
5. 签发后下载证书，服务器类型选择 **Nginx**。
6. 解压后通常会看到：
   - `api.example.com_bundle.crt`
   - `api.example.com_bundle.pem`
   - `api.example.com.key`
   - `.csr` 文件可忽略

在服务器创建证书目录：

```bash
sudo mkdir -p /etc/nginx/ssl/api.example.com
```

把证书和私钥上传到：

```text
/etc/nginx/ssl/api.example.com/api.example.com_bundle.crt
/etc/nginx/ssl/api.example.com/api.example.com.key
```

收紧权限：

```bash
sudo chmod 600 /etc/nginx/ssl/api.example.com/*
```

### 12.2 方案 B：使用 Certbot 自动签发证书

适合希望自动续期的用户。

```bash
sudo apt -y install certbot python3-certbot-nginx
```

先确认域名已经解析到当前服务器，并且 80 端口已开放。

签发证书：

```bash
sudo certbot --nginx -d api.example.com
```

检查自动续期：

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

如果使用 Certbot，它会自动修改 Nginx 配置。你仍然需要确认 Nginx 中的反向代理、SSE 超时和 `proxy_buffering off` 设置正确。

---

## 13. 配置 Nginx 反向代理

以下配置适用于腾讯云 SSL 证书方案。Certbot 用户可以参考其中的 `location /` 代理部分。

创建配置：

```bash
sudo nano /etc/nginx/conf.d/new-api.conf
```

写入，替换 `api.example.com` 和证书路径：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name api.example.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/nginx/ssl/api.example.com/api.example.com_bundle.crt;
    ssl_certificate_key /etc/nginx/ssl/api.example.com/api.example.com.key;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 64m;

    access_log /var/log/nginx/new-api.access.log;
    error_log /var/log/nginx/new-api.error.log warn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_connect_timeout 60s;

        proxy_buffering off;
        proxy_cache off;
    }
}
```

测试配置：

```bash
sudo nginx -t
```

重载 Nginx：

```bash
sudo systemctl reload nginx
```

检查 Nginx：

```bash
sudo systemctl status nginx
```

访问：

```text
https://api.example.com
```

---

## 14. 初始化 New API 后台

### 14.1 首次初始化

打开：

```text
https://api.example.com
```

全新数据库会进入初始化流程。按页面提示创建管理员账号。

建议：

- 管理员用户名不要使用常见弱用户名。
- 密码至少 12 位，包含大小写字母、数字和符号。
- 初始化后立刻进入后台检查系统设置。

### 14.2 如果看到登录页而不是初始化页

一般是数据库里已经有初始化记录或已有 root 用户。

如果你确定是全新测试数据库，但日志显示自动创建了 root 用户，可尝试：

```text
用户名：root
密码：123456
```

登录后必须立即修改密码。生产环境不要保留默认密码。

### 14.3 初始化后必做

1. 修改管理员密码。
2. 在系统设置中确认站点名称、公告、注册开关。
3. 根据需要关闭公开注册。
4. 添加上游渠道：
   - OpenAI
   - Azure
   - Claude
   - Gemini
   - 腾讯混元
   - 其他供应商
5. 创建普通用户或令牌。
6. 使用 OpenAI SDK 或 curl 做一次真实请求测试。

---

## 15. API 访问测试

### 15.1 健康检查

```bash
curl -fsS https://api.example.com/api/status
```

预期：

```json
{"success":true}
```

### 15.2 OpenAI 兼容接口测试

在后台创建令牌后，假设令牌是：

```text
sk-xxxxxxxx
```

测试模型列表：

```bash
curl https://api.example.com/v1/models \
  -H "Authorization: Bearer sk-xxxxxxxx"
```

测试聊天接口：

```bash
curl https://api.example.com/v1/chat/completions \
  -H "Authorization: Bearer sk-xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

实际可用模型名取决于你后台配置的渠道和模型映射。

---

## 16. 使用腾讯云云数据库 MySQL（生产增强）

如果要把 MySQL 从容器迁移到腾讯云云数据库 MySQL，建议使用 CVM，不建议轻量应用服务器直接内网连接云数据库。轻量应用服务器和云数据库默认内网不互通，需要额外配置云联网。

### 16.1 创建云数据库 MySQL

1. 进入腾讯云云数据库 MySQL 控制台。
2. 创建实例：
   - 地域：与 CVM 相同。
   - VPC：与 CVM 相同。
   - MySQL 版本：8.0 或项目支持的 5.7.8+。
   - 字符集：`utf8mb4`。
   - 存储：按业务量选择，起步 50 GB。
   - 备份：开启自动备份。
3. 创建数据库：

```text
new-api
```

4. 创建账号：

```text
newapi
```

5. 授权 `newapi` 对 `new-api` 数据库读写。

### 16.2 配置云数据库安全组

云数据库入站规则：

| 协议端口 | 来源 |
| --- | --- |
| TCP 3306 | New API 所在 CVM 的内网 IP 或 CVM 安全组 |

不要把 3306 对 `0.0.0.0/0` 开放。

### 16.3 修改 Compose

如果使用云数据库，`docker-compose.yml` 中删除 `mysql` 服务，并修改 `new-api` 的环境变量：

```yaml
environment:
  PORT: "3000"
  SQL_DSN: "newapi:your_mysql_password@tcp(cdb-xxxxxxxx.tencentcdb.com:3306)/new-api?charset=utf8mb4&parseTime=True&loc=Local"
  REDIS_CONN_STRING: "redis://:${REDIS_PASSWORD}@redis:6379/0"
  SESSION_SECRET: "${SESSION_SECRET}"
  CRYPTO_SECRET: "${CRYPTO_SECRET}"
  TZ: "${TZ}"
```

同时把 `depends_on` 中的 `mysql` 删除。

重启：

```bash
docker compose up -d
docker compose logs -f new-api
```

> 如果数据库密码包含 `@`、`:`、`/`、`?`、`#`、`&` 等特殊字符，连接串可能需要转义。为了减少部署坑，生产密码建议使用足够长的字母数字组合。

---

## 17. 使用腾讯云 Redis/Valkey（生产增强）

### 17.1 创建 Redis/Valkey 实例

1. 进入腾讯云分布式缓存数据库控制台。
2. 创建 Redis/Valkey 实例：
   - 地域：与 CVM 相同。
   - VPC：与 CVM 相同。
   - 版本：Redis 6.2/7.0 或 Valkey，按实际售卖选择。
   - 容量：起步 1 GB。
3. 记录内网地址和端口，例如：

```text
10.0.0.12:6379
```

### 17.2 配置 Redis 安全组

Redis 入站规则：

| 协议端口 | 来源 |
| --- | --- |
| TCP 6379 | New API 所在 CVM 的内网 IP 或 CVM 安全组 |

不要把 6379 对公网开放。

### 17.3 修改 Compose

如果使用腾讯云 Redis/Valkey，删除 `redis` 服务，并修改：

```yaml
environment:
  REDIS_CONN_STRING: "redis://:your_redis_password@10.0.0.12:6379/0"
```

如果使用自定义账号，连接串格式需按腾讯云实例账号规则调整。优先在 CVM 上用 `redis-cli` 测通后再给 New API 使用。

重启：

```bash
docker compose up -d
docker compose logs -f new-api
```

---

## 18. 从源码构建部署（可选）

如果你部署的不是 Docker Hub 镜像，而是当前仓库的改动版本，可以在服务器上从源码构建。

### 18.1 安装 Git 并拉取源码

```bash
cd /opt
git clone https://github.com/QuantumNous/new-api.git new-api-src
cd /opt/new-api-src
```

### 18.2 构建镜像

```bash
docker build -t new-api-local:$(git rev-parse --short HEAD) .
```

### 18.3 修改 Compose 镜像

把 `/opt/new-api/docker-compose.yml` 中：

```yaml
image: calciumion/new-api:latest
```

改成：

```yaml
image: new-api-local:你的提交短哈希
```

重启：

```bash
cd /opt/new-api
docker compose up -d
```

建议生产环境优先使用固定 tag，不要长期使用不可追踪的 `latest`。

---

## 19. 日常运维

### 19.1 查看运行状态

```bash
cd /opt/new-api
docker compose ps
```

### 19.2 查看应用日志

```bash
docker compose logs --tail=200 new-api
```

持续跟随：

```bash
docker compose logs -f new-api
```

### 19.3 查看 Nginx 日志

```bash
sudo tail -f /var/log/nginx/new-api.access.log
sudo tail -f /var/log/nginx/new-api.error.log
```

### 19.4 重启服务

```bash
cd /opt/new-api
docker compose restart new-api
```

### 19.5 停止服务

```bash
cd /opt/new-api
docker compose down
```

这不会删除 MySQL/Redis volume。

### 19.6 启动服务

```bash
cd /opt/new-api
docker compose up -d
```

---

## 20. 备份与恢复

### 20.1 手动备份 MySQL

创建备份脚本：

```bash
nano /opt/new-api/backup.sh
```

写入：

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/new-api
mkdir -p backups

backup_file="backups/new-api-$(date +%F-%H%M%S).sql"

docker compose exec -T mysql sh -lc \
  'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > "$backup_file"

gzip "$backup_file"

find backups -name "new-api-*.sql.gz" -type f -mtime +14 -delete

echo "Backup created: ${backup_file}.gz"
```

授权：

```bash
chmod +x /opt/new-api/backup.sh
```

执行：

```bash
/opt/new-api/backup.sh
```

### 20.2 定时备份

编辑 crontab：

```bash
crontab -e
```

每天凌晨 3 点备份：

```cron
0 3 * * * /opt/new-api/backup.sh >> /opt/new-api/backups/backup.log 2>&1
```

建议：

- 定期把 `backups/` 同步到 COS、另一台服务器或本地。
- 定期做恢复演练。
- 腾讯云 CVM 可配合云硬盘快照。
- 如果使用腾讯云云数据库 MySQL，开启自动备份，并确认备份保留时间。

### 20.3 恢复 MySQL

恢复前先停止应用，避免写入：

```bash
cd /opt/new-api
docker compose stop new-api
```

解压备份：

```bash
gunzip -c backups/new-api-2026-06-05-030000.sql.gz > /tmp/new-api-restore.sql
```

导入：

```bash
docker compose exec -T mysql sh -lc \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  < /tmp/new-api-restore.sql
```

启动应用：

```bash
docker compose start new-api
```

检查：

```bash
curl -fsS http://127.0.0.1:3000/api/status
```

---

## 21. 升级

### 21.1 升级前备份

```bash
cd /opt/new-api
/opt/new-api/backup.sh
cp docker-compose.yml "backups/docker-compose.$(date +%F-%H%M%S).yml"
cp .env "backups/env.$(date +%F-%H%M%S)"
```

### 21.2 拉取新镜像并重启

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 new-api
```

### 21.3 清理旧镜像

确认新版本正常后：

```bash
docker image prune -f
```

### 21.4 推荐固定版本

生产环境建议将：

```yaml
image: calciumion/new-api:latest
```

改为具体版本，例如：

```yaml
image: calciumion/new-api:vX.Y.Z
```

升级时先在测试环境验证，再改生产版本号。

---

## 22. 安全加固清单

### 22.1 腾讯云侧

- SSH 22 端口只允许你的固定公网 IP。
- 80/443 对公网开放。
- 3000、3306、6379 不对公网开放。
- 开启腾讯云主机安全、云监控告警。
- 如果业务量较大，可在入口前增加 CLB/WAF。
- 如果使用云数据库，数据库安全组只允许应用 CVM 内网访问。

### 22.2 服务器侧

- 禁止 root 密码登录，使用 SSH key。
- 定期执行系统安全更新。
- `.env` 权限保持 `600`。
- 不要把 `.env`、数据库备份、上游 API Key 上传到公开仓库。
- Nginx 开启 HTTPS，HTTP 只用于跳转 HTTPS。
- 不直接暴露 Docker socket。

### 22.3 应用侧

- 初始化后立即修改管理员密码。
- 关闭不需要的公开注册。
- 上游 API Key 分组管理，按用途创建不同渠道。
- 为用户和令牌设置合理额度。
- 定期查看日志、用量、异常请求。
- 多实例部署时确保所有实例使用相同 `SESSION_SECRET` 和 `CRYPTO_SECRET`。

---

## 23. 常见问题排查

### 23.1 域名打不开

检查顺序：

```bash
nslookup api.example.com
curl -I http://api.example.com
curl -I https://api.example.com
```

如果 DNS 没解析到服务器 IP：

- 检查 DNSPod A 记录。
- 等待 TTL 生效。
- 确认没有写错主机记录。

如果 80/443 超时：

- 检查腾讯云安全组/防火墙。
- 检查 UFW。
- 检查 Nginx 是否运行。

```bash
sudo ufw status
sudo systemctl status nginx
```

### 23.2 HTTPS 证书错误

检查：

- 证书域名是否等于 `api.example.com`。
- Nginx 配置里的证书路径是否正确。
- 是否上传了 `*_bundle.crt` 和 `.key`。
- 443 端口是否开放。

```bash
sudo nginx -t
sudo tail -n 100 /var/log/nginx/new-api.error.log
```

### 23.3 Nginx 502 Bad Gateway

通常是应用没启动或 3000 端口不通。

```bash
cd /opt/new-api
docker compose ps
docker compose logs --tail=200 new-api
curl -v http://127.0.0.1:3000/api/status
```

### 23.4 Docker 容器一直重启

查看日志：

```bash
docker compose logs --tail=300 new-api
docker compose logs --tail=300 mysql
docker compose logs --tail=300 redis
```

常见原因：

- `.env` 密码缺失。
- MySQL 没初始化完成。
- `SQL_DSN` 格式错误。
- 数据库密码包含特殊字符导致 DSN 解析失败。
- Redis 密码不一致。

### 23.5 登录后会话失效

检查：

- `SESSION_SECRET` 是否设置。
- 是否每次重启都变更了 `SESSION_SECRET`。
- 多实例是否使用同一 `SESSION_SECRET`。
- 浏览器是否阻止 Cookie。
- Nginx 是否传递 `X-Forwarded-Proto`。

### 23.6 流式响应中断或很慢

检查 Nginx：

```nginx
proxy_buffering off;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
```

检查应用环境变量：

```yaml
STREAMING_TIMEOUT: "300"
```

如果上游模型响应很慢，可以适当提高超时时间。

### 23.7 上传或请求体过大

Nginx 报 413 时，调大：

```nginx
client_max_body_size 64m;
```

应用侧同步调大：

```yaml
MAX_REQUEST_BODY_MB: "64"
```

然后：

```bash
sudo nginx -t
sudo systemctl reload nginx
cd /opt/new-api
docker compose up -d
```

### 23.8 云数据库连接失败

检查：

- CVM 和云数据库是否同地域、同 VPC。
- 云数据库安全组是否允许 CVM 内网 IP 访问 3306。
- `SQL_DSN` 是否使用内网地址。
- 数据库账号是否已授权 `new-api` 数据库。
- 密码是否包含需要转义的特殊字符。

在 CVM 上测试：

```bash
sudo apt -y install mysql-client
mysql -h cdb-xxxxxxxx.tencentcdb.com -P 3306 -u newapi -p new-api
```

### 23.9 Redis 连接失败

检查：

- Redis 和 CVM 是否同地域、同 VPC。
- Redis 安全组是否允许 CVM 内网 IP 访问 6379。
- `REDIS_CONN_STRING` 密码是否正确。
- 如果使用自定义账号，连接串格式是否符合腾讯云账号规则。

在 CVM 上测试：

```bash
sudo apt -y install redis-tools
redis-cli -h 10.0.0.12 -p 6379 -a 'your_redis_password' ping
```

预期：

```text
PONG
```

---

## 24. 最终验收清单

部署完成后逐项确认：

- [ ] 腾讯云安全组/防火墙只开放 22、80、443。
- [ ] 22 端口来源已限制为你的公网 IP。
- [ ] 3000 没有对公网开放。
- [ ] `docker compose ps` 全部服务 healthy。
- [ ] `curl http://127.0.0.1:3000/api/status` 返回 success。
- [ ] `https://api.example.com` 可访问。
- [ ] HTTP 会自动跳转 HTTPS。
- [ ] 初始化管理员账号完成。
- [ ] 默认/弱密码已修改。
- [ ] 上游渠道配置完成并测试通过。
- [ ] 定时备份已配置。
- [ ] 已记录 `.env`、证书、数据库备份的安全保存位置。

---

## 25. 官方参考资料

- 腾讯云轻量应用服务器：管理实例防火墙  
  <https://cloud.tencent.com/document/product/1207/44577>
- 腾讯云 CVM：添加安全组规则  
  <https://cloud.tencent.com/document/product/213/39740>
- DNSPod：设置 A 记录  
  <https://docs.dnspod.cn/dns/help-a/>
- 腾讯云 SSL 证书：Nginx 服务器 SSL 证书安装部署  
  <https://cloud.tencent.com/document/product/400/35244>
- 腾讯云 ICP 备案：备案云资源  
  <https://cloud.tencent.com/document/product/243/18908>
- 腾讯云云数据库 MySQL：创建 MySQL 实例  
  <https://cloud.tencent.com/document/product/236/46433>
- 腾讯云云数据库 MySQL：内网连接  
  <https://cloud.tencent.com/document/product/236/102005>
- 腾讯云云数据库 MySQL：管理云数据库安全组  
  <https://cloud.tencent.com/document/product/236/9537>
- 腾讯云 Redis/Valkey：快速创建实例  
  <https://cloud.tencent.com/document/product/239/30871>
- 腾讯云 Redis/Valkey：连接实例  
  <https://cloud.tencent.com/document/product/239/30877>
- Docker 官方文档：Install Docker Engine on Ubuntu  
  <https://docs.docker.com/engine/install/ubuntu/>
