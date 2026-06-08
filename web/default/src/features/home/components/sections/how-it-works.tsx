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
import { useTranslation } from 'react-i18next'
import { AnimateInView } from '@/components/animate-in-view'

export function HowItWorks() {
  const { t } = useTranslation()

  const steps = [
    {
      num: '1',
      emoji: '⚙️',
      title: t('Throw in your keys'),
      desc: t('Add API keys, configure channels, done in 3 minutes'),
      color: 'bg-red-500',
      borderColor: 'border-red-500',
      shadowColor: 'shadow-[3px_3px_0_rgb(239,68,68)]',
    },
    {
      num: '2',
      emoji: '⚡',
      title: t('Start requesting'),
      desc: t('Use OpenAI/Claude/Gemini API routes directly'),
      color: 'bg-cyan-500',
      borderColor: 'border-cyan-500',
      shadowColor: 'shadow-[3px_3px_0_rgb(6,182,212)]',
    },
    {
      num: '3',
      emoji: '📊',
      title: t('Watch metrics soar'),
      desc: t('Real-time stats, token counting, billing at a glance'),
      color: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      shadowColor: 'shadow-[3px_3px_0_rgb(234,179,8)]',
    },
  ]

  return (
    <section className='border-border/40 relative z-10 border-t px-6 py-24 md:py-32'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-16 text-center md:mb-20'>
          <p className='text-muted-foreground mb-3 text-xs font-bold uppercase tracking-widest'>
            {t('How It Works')} 🔧
          </p>
          <h2 className='text-3xl font-black tracking-tight md:text-4xl'>
            {t('Three steps to take off')} 🚀
          </h2>
          <p className='text-muted-foreground mx-auto mt-3 max-w-2xl text-sm md:text-base'>
            {t('No complex setup, just a few clicks and youre ready to go')}
          </p>
        </AnimateInView>

        <div className='relative grid gap-8 md:grid-cols-3 md:gap-12'>
          {steps.map((step, i) => (
            <AnimateInView
              key={step.num}
              delay={i * 150}
              animation='fade-up'
              className='relative flex flex-col items-center text-center'
            >
              {/* 步骤卡片 */}
              <div
                className={`group relative mb-6 transition-all duration-300 hover:scale-105 hover:rotate-2 ${i === 1 ? 'md:hover:-rotate-2' : ''}`}
              >
                {/* 主圆形容器 */}
                <div
                  className={`flex size-24 items-center justify-center rounded-full border-4 ${step.borderColor} bg-background ${step.shadowColor} transition-all duration-300 group-hover:shadow-[5px_5px_0_currentColor]`}
                >
                  {/* emoji */}
                  <span className='text-5xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12'>
                    {step.emoji}
                  </span>
                </div>

                {/* 步骤编号徽章 */}
                <div
                  className={`absolute -top-2 -right-2 flex size-10 items-center justify-center rounded-full border-4 border-background ${step.color} text-lg font-black text-white shadow-[2px_2px_0_var(--foreground)]`}
                >
                  {step.num}
                </div>
              </div>

              {/* 文案 */}
              <h3 className='mb-2 text-lg font-bold'>{step.title}</h3>
              <p className='text-muted-foreground max-w-[260px] text-sm leading-relaxed'>
                {step.desc}
              </p>

              {/* 连接箭头 - 仅在非最后一项显示 */}
              {i < steps.length - 1 && (
                <div className='absolute top-12 left-1/2 hidden w-full md:block'>
                  <svg
                    className='absolute left-8 top-0 w-[calc(100%-4rem)]'
                    height='40'
                    viewBox='0 0 300 40'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    {/* 虚线路径 */}
                    <path
                      d='M 0 20 Q 150 -10 300 20'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeDasharray='8 4'
                      fill='none'
                      className='text-muted-foreground/30'
                    >
                      {/* 虚线流动动画 */}
                      <animate
                        attributeName='stroke-dashoffset'
                        from='0'
                        to='24'
                        dur='1s'
                        repeatCount='indefinite'
                      />
                    </path>
                    {/* 箭头 */}
                    <path
                      d='M 290 15 L 300 20 L 290 25'
                      stroke='currentColor'
                      strokeWidth='2'
                      fill='none'
                      className='text-muted-foreground/50'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
              )}
            </AnimateInView>
          ))}
        </div>

        {/* 底部提示 */}
        <AnimateInView
          delay={500}
          animation='fade-in'
          className='mt-16 text-center'
        >
          <div className='bg-muted/30 border-border/40 inline-flex items-center gap-2 rounded-full border-2 px-6 py-3 text-sm font-bold shadow-[3px_3px_0_var(--foreground)]'>
            <span className='relative flex size-3'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75' />
              <span className='relative inline-flex size-3 rounded-full bg-green-500' />
            </span>
            <span>{t('Average setup time')}: </span>
            <span className='text-green-600 dark:text-green-400'>
              &lt; 3 {t('minutes')} ⏱️
            </span>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
