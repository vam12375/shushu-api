/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Markdown } from '@/components/ui/markdown'
import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { getSelf } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { RatDashboard } from './components/rat-dashboard'
import { RatHero } from './components/rat-hero'
import { RatTicker } from './components/rat-ticker'
import { useHomePageContent, useReveal } from './hooks'

// Three.js 背景体积大(约 600KB),懒加载使其脱离首屏关键路径,
// 避免拖慢 hero 标题(LCP 元素)的渲染
const RatBackground = lazy(() =>
  import('./components/rat-background').then((m) => ({
    default: m.RatBackground,
  }))
)

// 首帧绘制完成后再挂载 WebGL 背景:chunk 下载与 WebGL 初始化都让位于 LCP
function useDeferredBackground() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(() => setShow(true), {
        timeout: 1500,
      })
      return () => window.cancelIdleCallback(handle)
    }
    const timer = window.setTimeout(() => setShow(true), 300)
    return () => window.clearTimeout(timer)
  }, [])

  return show
}

export function Home() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [sessionValid, setSessionValid] = useState(false)
  const { content, isUrl } = useHomePageContent()
  const showBackground = useDeferredBackground()
  // 鼠鼠语录滚动入场
  const quoteRef = useReveal<HTMLDivElement>()

  useEffect(() => {
    let active = true

    if (!auth.user) {
      setSessionValid(false)
      setSessionChecked(true)
      return () => {
        active = false
      }
    }

    setSessionChecked(false)
    setSessionValid(false)

    ;(async () => {
      try {
        const res = await getSelf()
        if (active && res?.success && res.data) {
          setSessionValid(true)
        }
      } catch {
        if (active) {
          setSessionValid(false)
        }
      } finally {
        if (active) {
          setSessionChecked(true)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [auth.user])

  const isAuthenticated = sessionChecked && sessionValid

  if (content && content.trim() !== '') {
    return (
      <PublicLayout showMainContainer={false}>
        <main className='overflow-x-hidden'>
          {isUrl ? (
            <iframe
              src={content}
              className='h-screen w-full border-none'
              title={t('Custom Home Page')}
            />
          ) : (
            <div className='container mx-auto py-8'>
              <Markdown className='custom-home-content'>{content}</Markdown>
            </div>
          )}
        </main>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <div className='relative font-outfit text-rat-brown bg-rat-warm selection:bg-rat-yellow/30'>
        {showBackground && (
          <Suspense fallback={null}>
            <RatBackground />
          </Suspense>
        )}
        <div className='relative z-10'>
          <RatHero isAuthenticated={isAuthenticated} />
          {isAuthenticated && <RatDashboard />}
          <RatTicker />
          {/* 鼠鼠语录 */}
          <div
            ref={quoteRef}
            className='rat-reveal max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24 text-center'
          >
            <div className='font-hand text-3xl sm:text-4xl lg:text-5xl opacity-30 text-rat-brown'>
              {t('"鼠鼠我呀，最爱 API 啦捏~"')}
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </PublicLayout>
  )
}
