# MiMo 国际版渠道测试脚本
# 用途：验证 new-api 中的 Xiaomi MiMO International 渠道是否正常工作
# 使用方法：
#   1. 修改下面的配置变量（NEW_API_BASE_URL 和 NEW_API_TOKEN）
#   2. 在 PowerShell 中运行：.\test-mimo-international.ps1

# ============================================================================
# 配置区域 - 请根据实际情况修改
# ============================================================================

$NEW_API_BASE_URL = "https://你的new-api地址"  # 例如：https://api.example.com
$NEW_API_TOKEN = "sk-你的new-api令牌"          # 例如：sk-xxxxxx

# ============================================================================
# 脚本开始 - 无需修改下方内容
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MiMo 国际版渠道测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查配置
if ($NEW_API_BASE_URL -eq "https://你的new-api地址" -or $NEW_API_TOKEN -eq "sk-你的new-api令牌") {
    Write-Host "[错误] 请先修改脚本中的配置变量！" -ForegroundColor Red
    Write-Host "  - NEW_API_BASE_URL: 您的 new-api 服务地址" -ForegroundColor Yellow
    Write-Host "  - NEW_API_TOKEN: 您的 new-api API 令牌" -ForegroundColor Yellow
    exit 1
}

Write-Host "[配置] new-api 地址: $NEW_API_BASE_URL" -ForegroundColor Green
Write-Host "[配置] 令牌前缀: $($NEW_API_TOKEN.Substring(0, [Math]::Min(10, $NEW_API_TOKEN.Length)))..." -ForegroundColor Green
Write-Host ""

# ============================================================================
# 测试 1: OpenAI 端点测试
# ============================================================================

Write-Host "【测试 1】OpenAI 端点 (/v1/chat/completions)" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

$openaiBody = @{
    model = "mimo-v2.5-pro"
    messages = @(
        @{
            role = "user"
            content = "请用一句话介绍小米 MiMo 模型"
        }
    )
    max_tokens = 150
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$NEW_API_BASE_URL/v1/chat/completions" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $NEW_API_TOKEN"
            "Content-Type" = "application/json"
        } `
        -Body $openaiBody `
        -ErrorAction Stop

    Write-Host "[成功] OpenAI 端点响应正常" -ForegroundColor Green
    Write-Host "[模型] $($response.model)" -ForegroundColor Gray
    Write-Host "[回复] $($response.choices[0].message.content)" -ForegroundColor Gray
    Write-Host "[用量] Prompt: $($response.usage.prompt_tokens) | Completion: $($response.usage.completion_tokens) | Total: $($response.usage.total_tokens)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[失败] OpenAI 端点测试失败" -ForegroundColor Red
    Write-Host "[错误] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# ============================================================================
# 测试 2: Anthropic 端点测试
# ============================================================================

Write-Host "【测试 2】Anthropic 端点 (/v1/messages)" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

$anthropicBody = @{
    model = "mimo-v2.5-pro"
    max_tokens = 150
    messages = @(
        @{
            role = "user"
            content = "Introduce Xiaomi MiMo model in one sentence"
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$NEW_API_BASE_URL/v1/messages" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $NEW_API_TOKEN"
            "anthropic-version" = "2023-06-01"
            "Content-Type" = "application/json"
        } `
        -Body $anthropicBody `
        -ErrorAction Stop

    Write-Host "[成功] Anthropic 端点响应正常" -ForegroundColor Green
    Write-Host "[模型] $($response.model)" -ForegroundColor Gray
    Write-Host "[回复] $($response.content[0].text)" -ForegroundColor Gray
    Write-Host "[用量] Input: $($response.usage.input_tokens) | Output: $($response.usage.output_tokens)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[失败] Anthropic 端点测试失败" -ForegroundColor Red
    Write-Host "[错误] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# ============================================================================
# 测试 3: 模型列表查询
# ============================================================================

Write-Host "【测试 3】模型列表查询 (/v1/models)" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$NEW_API_BASE_URL/v1/models" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $NEW_API_TOKEN"
        } `
        -ErrorAction Stop

    Write-Host "[成功] 模型列表查询成功" -ForegroundColor Green

    $mimoModels = $response.data | Where-Object { $_.id -like "mimo-*" }

    if ($mimoModels.Count -gt 0) {
        Write-Host "[发现] 检测到 $($mimoModels.Count) 个 MiMo 模型：" -ForegroundColor Green
        foreach ($model in $mimoModels) {
            Write-Host "  - $($model.id)" -ForegroundColor Gray
        }
    } else {
        Write-Host "[提示] 未检测到 MiMo 模型，可能渠道未配置或模型列表未同步" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "[失败] 模型列表查询失败" -ForegroundColor Red
    Write-Host "[错误] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# ============================================================================
# 测试总结
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[提示] 如果所有测试都通过，说明 MiMo 国际版渠道配置正确！" -ForegroundColor Green
Write-Host "[提示] 如果测试失败，请检查：" -ForegroundColor Yellow
Write-Host "  1. new-api 后台是否已创建 'Xiaomi MiMO International' 渠道" -ForegroundColor Yellow
Write-Host "  2. 渠道的 API Key 是否正确（国际版专用）" -ForegroundColor Yellow
Write-Host "  3. 渠道状态是否启用" -ForegroundColor Yellow
Write-Host "  4. 渠道的模型列表中是否包含 'mimo-v2.5-pro'" -ForegroundColor Yellow
Write-Host ""
