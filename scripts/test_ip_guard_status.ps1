# IP守卫提醒机制 - 测试脚本
# 用于验证新增的 IP 守卫状态查询功能
# 运行方式: .\scripts\test_ip_guard_status.ps1

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$SessionCookie = "",
    [int]$UserId = 1
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   IP 守卫状态 API 测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查参数
if ([string]::IsNullOrEmpty($SessionCookie)) {
    Write-Host "❌ 错误: 请提供 Session Cookie" -ForegroundColor Red
    Write-Host ""
    Write-Host "使用方法:" -ForegroundColor Yellow
    Write-Host "  .\scripts\test_ip_guard_status.ps1 -SessionCookie 'your-session-cookie' -UserId 1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "如何获取 Session Cookie:" -ForegroundColor Yellow
    Write-Host "  1. 登录系统后，打开浏览器开发者工具 (F12)" -ForegroundColor Gray
    Write-Host "  2. 进入 Application -> Cookies" -ForegroundColor Gray
    Write-Host "  3. 复制 'session' 的值" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

$apiUrl = "$BaseUrl/api/user/ip-guard-status"
$headers = @{
    "Content-Type" = "application/json"
    "New-Api-User" = $UserId.ToString()
    "Cookie" = "session=$SessionCookie"
}

Write-Host "🔧 测试配置" -ForegroundColor Cyan
Write-Host "  - Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "  - User ID: $UserId" -ForegroundColor Gray
Write-Host "  - API Endpoint: $apiUrl" -ForegroundColor Gray
Write-Host ""

# 测试1: 获取 IP 守卫状态
Write-Host "📋 测试 1: 获取 IP 守卫状态" -ForegroundColor Yellow
Write-Host "  正在调用 GET $apiUrl ..." -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers $headers -ErrorAction Stop

    if ($response.success) {
        Write-Host "  ✅ API 调用成功" -ForegroundColor Green
        Write-Host ""

        $data = $response.data

        # 显示状态信息
        Write-Host "  📊 IP 守卫状态详情:" -ForegroundColor Cyan
        Write-Host "  ┌─────────────────────────────────────────┐" -ForegroundColor Gray

        # 状态指示器
        $statusColor = switch ($data.status) {
            "normal" { "Green" }
            "warning" { "Yellow" }
            "danger" { "Red" }
            default { "Gray" }
        }
        $statusIcon = switch ($data.status) {
            "normal" { "🟢" }
            "warning" { "🟠" }
            "danger" { "🔴" }
            default { "⚪" }
        }
        $statusText = switch ($data.status) {
            "normal" { "正常" }
            "warning" { "警告" }
            "danger" { "危险" }
            default { "未知" }
        }

        Write-Host "  │ 状态: $statusIcon $statusText" -ForegroundColor $statusColor
        Write-Host "  ├─────────────────────────────────────────┤" -ForegroundColor Gray

        # IP 使用情况
        $percentage = [math]::Round(($data.current_ips / $data.threshold) * 100, 1)
        Write-Host "  │ 当前 IP 数: $($data.current_ips) / $($data.threshold)" -ForegroundColor White
        Write-Host "  │ 使用率: $percentage%" -ForegroundColor White

        # 进度条
        $barLength = 30
        $filledLength = [math]::Floor(($data.current_ips / $data.threshold) * $barLength)
        $emptyLength = $barLength - $filledLength
        $progressBar = ("▓" * $filledLength) + ("░" * $emptyLength)
        Write-Host "  │ [$progressBar]" -ForegroundColor $statusColor

        Write-Host "  ├─────────────────────────────────────────┤" -ForegroundColor Gray

        # Strike 信息
        Write-Host "  │ Strike 计数: $($data.strike_count) / $($data.strike_threshold)" -ForegroundColor White
        Write-Host "  │ Strike 窗口: $($data.strike_window_hours) 小时" -ForegroundColor Gray

        Write-Host "  ├─────────────────────────────────────────┤" -ForegroundColor Gray

        # 配置信息
        Write-Host "  │ IP 检测窗口: $($data.window_minutes) 分钟" -ForegroundColor Gray
        Write-Host "  │ IP 阈值: $($data.threshold) 个不同 IP" -ForegroundColor Gray
        Write-Host "  └─────────────────────────────────────────┘" -ForegroundColor Gray
        Write-Host ""

        # 根据状态给出建议
        switch ($data.status) {
            "normal" {
                Write-Host "  ✅ 状态正常，可以继续使用。" -ForegroundColor Green
            }
            "warning" {
                Write-Host "  ⚠️  警告: 接近阈值，请注意不要在过多 IP 上使用。" -ForegroundColor Yellow
            }
            "danger" {
                Write-Host "  🚨 危险: 已触发禁用！请删除现有 API Key 并重新创建。" -ForegroundColor Red
            }
        }

        Write-Host ""
        Write-Host "  📄 完整 JSON 响应:" -ForegroundColor Cyan
        $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Gray

    } else {
        Write-Host "  ❌ API 返回失败" -ForegroundColor Red
        Write-Host "  错误信息: $($response.message)" -ForegroundColor Red
    }

} catch {
    Write-Host "  ❌ 请求失败" -ForegroundColor Red
    Write-Host "  错误详情: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  HTTP 状态码: $statusCode" -ForegroundColor Red

        if ($statusCode -eq 401) {
            Write-Host ""
            Write-Host "  💡 提示: Session Cookie 可能已过期，请重新获取。" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 测试2: 模拟多 IP 场景（可选，需要管理员权限）
Write-Host "💡 提示: 如需测试多 IP 场景，请参考以下步骤:" -ForegroundColor Yellow
Write-Host "  1. 使用代理或 VPN 切换 IP" -ForegroundColor Gray
Write-Host "  2. 从不同 IP 调用 API 接口" -ForegroundColor Gray
Write-Host "  3. 再次运行此脚本查看状态变化" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 更多测试场景请参考: docs/IP守卫提醒机制-实施文档.md" -ForegroundColor Cyan
