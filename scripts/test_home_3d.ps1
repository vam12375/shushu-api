#!/usr/bin/env pwsh
# ============================================================================
# 首页沉浸式 3D 重构 - 自动化测试脚本
# 覆盖:组件文件完整性 / 3D 场景关键代码 / 动效样式 / i18n 文案 / 生产构建
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧀 首页沉浸式 3D 重构 - 测试脚本" -ForegroundColor Cyan
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

$failed = $false

# ============================================================================
# 测试 1: 检查组件与 hooks 文件是否存在
# ============================================================================
Write-Host ""
Write-Host "📋 测试 1: 检查组件与 hooks 文件..." -ForegroundColor Yellow

$requiredFiles = @(
    "src/features/home/components/rat-background.tsx",
    "src/features/home/components/rat-hero.tsx",
    "src/features/home/components/rat-dashboard.tsx",
    "src/features/home/components/rat-ticker.tsx",
    "src/features/home/hooks/use-reveal.ts",
    "src/features/home/hooks/use-tilt.ts"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (不存在)" -ForegroundColor Red
        $failed = $true
    }
}

if ($failed) {
    Write-Host ""
    Write-Host "❌ 测试 1 失败: 部分文件不存在" -ForegroundColor Red
    Set-Location ../..
    exit 1
}
Write-Host ""
Write-Host "✅ 测试 1 通过" -ForegroundColor Green

# ============================================================================
# 测试 2: 3D 场景关键代码模式
# ============================================================================
Write-Host ""
Write-Host "📋 测试 2: 检查 3D 场景关键代码..." -ForegroundColor Yellow

$bg = Get-Content "src/features/home/components/rat-background.tsx" -Raw
$bgChecks = @(
    @{ Pattern = 'createCheesePlanet';        Desc = '奶酪星球构建函数' },
    @{ Pattern = 'createOrbitRats';           Desc = '鼠群轨道构建函数' },
    @{ Pattern = 'emojiTexture';              Desc = 'emoji 贴图(零外部资源)' },
    @{ Pattern = 'InstancedMesh';             Desc = '奶酪碎片 InstancedMesh' },
    @{ Pattern = 'velX \*= 0\.94';            Desc = '拖拽惯性衰减' },
    @{ Pattern = 'smoothstep\(scrollT';       Desc = '滚动驱动镜头' },
    @{ Pattern = 'prefers-reduced-motion';    Desc = '减少动效降级' },
    @{ Pattern = 'geometry\.dispose|geometries\.forEach'; Desc = '资源释放(防内存泄漏)' }
)
foreach ($check in $bgChecks) {
    if ($bg -match $check.Pattern) {
        Write-Host "  ✅ rat-background: $($check.Desc)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ rat-background: 缺少 $($check.Desc)" -ForegroundColor Red
        $failed = $true
    }
}

$hero = Get-Content "src/features/home/components/rat-hero.tsx" -Raw
if ($hero -match 'rat-ch') {
    Write-Host "  ✅ rat-hero: 标题逐字 3D 弹出" -ForegroundColor Green
} else {
    Write-Host "  ❌ rat-hero: 缺少逐字弹出" -ForegroundColor Red
    $failed = $true
}
if ($hero -match 'rotateX.*rotateY') {
    Write-Host "  ✅ rat-hero: 标题鼠标 3D 倾斜" -ForegroundColor Green
} else {
    Write-Host "  ❌ rat-hero: 缺少标题倾斜" -ForegroundColor Red
    $failed = $true
}

$dash = Get-Content "src/features/home/components/rat-dashboard.tsx" -Raw
if ($dash -match 'useTilt') {
    Write-Host "  ✅ rat-dashboard: Tilt 卡片" -ForegroundColor Green
} else {
    Write-Host "  ❌ rat-dashboard: 缺少 Tilt" -ForegroundColor Red
    $failed = $true
}
if ($dash -match 'translateZ') {
    Write-Host "  ✅ rat-dashboard: translateZ 分层悬浮" -ForegroundColor Green
} else {
    Write-Host "  ❌ rat-dashboard: 缺少分层悬浮" -ForegroundColor Red
    $failed = $true
}
# overflow-hidden 会强制 transform-style 为 flat,卡片本体不能再使用
if ($dash -match "'group relative z-10 overflow-hidden") {
    Write-Host "  ❌ rat-dashboard: 卡片本体不应使用 overflow-hidden(会破坏 preserve-3d)" -ForegroundColor Red
    $failed = $true
} else {
    Write-Host "  ✅ rat-dashboard: 卡片 preserve-3d 未被 overflow 破坏" -ForegroundColor Green
}

