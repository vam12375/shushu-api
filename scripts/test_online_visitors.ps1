# 首页在线人数统计 - 测试脚本
# 用于验证 /api/status 新增的 online_users 字段(最近活跃访客统计)
# 运行方式: .\scripts\test_online_visitors.ps1
# 可选参数: -BaseUrl http://localhost:3000

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   首页在线人数 (online_users) 测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "$BaseUrl/api/status"

Write-Host "🔧 测试配置" -ForegroundColor Cyan
Write-Host "  - Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "  - API Endpoint: $apiUrl" -ForegroundColor Gray
Write-Host ""

# 测试1: /api/status 返回 online_users 字段
Write-Host "📋 测试 1: /api/status 返回 online_users 字段" -ForegroundColor Yellow
Write-Host "  正在调用 GET $apiUrl ..." -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop

    if (-not $response.success) {
        Write-Host "  ❌ API 返回 success=false" -ForegroundColor Red
        exit 1
    }

    $data = $response.data
    $onlineUsers = $data.online_users
    $activeConnections = $data.http_stats.active_connections

    if ($null -eq $onlineUsers) {
        Write-Host "  ❌ 响应中缺少 online_users 字段" -ForegroundColor Red
        exit 1
    }

    Write-Host "  ✅ API 调用成功" -ForegroundColor Green
    Write-Host ""
    Write-Host "  📊 统计字段详情:" -ForegroundColor Cyan
    Write-Host "  - online_users (最近活跃访客): $onlineUsers" -ForegroundColor Gray
    Write-Host "  - http_stats.active_connections (瞬时连接): $activeConnections" -ForegroundColor Gray
    Write-Host ""

    if ($onlineUsers -lt 1) {
        # 本次请求自身就应被计入,至少为 1
        Write-Host "  ❌ online_users 应至少为 1(包含本次请求)" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✅ online_users >= 1,本次访客已被记录" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ API 调用失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  请确认服务已启动且端口正确" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 测试2: 同 IP 重复请求不应使在线人数增长(按 IP 去重)
Write-Host "📋 测试 2: 同 IP 重复请求去重" -ForegroundColor Yellow

try {
    $first = (Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop).data.online_users
    Start-Sleep -Milliseconds 300
    $second = (Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop).data.online_users
    Start-Sleep -Milliseconds 300
    $third = (Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop).data.online_users

    Write-Host "  三次连续请求 online_users: $first -> $second -> $third" -ForegroundColor Gray

    if ($third -gt $first) {
        Write-Host "  ❌ 同 IP 重复请求导致计数增长,去重逻辑异常" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✅ 同 IP 重复请求计数稳定,去重正常" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ API 调用失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ✅ 全部测试通过" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "说明:" -ForegroundColor Yellow
Write-Host "  - online_users 统计最近 5 分钟内访问过 /api/status 的去重 IP 数" -ForegroundColor Gray
Write-Host "  - 配置 Redis (REDIS_CONN_STRING) 时为跨实例统计,否则为单机内存统计" -ForegroundColor Gray
Write-Host "  - 5 分钟无访问的 IP 会自动从统计中移除" -ForegroundColor Gray
