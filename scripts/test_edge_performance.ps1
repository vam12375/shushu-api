# Edge 浏览器性能优化验证脚本
# 测试首页 3D 背景在 Edge 浏览器的性能改善

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Edge 浏览器首页性能优化验证" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. 检查前端编译产物
Write-Host "[1/5] 检查前端编译产物..." -ForegroundColor Yellow
$distPath = "web\default\dist"
if (-not (Test-Path $distPath)) {
    Write-Host "X 前端未编译，请先运行: cd web/default && bun run build" -ForegroundColor Red
    exit 1
}
Write-Host "√ 前端编译产物存在" -ForegroundColor Green

# 查找 rat-background 相关 chunk（包含 Edge 检测逻辑）
$found = $false
Get-ChildItem "$distPath\static\js\async" -Filter "*.js" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -match "Edg") {
        Write-Host "√ 找到包含 Edge 检测的 chunk: $($_.Name)" -ForegroundColor Green
        $found = $true

        # 简单验证：检查是否包含三元运算符（优化逻辑的标志）
        if ($content -match "\?16:32|\?30:60|\?120:240") {
            Write-Host "  √ 包含性能档位切换逻辑" -ForegroundColor Green
        } else {
            Write-Host "  - 代码已被高度压缩，无法直接验证内部逻辑" -ForegroundColor Yellow
        }
    }
}

if (-not $found) {
    Write-Host "- 未找到明显的 Edge 检测标识（可能已被混淆）" -ForegroundColor Yellow
    Write-Host "  提示：这不影响实际功能，请继续浏览器实测" -ForegroundColor Gray
}

Write-Host ""

# 2. 验证服务端配置
Write-Host "[2/5] 验证后端服务..." -ForegroundColor Yellow
if (-not (Test-Path "new-api.exe")) {
    Write-Host "X 后端未编译，请先运行: go build" -ForegroundColor Red
    exit 1
}
Write-Host "√ 后端可执行文件存在" -ForegroundColor Green
Write-Host ""

# 3. 性能对比提示
Write-Host "[3/5] 性能优化档位说明" -ForegroundColor Yellow
Write-Host "  Edge 浏览器（自动检测 UA: Edg/）：" -ForegroundColor Cyan
Write-Host "    - 粒子网节点: 32 -> 16 (连线计算从 O(496) 降至 O(120))" -ForegroundColor White
Write-Host "    - 连线距离阈值: 4.2 -> 3.5" -ForegroundColor White
Write-Host "    - 奶酪屑点云: 240 -> 120" -ForegroundColor White
Write-Host "    - 目标帧率: 60fps -> 30fps" -ForegroundColor White
Write-Host ""
Write-Host "  Chrome/Firefox（完整效果）：" -ForegroundColor Cyan
Write-Host "    - 保持原始配置，无性能降档" -ForegroundColor White
Write-Host ""

# 4. 启动说明
Write-Host "[4/5] 启动服务进行实测" -ForegroundColor Yellow
Write-Host "  请手动执行以下命令启动服务：" -ForegroundColor Gray
Write-Host "    .\new-api.exe" -ForegroundColor White
Write-Host ""
Write-Host "  启动后访问：http://localhost:3000" -ForegroundColor Gray
Write-Host ""

# 5. 测试检查清单
Write-Host "[5/5] 浏览器测试清单" -ForegroundColor Yellow
Write-Host "  【Edge 浏览器测试】" -ForegroundColor Cyan
Write-Host "    [ ] 打开开发者工具 (F12) -> Performance 标签" -ForegroundColor White
Write-Host "    [ ] 开始录制，滚动首页 3-5 秒，停止录制" -ForegroundColor White
Write-Host "    [ ] 检查 FPS：应接近 30fps（绿线稳定无大幅下降）" -ForegroundColor White
Write-Host "    [ ] 检查 Main 线程：黄色块应明显减少" -ForegroundColor White
Write-Host "    [ ] Console 验证：navigator.userAgent 包含 'Edg/'" -ForegroundColor White
Write-Host ""
Write-Host "  【Chrome 浏览器对照测试】" -ForegroundColor Cyan
Write-Host "    [ ] 同样步骤，FPS 应接近 60fps" -ForegroundColor White
Write-Host "    [ ] 视觉效果应比 Edge 更细腻（粒子更多、连线更密）" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "验证完成！请按上述清单进行浏览器实测" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