if ($failed) {
    Write-Host ""
    Write-Host "❌ 测试 2 失败" -ForegroundColor Red
    Set-Location ../..
    exit 1
}
Write-Host ""
Write-Host "✅ 测试 2 通过" -ForegroundColor Green

# ============================================================================
# 测试 3: 动效样式与降级
# ============================================================================
Write-Host ""
Write-Host "📋 测试 3: 检查动效样式..." -ForegroundColor Yellow

$css = Get-Content "src/styles/index.css" -Raw
$cssChecks = @(
    @{ Pattern = 'rat-ch-pop';     Desc = '逐字弹出 keyframes' },
    @{ Pattern = 'rat-rise-in';    Desc = '上浮入场 keyframes' },
    @{ Pattern = 'rat-wheel-dot';  Desc = '滚轮提示 keyframes' },
    @{ Pattern = '\.rat-reveal';   Desc = '滚动 3D 入场样式' }
)
foreach ($check in $cssChecks) {
    if ($css -match $check.Pattern) {
        Write-Host "  ✅ index.css: $($check.Desc)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ index.css: 缺少 $($check.Desc)" -ForegroundColor Red
        $failed = $true
    }
}
# 降级规则必须覆盖新动效类
if ($css -match '(?s)prefers-reduced-motion.*?\.rat-reveal') {
    Write-Host "  ✅ index.css: reduced-motion 降级覆盖新动效" -ForegroundColor Green
} else {
    Write-Host "  ❌ index.css: reduced-motion 未覆盖新动效" -ForegroundColor Red
    $failed = $true
}

if ($failed) {
    Write-Host ""
    Write-Host "❌ 测试 3 失败" -ForegroundColor Red
    Set-Location ../..
    exit 1
}
Write-Host ""
Write-Host "✅ 测试 3 通过" -ForegroundColor Green

# ============================================================================
# 测试 4: i18n 文案
# ============================================================================
Write-Host ""
Write-Host "📋 测试 4: 检查 i18n 文案..." -ForegroundColor Yellow

foreach ($file in @("src/i18n/locales/zh.json", "src/i18n/locales/en.json")) {
    $content = Get-Content $file -Raw -Encoding UTF8
    if ($content -match '往下滚 · 奶酪会动') {
        Write-Host "  ✅ $file (含滚动提示文案)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (缺少滚动提示文案)" -ForegroundColor Red
        $failed = $true
    }
}

if ($failed) {
    Write-Host ""
    Write-Host "❌ 测试 4 失败" -ForegroundColor Red
    Set-Location ../..
    exit 1
}
Write-Host ""
Write-Host "✅ 测试 4 通过" -ForegroundColor Green

# ============================================================================
# 测试 5: 生产构建(可用 -SkipBuild 跳过)
# ============================================================================
if ($args -notcontains "-SkipBuild") {
    Write-Host ""
    Write-Host "📋 测试 5: 生产构建..." -ForegroundColor Yellow
    bun run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 测试 5 失败: 构建报错" -ForegroundColor Red
        Set-Location ../..
        exit 1
    }
    Write-Host "✅ 测试 5 通过: 构建成功" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⏭️  测试 5 跳过(-SkipBuild)" -ForegroundColor Gray
}

# ============================================================================
# 测试总结
# ============================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 测试总结: 全部通过 ✅" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 测试覆盖:" -ForegroundColor White
Write-Host "  • 6 个组件/hooks 文件完整性" -ForegroundColor Gray
Write-Host "  • 3D 场景 8 项关键代码(星球/鼠群/惯性/滚动镜头/降级/释放)" -ForegroundColor Gray
Write-Host "  • 动效 keyframes 与 reduced-motion 降级" -ForegroundColor Gray
Write-Host "  • i18n 中英文案" -ForegroundColor Gray
Write-Host "  • 生产构建" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 手动验收:" -ForegroundColor Yellow
Write-Host "  1. bun run dev 后访问首页" -ForegroundColor White
Write-Host "  2. Hero 区按住拖动旋转奶酪星球,松手观察惯性" -ForegroundColor White
Write-Host "  3. 向下滚动观察星球滑向左后方让位看板" -ForegroundColor White
Write-Host "  4. 鼠标悬停看板观察 3D 倾斜与高光球" -ForegroundColor White
Write-Host ""

Set-Location ../..
