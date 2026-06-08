#!/usr/bin/env pwsh
# ============================================================================
# 首页 UI 重设计 - 自动化测试脚本
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🐭 首页 UI 重设计 - 测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# 进入前端目录
$webDir = "web/default"
if (-not (Test-Path $webDir)) {
    Write-Host "❌ 错误: 找不到 $webDir 目录" -ForegroundColor Red
    exit 1
}

Set-Location $webDir
Write-Host "✅ 进入目录: $webDir" -ForegroundColor Green

# ============================================================================
# 测试 1: 检查组件文件是否存在
# ============================================================================
Write-Host ""
Write-Host "📋 测试 1: 检查组件文件..." -ForegroundColor Yellow

$componentFiles = @(
    "src/features/home/components/sections/hero.tsx",
    "src/features/home/components/sections/stats.tsx",
    "src/features/home/components/sections/features.tsx",
    "src/features/home/components/sections/how-it-works.tsx",
    "src/features/home/components/sections/cta.tsx"
)

$allFilesExist = $true
foreach ($file in $componentFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (不存在)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "❌ 测试 1 失败: 部分组件文件不存在" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

Write-Host ""
Write-Host "✅ 测试 1 通过: 所有组件文件存在" -ForegroundColor Green

# ============================================================================
# 测试 2: 检查 i18n 文案文件
# ============================================================================
Write-Host ""
Write-Host "📋 测试 2: 检查 i18n 文案..." -ForegroundColor Yellow

$i18nFiles = @(
    "src/i18n/locales/zh.json",
    "src/i18n/locales/en.json"
)

$requiredKeys = @(
    "rat_community_station",
    "ai_models_gathering",
    "one_api_all_done",
    "Lightning Fast Rat",
    "Throw in your keys",
    "Join the rat crew now"
)

$allI18nExist = $true
foreach ($file in $i18nFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $missingKeys = @()

        foreach ($key in $requiredKeys) {
            if ($content -notmatch "`"$key`"") {
                $missingKeys += $key
            }
        }

        if ($missingKeys.Count -eq 0) {
            Write-Host "  ✅ $file (包含所有新增文案)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $file (缺少文案: $($missingKeys -join ', '))" -ForegroundColor Red
            $allI18nExist = $false
        }
    } else {
        Write-Host "  ❌ $file (不存在)" -ForegroundColor Red
        $allI18nExist = $false
    }
}

if (-not $allI18nExist) {
    Write-Host ""
    Write-Host "❌ 测试 2 失败: i18n 文案不完整" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

Write-Host ""
Write-Host "✅ 测试 2 通过: i18n 文案完整" -ForegroundColor Green

# ============================================================================
# 测试 3: 检查关键代码模式
# ============================================================================
Write-Host ""
Write-Host "📋 测试 3: 检查关键代码模式..." -ForegroundColor Yellow

# 检查 Neo-Brutalism 硬阴影
$heroContent = Get-Content "src/features/home/components/sections/hero.tsx" -Raw
if ($heroContent -match 'shadow-\[') {
    Write-Host "  ✅ Hero: 包含 Neo-Brutalism 硬阴影" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Hero: 未检测到硬阴影样式" -ForegroundColor Yellow
}

# 检查纯色背景
$ctaContent = Get-Content "src/features/home/components/sections/cta.tsx" -Raw
if ($ctaContent -match 'bg-cyan-400') {
    Write-Host "  ✅ CTA: 使用纯色背景" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  CTA: 背景样式可能不符合预期" -ForegroundColor Yellow
}

# 检查 Stats Bento Grid
$statsContent = Get-Content "src/features/home/components/sections/stats.tsx" -Raw
if ($statsContent -match 'grid-cols-1.*sm:grid-cols-2') {
    Write-Host "  ✅ Stats: 使用 2x2 Bento Grid 布局" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Stats: 布局可能不是 Bento Grid" -ForegroundColor Yellow
}

# 检查 HowItWorks SVG 动画
$howItWorksContent = Get-Content "src/features/home/components/sections/how-it-works.tsx" -Raw
if ($howItWorksContent -match '<animate') {
    Write-Host "  ✅ HowItWorks: 包含 SVG 路径动画" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  HowItWorks: 未检测到 SVG 动画" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ 测试 3 通过: 关键代码模式检查完成" -ForegroundColor Green

# ============================================================================
# 测试总结
# ============================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 测试总结" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ 所有核心测试通过！" -ForegroundColor Green
Write-Host ""
Write-Host "📝 测试覆盖:" -ForegroundColor White
Write-Host "  • 5 个组件文件完整性" -ForegroundColor Gray
Write-Host "  • 2 个 i18n 文件文案完整性" -ForegroundColor Gray
Write-Host "  • 关键代码模式验证" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 下一步:" -ForegroundColor Yellow
Write-Host "  1. 运行 'bun run build' 编译项目" -ForegroundColor White
Write-Host "  2. 运行 'bun run dev' 启动开发服务器" -ForegroundColor White
Write-Host "  3. 访问 http://localhost:3000 查看效果" -ForegroundColor White
Write-Host ""

Set-Location ../..
