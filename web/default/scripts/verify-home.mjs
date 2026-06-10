// 主页验证脚本:中文显示 + 浅色/深色模式截图
// 用法:bunx playwright test 不适用,直接 bun run scripts/verify-home.mjs
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const outDir = process.env.OUT_DIR || '.playwright-out'

const browser = await chromium.launch()
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  })
  // 预设语言为简体中文(i18next localStorage 检测)
  await context.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'zh')
  })

  const page = await context.newPage()
  const failedChunks = []
  page.on('requestfailed', (req) => {
    if (req.url().includes('/static/')) failedChunks.push(req.url())
  })

  // ── 场景 1:浅色模式 + 中文 ──
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${outDir}/home-light.png`, fullPage: false })

  const bodyText = await page.evaluate(() => document.body.innerText)
  const checks = {
    标题渲染: bodyText.includes('STAMPEDE'),
    中文按钮: bodyText.includes('领一份奶酪'),
    中文文案: bodyText.includes('鼠鼠'),
    导航中文: /登录|定价|模型/.test(bodyText),
  }
  console.log('── 中文渲染检查 ──')
  for (const [name, ok] of Object.entries(checks)) {
    console.log(`${ok ? '✅' : '❌'} ${name}`)
  }

  // ── 场景 2:深色模式 ──
  await context.addCookies([
    { name: 'vite-ui-theme', value: 'dark', url: BASE },
  ])
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const isDark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark')
  )
  const bgColor = await page.evaluate(() => {
    const el = document.querySelector('.bg-rat-warm')
    return el ? getComputedStyle(el).backgroundColor : 'N/A'
  })
  console.log('── 深色模式检查 ──')
  console.log(`${isDark ? '✅' : '❌'} html.dark 类已应用`)
  console.log(`🎨 bg-rat-warm 实际背景色: ${bgColor}(期望深棕 rgb(35,29,20))`)
  await page.screenshot({ path: `${outDir}/home-dark.png`, fullPage: false })

  // ── 场景 3:深色模式整页(含 ticker/语录/页脚) ──
  await page.screenshot({ path: `${outDir}/home-dark-full.png`, fullPage: true })

  if (failedChunks.length) {
    console.log('❌ 静态资源加载失败:', failedChunks.slice(0, 5))
  } else {
    console.log('✅ 所有静态资源加载成功')
  }
} finally {
  await browser.close()
}
console.log('完成,截图已保存到', outDir)
