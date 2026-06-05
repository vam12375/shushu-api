#!/bin/bash
# SQLite -> MySQL 数据迁移脚本（一次性使用）
#
# 用途：把本地 go run 产生的 one-api.db 数据迁移到服务器 Docker 中的 MySQL
# 原理：清空 MySQL 库 -> 用一次性 Docker 容器跑 sqlite3-to-mysql 导入 -> 校验
#       全程不在宿主机装 Python、不对外暴露 MySQL 端口
#
# 用法：
#   bash migrate-sqlite-to-mysql.sh <sqlite文件路径> <MySQL密码>
# 示例：
#   bash migrate-sqlite-to-mysql.sh /www/wwwroot/new-api/one-api.db 'YourMySQLPassword'
#
# 前提：
#   1. 已在 /www/wwwroot/new-api 用 docker-compose 跑起 mysql 容器
#   2. 已把本地 one-api.db 上传到服务器
#   3. <MySQL密码> 必须与 docker-compose.yml 中 MYSQL_ROOT_PASSWORD 一致
set -e

SQLITE_FILE="$1"
MYSQL_PASSWORD="$2"
DB_NAME="new-api"          # 与 compose 中 MYSQL_DATABASE 一致
MYSQL_CONTAINER="mysql"    # 与 compose 中 mysql 服务的 container_name 一致

# ---- 参数校验 ----
if [ -z "$SQLITE_FILE" ] || [ -z "$MYSQL_PASSWORD" ]; then
  echo "用法: bash migrate-sqlite-to-mysql.sh <sqlite文件路径> <MySQL密码>"
  exit 1
fi
if [ ! -f "$SQLITE_FILE" ]; then
  echo "❌ 找不到 SQLite 文件: $SQLITE_FILE"
  exit 1
fi

# 取绝对路径，供挂载使用
SQLITE_ABS="$(cd "$(dirname "$SQLITE_FILE")" && pwd)/$(basename "$SQLITE_FILE")"

echo "==> [1/5] 停止 new-api 容器（保留 mysql 运行）..."
if [ -f docker-compose.yml ]; then
  docker-compose stop new-api || true
fi

echo "==> [2/5] 清空并重建 MySQL 数据库 ${DB_NAME}..."
docker exec "$MYSQL_CONTAINER" mysql -uroot -p"${MYSQL_PASSWORD}" \
  -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "==> [3/5] 定位 Docker 网络..."
NET=$(docker network ls --format '{{.Name}}' | grep new-api | head -1)
if [ -z "$NET" ]; then
  echo "❌ 未找到包含 new-api 的 Docker 网络，请确认 compose 已启动"
  exit 1
fi
echo "    使用网络: $NET"

echo "==> [4/5] 运行一次性迁移容器（SQLite -> MySQL）..."
docker run --rm \
  --network "$NET" \
  -v "${SQLITE_ABS}:/data/one-api.db:ro" \
  python:3.12-slim \
  bash -c "pip install --quiet sqlite3-to-mysql && \
    sqlite3mysql -f /data/one-api.db -d ${DB_NAME} -u root \
    --mysql-password '${MYSQL_PASSWORD}' -h ${MYSQL_CONTAINER} -P 3306"

echo "==> [5/5] 校验数据并重启 new-api..."
docker exec "$MYSQL_CONTAINER" mysql -uroot -p"${MYSQL_PASSWORD}" "${DB_NAME}" \
  -e "SELECT COUNT(*) AS 渠道数 FROM channels; SELECT COUNT(*) AS 用户数 FROM users;" || true

docker-compose up -d

echo ""
echo "✅ 迁移完成！请用【本地的管理员账号密码】登录服务器。"
echo "   如需查看启动日志: docker-compose logs -f new-api"
