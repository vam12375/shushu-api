# 公益站防滥用功能 — 端到端冒烟测试脚本
#
# 用途：对实际部署的站点验证「每用户1key」与「多IP禁用」行为。
# 注意：IP 守卫依据下游真实 IP，单机本地难以模拟多个真实 IP；
#       多 IP 场景建议用不同出口（手机热点 / 多台机器 / 不同代理）实测，
#       或在测试环境临时设 IP_GUARD_DISTINCT_IP_THRESHOLD 配合 X-Forwarded-For 伪造（需后端信任该头）。
#
# 用法：
#   $env:BASE_URL = "https://api.faction168.online"
#   $env:API_KEY  = "sk-xxxx"          # 待测用户的令牌
#   $env:SESSION_COOKIE = "session=..." # 已登录用户的 cookie（测试建令牌限制时用）
#   $env:NEW_API_USER = "123"           # 用户ID（控制台请求头 New-Api-User）
#   ./scripts/test_anti_abuse.ps1

$ErrorActionPreference = "Stop"

$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }
$ApiKey  = $env:API_KEY
$Cookie  = $env:SESSION_COOKIE
$NewApiUser = $env:NEW_API_USER

Write-Host "=== 公益站防滥用冒烟测试 ===" -ForegroundColor Cyan
Write-Host "目标站点: $BaseUrl`n"

# ---------------------------------------------------------------------------
# 测试 1：每用户最多创建 1 个令牌
# ---------------------------------------------------------------------------
function Test-TokenLimit {
    if (-not $Cookie -or -not $NewApiUser) {
        Write-Host "[跳过] 测试1 需要 SESSION_COOKIE 与 NEW_API_USER" -ForegroundColor Yellow
        return
    }
    Write-Host "[测试1] 每用户1令牌限制" -ForegroundColor Green
    $headers = @{
        "Cookie"      = $Cookie
        "New-Api-User" = $NewApiUser
        "Content-Type" = "application/json"
    }
    $body = '{"name":"冒烟测试令牌","remain_quota":500000,"expired_time":-1,"unlimited_quota":true}'

    # 第二次创建（假设用户已有 1 个令牌）应被拒绝
    try {
        $resp = Invoke-RestMethod -Uri "$BaseUrl/api/token/" -Method Post -Headers $headers -Body $body
        if ($resp.success -eq $false -and $resp.message -match "最多只能创建") {
            Write-Host "  ✓ 第二个令牌被正确拒绝：$($resp.message)" -ForegroundColor Green
        } elseif ($resp.success -eq $true) {
            Write-Host "  ! 创建成功——若该用户此前为 0 个令牌则属正常，请再次运行确认第二次被拒" -ForegroundColor Yellow
        } else {
            Write-Host "  ? 返回：$($resp | ConvertTo-Json -Compress)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ✗ 请求异常：$_" -ForegroundColor Red
    }
}

# ---------------------------------------------------------------------------
# 测试 2：API 令牌基本可用性（确认守卫不误伤正常单 IP 请求）
# ---------------------------------------------------------------------------
function Test-NormalRequest {
    if (-not $ApiKey) {
        Write-Host "[跳过] 测试2 需要 API_KEY" -ForegroundColor Yellow
        return
    }
    Write-Host "`n[测试2] 正常单 IP 请求应放行" -ForegroundColor Green
    $headers = @{ "Authorization" = "Bearer $ApiKey" }
    try {
        $resp = Invoke-RestMethod -Uri "$BaseUrl/v1/models" -Method Get -Headers $headers
        Write-Host "  ✓ 令牌可用，正常单 IP 多次请求未被误禁" -ForegroundColor Green
    } catch {
        $msg = $_.ErrorDetails.Message
        if ($msg -match "多个不同 IP" -or $msg -match "已被封禁") {
            Write-Host "  ! 命中守卫拦截：$msg" -ForegroundColor Yellow
        } else {
            Write-Host "  ✗ 请求异常：$_" -ForegroundColor Red
        }
    }

    # 连续 5 次同 IP 请求，确认不会因单 IP 触发禁用
    Write-Host "  连续 5 次同 IP 请求验证不误伤..."
    for ($i = 1; $i -le 5; $i++) {
        try {
            Invoke-RestMethod -Uri "$BaseUrl/v1/models" -Method Get -Headers $headers | Out-Null
            Write-Host "    第 $i 次 OK"
        } catch {
            Write-Host "    第 $i 次 失败：$($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

# ---------------------------------------------------------------------------
# 测试 3（说明）：多 IP 禁用 —— 需真实多出口环境
# ---------------------------------------------------------------------------
function Test-MultiIpInfo {
    Write-Host "`n[测试3] 多 IP 禁用（手动）" -ForegroundColor Green
    Write-Host @"
  此项无法在单机自动化。验证步骤：
    1. 用同一个 sk- 令牌，从 3 个不同公网 IP（如：宽带 / 手机热点 / 云主机）
       在 30 分钟内各发一次 /v1/models 请求；
    2. 第 3 个 IP 请求后，该令牌应被禁用，返回「请删除此 API 并重新创建」；
    3. 重复上述流程 3 轮（24h 内），第 3 轮触发后用户被封禁；
    4. 该用户删号后用同一 LinuxDO 账号重新登录，应被拒绝「已被永久封禁」。
"@ -ForegroundColor Gray
}

Test-TokenLimit
Test-NormalRequest
Test-MultiIpInfo

Write-Host "`n=== 冒烟测试结束 ===" -ForegroundColor Cyan
