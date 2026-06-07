<#
.SYNOPSIS
  模型健康度接口冒烟测试脚本（/api/model_health）。

.DESCRIPTION
  对 GET /api/model_health 接口按各周期发起请求，校验返回结构（success / data.summary / data.models）。
  仅做只读查询，不修改任何数据。

.PARAMETER BaseUrl
  服务基础地址，默认 http://localhost:3000

.EXAMPLE
  pwsh ./scripts/test_model_health.ps1 -BaseUrl https://api.faction168.online
#>
param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$periods = @("today", "week", "month", "all")
$failed = 0

Write-Host "==> 测试模型健康度接口: $BaseUrl/api/model_health" -ForegroundColor Cyan

foreach ($period in $periods) {
    $url = "$BaseUrl/api/model_health?period=$period"
    try {
        $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 30

        if (-not $resp.success) {
            Write-Host "[FAIL] period=$period success=false message=$($resp.message)" -ForegroundColor Red
            $failed++
            continue
        }

        $data = $resp.data
        if ($null -eq $data -or $null -eq $data.summary -or $null -eq $data.models) {
            Write-Host "[FAIL] period=$period 返回结构缺失 summary/models" -ForegroundColor Red
            $failed++
            continue
        }

        $s = $data.summary
        Write-Host ("[OK]   period={0,-5} 模型数={1,-4} 在线={2} 降级={3} 离线={4} 未检测={5} 渠道总数={6}" -f `
            $period, $s.total_models, $s.online, $s.degraded, $s.offline, $s.unknown, $s.total_channels) -ForegroundColor Green

        # 抽样打印前 3 个模型
        $data.models | Select-Object -First 3 | ForEach-Object {
            $rate = if ($_.request_count + $_.error_count -gt 0) { "{0:P1}" -f $_.success_rate } else { "N/A" }
            Write-Host ("       - {0,-28} status={1,-8} 渠道={2}/{3} 响应={4}ms 成功率={5}" -f `
                $_.model_name, $_.status, $_.healthy_channels, $_.total_channels, $_.avg_response_time_ms, $rate)
        }
    }
    catch {
        Write-Host "[FAIL] period=$period 请求异常: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "全部周期测试通过 ✅" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "存在 $failed 个失败周期 ❌" -ForegroundColor Red
    exit 1
}
