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
import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface CounterProps {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  decimals?: number
}

function Counter(props: CounterProps) {
  const { end, suffix = '', prefix = '', duration = 1600, decimals = 0 } = props
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  const formatValue = useCallback(
    (v: number) =>
      decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString(),
    [decimals]
  )

  const animate = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = `${prefix}${formatValue(eased * end)}${suffix}`
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, prefix, suffix, formatValue])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      el.textContent = `${prefix}${formatValue(end)}${suffix}`
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true
          animate()
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [animate, end, prefix, suffix, formatValue])

  return (
    <span ref={ref} className='tabular-nums'>
      {prefix}0{suffix}
    </span>
  )
}

interface StatsProps {
  className?: string
}

interface StatItem {
  end: number
  suffix: string
  label: string
  emoji: string
  color: string
  bgColor: string
  borderColor: string
  decimals?: number
}

export function Stats(_props: StatsProps) {
  const { t } = useTranslation()

  const stats: StatItem[] = [
    {
      end: 50,
      suffix: '+',
      label: t('upstream_services_integrated'),
      emoji: '🔌',
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-100 dark:bg-red-950',
      borderColor: 'border-red-500',
    },
    {
      end: 100,
      suffix: '+',
      label: t('model_billing_support'),
      emoji: '💰',
      color: 'text-cyan-700 dark:text-cyan-300',
      bgColor: 'bg-cyan-100 dark:bg-cyan-950',
      borderColor: 'border-cyan-500',
    },
    {
      end: 50,
      suffix: '+',
      label: t('compatible_api_routes'),
      emoji: '🛣️',
      color: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-100 dark:bg-yellow-950',
      borderColor: 'border-yellow-500',
    },
    {
      end: 10,
      suffix: '+',
      label: t('scheduling_controls'),
      emoji: '⚙️',
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-100 dark:bg-green-950',
      borderColor: 'border-green-500',
    },
  ]

  return (
    <section className='border-border/40 relative z-10 border-y py-16 md:py-20'>
      <div className='mx-auto max-w-6xl px-6'>
        {/* 标题 */}
        <div className='mb-10 text-center'>
          <h2 className='text-2xl font-black tracking-tight md:text-3xl'>
            {t('stats_title')} 📊
          </h2>
          <p className='text-muted-foreground mt-2 text-sm md:text-base'>
            {t('stats_subtitle')}
          </p>
        </div>

        {/* 2x2 Bento Grid */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6'>
          {stats.map((s, index) => (
            <div
              key={s.label}
              className={`group relative overflow-hidden rounded-2xl border-2 p-8 transition-all duration-300 hover:scale-105 hover:rotate-1 ${s.bgColor} ${s.borderColor} shadow-[4px_4px_0_var(--foreground)] hover:shadow-[6px_6px_0_var(--foreground)]`}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* 装饰性 emoji - 右上角大号半透明 */}
              <div className='absolute -top-4 -right-4 text-8xl opacity-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12'>
                {s.emoji}
              </div>

              {/* 内容 */}
              <div className='relative z-10 flex flex-col'>
                {/* 数字 */}
                <div className={`mb-2 text-5xl font-black ${s.color}`}>
                  <Counter end={s.end} suffix={s.suffix} decimals={s.decimals} />
                </div>

                {/* 标签 */}
                <div className={`text-sm font-bold uppercase tracking-wide ${s.color}`}>
                  {s.emoji} {s.label}
                </div>

                {/* 进度条装饰 */}
                <div className='mt-4 h-2 overflow-hidden rounded-full bg-foreground/10'>
                  <div
                    className={`h-full rounded-full ${s.borderColor.replace('border-', 'bg-')} transition-all duration-1000 ease-out`}
                    style={{
                      width: `${(s.end / 100) * 100}%`,
                      maxWidth: '100%',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
