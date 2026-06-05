#!/bin/bash
# New-API 一键更新脚本（GHCR 镜像）
# 用法：在 /www/wwwroot/new-api 目录下执行  bash update.sh
# 作用：拉取 GHCR 最新镜像 → 滚动重启容器 → 清理旧镜像（数据不丢失）
set -e

cd "$(dirname "$0")"

echo "==> [1/3] 拉取最新镜像..."
docker-compose pull

echo "==> [2/3] 滚动重启容器（数据保留）..."
docker-compose up -d

echo "==> [3/3] 清理无用的旧镜像..."
docker image prune -f

echo ""
echo "✅ 更新完成！当前运行状态："
docker-compose ps
