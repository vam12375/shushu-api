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
import { Link } from '@tanstack/react-router'
import { CherryStudio } from '@lobehub/icons'
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { Button } from '@/components/ui/button'
import { HeroTerminalDemo } from '../hero-terminal-demo'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const docsUrl =
    (status?.docs_link as string | undefined) || 'https://docs.newapi.pro'

  const renderDocsButton = () => {
    const isExternal = docsUrl.startsWith('http')
    if (isExternal) {
      return (
        <Button
          variant='outline'
          className='group h-12 rounded-full border-2 border-foreground px-6 text-sm font-bold shadow-[3px_3px_0_var(--foreground)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--foreground)]'
          render={
            <a href={docsUrl} target='_blank' rel='noopener noreferrer' />
          }
        >
          <BookOpen className='size-4' />
          <span>{t('Documentation')}</span>
        </Button>
      )
    }
    return (
      <Button
        variant='outline'
        className='group h-12 rounded-full border-2 border-foreground px-6 text-sm font-bold shadow-[3px_3px_0_var(--foreground)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--foreground)]'
        render={<Link to={docsUrl} />}
      >
        <BookOpen className='size-4' />
        <span>{t('Documentation')}</span>
      </Button>
    )
  }

  return (
    <section className='relative z-10 overflow-hidden px-4 pt-20 pb-14 sm:px-6 md:pt-32 md:pb-24 lg:pt-36 lg:pb-28'>
      {/* Memphis 风格装饰背景 - 纯色几何图形 */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10'
      >
        {/* 大圆形 - 左上角 */}
        <div className='absolute -top-24 -left-24 size-96 rounded-full bg-cyan-400/20 blur-3xl' />
        {/* 中圆形 - 右上角 */}
        <div className='absolute top-40 -right-32 size-72 rounded-full bg-yellow-400/20 blur-3xl' />
        {/* 小圆形 - 左下角 */}
        <div className='absolute bottom-20 left-20 size-64 rounded-full bg-red-400/20 blur-3xl' />
        {/* 方形点缀 */}
        <div className='absolute top-1/3 right-1/4 size-32 rotate-12 bg-green-400/10 blur-2xl' />
      </div>

      <div className='mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16'>
        {/* 左栏：标题、描述、按钮 */}
        <div className='flex flex-col items-start text-left lg:col-span-6'>
          {/* 顶部徽章 - 诙谐风格 */}
          <div
            className='landing-animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border-2 border-cyan-500 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700 shadow-[3px_3px_0_rgb(6,182,212)] opacity-0 dark:border-cyan-400 dark:bg-cyan-950 dark:text-cyan-300'
            style={{ animationDelay: '0ms' }}
          >
            <Sparkles className='size-4 animate-pulse' />
            <span>{t('rat_community_station')}</span>
          </div>

          {/* 主标题 - 活泼有趣 */}
          <h1
            className='landing-animate-fade-up text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] font-black tracking-tight opacity-0'
            style={{ animationDelay: '60ms' }}
          >
            {t('ai_models_gathering')} 🎉
            <br />
            <span className='inline-block rotate-[-1deg] bg-yellow-400 px-3 text-foreground'>
              {t('one_api_all_done')}
            </span>
          </h1>

          {/* 描述文案 - 轻松口语化 */}
          <p
            className='landing-animate-fade-up text-muted-foreground mt-6 max-w-xl text-base leading-relaxed opacity-0 md:text-lg'
            style={{ animationDelay: '120ms' }}
          >
            {t('hero_description')}
          </p>

          {/* 按钮组 - Neo-Brutalism 风格 */}
          <div
            className='landing-animate-fade-up mt-8 flex w-full flex-wrap items-center gap-3 opacity-0 sm:mt-10'
            style={{ animationDelay: '180ms' }}
          >
            {props.isAuthenticated ? (
              <>
                <Button
                  className='group h-12 rounded-full bg-cyan-500 px-8 text-base font-bold text-white shadow-[4px_4px_0_rgb(8,145,178)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-cyan-600 hover:shadow-[2px_2px_0_rgb(8,145,178)]'
                  render={<Link to='/dashboard' />}
                >
                  {t('Go to Dashboard')} 🚀
                  <ArrowRight className='ml-2 size-5 transition-transform duration-200 group-hover:translate-x-1' />
                </Button>
                {renderDocsButton()}
              </>
            ) : (
              <>
                <Button
                  className='group h-12 rounded-full bg-cyan-500 px-8 text-base font-bold text-white shadow-[4px_4px_0_rgb(8,145,178)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-cyan-600 hover:shadow-[2px_2px_0_rgb(8,145,178)]'
                  render={<Link to='/sign-up' />}
                >
                  {t('Get on Board')} 🚀
                  <ArrowRight className='ml-2 size-5 transition-transform duration-200 group-hover:translate-x-1' />
                </Button>
                <Button
                  variant='outline'
                  className='h-12 rounded-full border-2 border-foreground px-6 text-sm font-bold shadow-[3px_3px_0_var(--foreground)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--foreground)]'
                  render={<Link to='/pricing' />}
                >
                  {t('View Pricing')} 💰
                </Button>
                {renderDocsButton()}
              </>
            )}
          </div>

          {/* 支持的应用 - 卡片化设计 */}
          <div
            className='landing-animate-fade-up mt-12 w-full max-w-xl opacity-0'
            style={{ animationDelay: '240ms' }}
          >
            <div className='mb-4'>
              <span className='text-muted-foreground/60 text-xs font-bold uppercase tracking-wider'>
                {t('Compatible Applications')} ✨
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              {/* Cherry Studio */}
              <a
                href='https://cherry-ai.com'
                target='_blank'
                rel='noopener noreferrer'
                className='group flex items-center gap-2 rounded-full border-2 border-pink-500 bg-pink-50 px-4 py-2 font-bold text-pink-700 shadow-[2px_2px_0_rgb(236,72,153)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgb(236,72,153)] dark:bg-pink-950 dark:text-pink-300'
              >
                <CherryStudio.Color size={20} className='shrink-0' />
                <span className='text-sm'>Cherry Studio</span>
              </a>

              {/* CC Switch */}
              <a
                href='https://ccswitch.io'
                target='_blank'
                rel='noopener noreferrer'
                className='group flex items-center gap-2 rounded-full border-2 border-blue-500 bg-blue-50 px-4 py-2 font-bold text-blue-700 shadow-[2px_2px_0_rgb(59,130,246)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgb(59,130,246)] dark:bg-blue-950 dark:text-blue-300'
              >
                <img
                  src='https://ccswitch.io/favicon.png'
                  alt='CC Switch'
                  className='size-5 shrink-0 rounded object-contain'
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.nextSibling as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                <span
                  style={{ display: 'none' }}
                  className='flex size-5 shrink-0 items-center justify-center rounded bg-blue-500/20 text-[9px] font-bold text-blue-600'
                >
                  CC
                </span>
                <span className='text-sm'>CC Switch</span>
              </a>

              {/* 更多 */}
              <div className='flex cursor-default items-center gap-2 rounded-full border-2 border-green-500 bg-green-50 px-4 py-2 font-bold text-green-700 shadow-[2px_2px_0_rgb(34,197,94)] transition-all hover:rotate-2 dark:bg-green-950 dark:text-green-300'>
                <span className='text-sm'>{t('More Apps')} 🎯</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右栏：Terminal Demo */}
        <div
          className='landing-animate-fade-up flex w-full justify-center opacity-0 lg:col-span-6'
          style={{ animationDelay: '320ms' }}
        >
          <div className='w-full transition-transform duration-300 hover:scale-[1.02]'>
            <HeroTerminalDemo />
          </div>
        </div>
      </div>
    </section>
  )
}
