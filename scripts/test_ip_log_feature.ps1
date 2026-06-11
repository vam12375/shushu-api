# IP 记录功能增强 - 验证脚本
# 验证两项功能:① 管理员全局强制记录 IP 开关 ② 使用日志列表 IP 列
# 用法:
#   静态检查 + 编译:  .\scripts\test_ip_log_feature.ps1
#   附加运行时 API 检查: .\scripts\test_ip_log_feature.ps1 -BaseUrl http://localhost:3000 -AdminToken "<管理员AccessToken>"

param(
    [string]$BaseUrl = "",
    [string]$AdminToken = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0; $fail = 0

function Check($name, $condition) {
    if ($condition) {
        Write-Host "[PASS] $name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "[FAIL] $name" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`n=== 一、后端静态检查 ===" -ForegroundColor Cyan

# 1. 全局变量定义
$constants = Get-Content (Join-Path $root "common\constants.go") -Raw -Encoding utf8
Check "common/constants.go 定义 ForceRecordIpLogEnabled" ($constants -match "ForceRecordIpLogEnabled")

# 2. option 注册(初始化 + 更新 case 两处)
$option = Get-Content (Join-Path $root "model\option.go") -Raw -Encoding utf8
Check "model/option.go 注册 OptionMap[ForceRecordIpLogEnabled]" ($option -match 'OptionMap\["ForceRecordIpLogEnabled"\]')
Check "model/option.go 含 ForceRecordIpLogEnabled 更新分支" ($option -match 'case "ForceRecordIpLogEnabled"')

# 3. 日志记录逻辑:仅由全局强制开关控制,用户个人设置回退已注释停用
$log = Get-Content (Join-Path $root "model\log.go") -Raw -Encoding utf8
$hits = ([regex]::Matches($log, "needRecordIp := common\.ForceRecordIpLogEnabled")).Count
Check "model/log.go 两处日志记录均接入全局强制开关 (实际 $hits 处)" ($hits -eq 2)
$activeFallback = [regex]::Matches($log, "(?m)^\s*if settingMap, err := GetUserSetting").Count
Check "model/log.go 用户个人设置回退已停用 (未注释残留 $activeFallback 处)" ($activeFallback -eq 0)

Write-Host "`n=== 二、前端静态检查 ===" -ForegroundColor Cyan

# 4. 管理端设置组件
$section = Get-Content (Join-Path $root "web\default\src\features\system-settings\maintenance\log-settings-section.tsx") -Raw -Encoding utf8
Check "log-settings-section.tsx 表单含 ForceRecordIpLogEnabled" ($section -match "ForceRecordIpLogEnabled")
Check "log-settings-section.tsx 含强制开关 UI 文案" ($section -match "Force record IP address")

$registry = Get-Content (Join-Path $root "web\default\src\features\system-settings\operations\section-registry.tsx") -Raw -Encoding utf8
Check "section-registry.tsx 传递 defaultForceIpEnabled" ($registry -match "defaultForceIpEnabled")

$types = Get-Content (Join-Path $root "web\default\src\features\system-settings\types.ts") -Raw -Encoding utf8
Check "types.ts 声明 ForceRecordIpLogEnabled 类型" ($types -match "ForceRecordIpLogEnabled: boolean")

# 5. 日志列表 IP 列(位于费用列之后,完整明文显示)
$columns = Get-Content (Join-Path $root "web\default\src\features\usage-logs\components\columns\common-logs-columns.tsx") -Raw -Encoding utf8
Check "common-logs-columns.tsx 新增 ip 列" ($columns -match "accessorKey: 'ip'")
$quotaIdx = $columns.IndexOf("accessorKey: 'quota'")
$ipIdx = $columns.IndexOf("accessorKey: 'ip'")
$contentIdx = $columns.IndexOf("accessorKey: 'content'")
Check "IP 列位于费用(quota)列之后、详情(content)列之前" (($quotaIdx -lt $ipIdx) -and ($ipIdx -lt $contentIdx) -and ($quotaIdx -ge 0))
Check "IP 列完整明文显示(无敏感遮罩)" ($columns -notmatch "sensitiveVisible \? log\.ip")

# 6. 用户端个人设置开关已注释停用
$profileTab = Get-Content (Join-Path $root "web\default\src\features\profile\components\tabs\notification-tab.tsx") -Raw -Encoding utf8
Check "notification-tab.tsx 用户端 IP 开关已注释停用" ($profileTab -match "用户端 IP 记录开关已停用")

# 6. i18n 翻译
$zh = Get-Content (Join-Path $root "web\default\src\i18n\locales\zh.json") -Raw -Encoding utf8
Check "zh.json 含「强制记录 IP 地址」翻译" ($zh -match "强制记录 IP 地址")
Check "zh.json 含强制开关描述翻译" ($zh -match "忽略用户个人设置")

Write-Host "`n=== 三、编译验证 ===" -ForegroundColor Cyan

Push-Location $root
try {
    go build ./... 2>&1 | Out-Null
    Check "go build ./... 编译通过" ($LASTEXITCODE -eq 0)
} finally {
    Pop-Location
}

# 四、运行时 API 检查(可选,需要服务已启动且提供管理员令牌)
if ($BaseUrl -and $AdminToken) {
    Write-Host "`n=== 四、运行时 API 检查 ===" -ForegroundColor Cyan
    $headers = @{ Authorization = "Bearer $AdminToken"; "New-Api-User" = "1" }

    # 读取选项列表,确认新选项已暴露
    $resp = Invoke-RestMethod -Uri "$BaseUrl/api/option/" -Headers $headers -Method Get
    $opt = $resp.data | Where-Object { $_.key -eq "ForceRecordIpLogEnabled" }
    Check "GET /api/option/ 返回 ForceRecordIpLogEnabled" ($null -ne $opt)

    # 开启强制记录
    $body = @{ key = "ForceRecordIpLogEnabled"; value = "true" } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$BaseUrl/api/option/" -Headers $headers -Method Put -Body $body -ContentType "application/json"
    Check "PUT /api/option/ 开启强制记录成功" ($resp.success -eq $true)

    # 还原为关闭
    $body = @{ key = "ForceRecordIpLogEnabled"; value = "false" } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$BaseUrl/api/option/" -Headers $headers -Method Put -Body $body -ContentType "application/json"
    Check "PUT /api/option/ 还原关闭成功" ($resp.success -eq $true)

    Write-Host "提示:开启后可发起一次对话请求,再查询 /api/log/ 确认 ip 字段非空。" -ForegroundColor Yellow
} else {
    Write-Host "`n(跳过运行时 API 检查:未提供 -BaseUrl 与 -AdminToken)" -ForegroundColor DarkGray
}

Write-Host "`n=== 结果:$pass 通过 / $fail 失败 ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 }
