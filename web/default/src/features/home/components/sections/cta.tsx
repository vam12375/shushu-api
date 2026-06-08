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
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()

  if (props.isAuthenticated) {
    return null
  }

  return (
    <section className='relative z-10 overflow-hidden px-6 py-24 md:py-32'>
      {/* 纯色背景块 - Memphis 风格 */}
      <div
        aria-hidden
        className='absolute inset-0 -z-10 bg-cyan-400 dark:bg-cyan-600'
      >
        {/* 装饰性几何图形 */}
        <div className='absolute top-10 left-10 size-32 rotate-12 bg-yellow-400 opacity-30' />
        <div className='absolute bottom-20 right-20 size-40 rounded-full bg-red-400 opacity-20' />
        <div className='absolute top-1/2 left-1/4 size-24 -rotate-12 bg-green-400 opacity-25' />
        {/* 波点装饰 */}
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:24px_24px]' />
      </div>

      <AnimateInView
        className='relative mx-auto max-w-3xl text-center'
        animation='scale-in'
      >
        {/* 顶部装饰 */}
        <div className='mb-6 flex justify-center'>
          <Sparkles className='size-16 animate-pulse text-yellow-300' />
        </div>

        {/* 主标题 */}
        <h2 className='text-3xl leading-tight font-black tracking-tight text-white md:text-5xl'>
          {t('Still waiting what for')} 🤔
          <br />
          <span className='inline-block -rotate-1 bg-yellow-400 px-4 text-foreground'>
            {t('Join the rat crew now')} 🐭
          </span>
        </h2>

        {/* 描述 */}
        <p className='mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/90 md:text-lg'>
          {t('Free API aggregation, community-driven, join thousands of devs')} 🚀
        </p>

        {/* 超大按钮组 */}
        <div className='mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row'>
          <Button
            className='group h-16 w-full rounded-full bg-yellow-400 px-12 text-xl font-black text-foreground shadow-[6px_6px_0_rgba(0,0,0,0.3)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-yellow-500 hover:shadow-[3px_3px_0_rgba(0,0,0,0.3)] sm:w-auto'
            render={<Link to='/sign-up' />}
          >
            <span className='animate-pulse'>🎉</span>
            {t('Get on Board Now')}
            <ArrowRight className='ml-2 size-6 transition-transform duration-200 group-hover:translate-x-2' />
          </Button>

          <Button
            variant='outline'
            className='h-16 w-full rounded-full border-4 border-white bg-white/10 px-10 text-lg font-bold text-white shadow-[4px_4px_0_rgba(255,255,255,0.3)] backdrop-blur-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-white/20 hover:shadow-[2px_2px_0_rgba(255,255,255,0.3)] sm:w-auto'
            render={<Link to='/pricing' />}
          >
            {t('View Pricing')} 💰
          </Button>
        </div>

        {/* 底部信任标记 */}
        <div className='mt-12 flex flex-wrap items-center justify-center gap-6 text-white/80'>
          <div className='flex items-center gap-2 text-sm font-bold'>
            <span className='flex size-2 rounded-full bg-green-400' />
            {t('100% Free')}
          </div>
          <div className='flex items-center gap-2 text-sm font-bold'>
            <span className='flex size-2 rounded-full bg-green-400' />
            {t('Open Source')}
          </div>
          <div className='flex items-center gap-2 text-sm font-bold'>
            <span className='flex size-2 rounded-full bg-green-400' />
            {t('Community Support')}
          </div>
        </div>

        {/* 装饰性 emoji 云 */}
        <div className='pointer-events-none mt-8 flex justify-center gap-4 text-4xl opacity-60'>
          <span className='inline-block animate-bounce' style={{ animationDelay: '0ms' }}>
            🎯
          </span>
          <span className='inline-block animate-bounce' style={{ animationDelay: '150ms' }}>
            ⚡
          </span>
          <span className='inline-block animate-bounce' style={{ animationDelay: '300ms' }}>
            🚀
          </span>
          <span className='inline-block animate-bounce' style={{ animationDelay: '450ms' }}>
            💎
          </span>
        </div>
      </AnimateInView>
    </section>
  )
}
