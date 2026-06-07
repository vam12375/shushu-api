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
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModelHealthPeriod, ModelHealthSummary } from '../types'

const PERIODS: { id: ModelHealthPeriod; labelKey: string }[] = [
  { id: 'today', labelKey: 'Today' },
  { id: 'week', labelKey: 'Week' },
  { id: 'month', labelKey: 'Month' },
  { id: 'all', labelKey: 'All-time' },
]

type HealthHeroProps = {
  period: ModelHealthPeriod
  onPeriodChange: (period: ModelHealthPeriod) => void
  summary?: ModelHealthSummary
  updatedAt?: number
}

type Severity = 'ok' | 'warn' | 'down'

function getSeverity(summary?: ModelHealthSummary): Severity {
  if (!summary) return 'ok'
  if (summary.offline > 0) return 'down'
  if (summary.degraded > 0) return 'warn'
  return 'ok'
}

const SEVERITY_STYLE: Record<
  Severity,
  { dot: string; glow: string; text: string }
> = {
  ok: {
    dot: 'bg-emerald-500',
    glow: 'oklch(0.72 0.17 162 / 55%)',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  warn: {
    dot: 'bg-amber-500',
    glow: 'oklch(0.77 0.16 78 / 55%)',
    text: 'text-amber-600 dark:text-amber-400',
  },
  down: {
    dot: 'bg-red-500',
    glow: 'oklch(0.64 0.21 25 / 55%)',
    text: 'text-red-600 dark:text-red-400',
  },
}

export function HealthHero(props: HealthHeroProps) {
  const { t, i18n } = useTranslation()
  const severity = getSeverity(props.summary)
  const style = SEVERITY_STYLE[severity]

  const headline = (() => {
    if (!props.summary) return t('Model Health')
    if (severity === 'down')
      return t('{{count}} models offline', { count: props.summary.offline })
    if (severity === 'warn')
      return t('{{count}} models degraded', { count: props.summary.degraded })
    return t('All models operational')
  })()

  const updatedLabel =
    props.updatedAt && props.updatedAt > 0
      ? new Date(props.updatedAt * 1000).toLocaleTimeString(i18n.language)
      : null

  return (
    <section className='relative overflow-hidden rounded-2xl border'>
      {/* Ambient glow keyed to severity */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 opacity-60'
        style={{
          background: `radial-gradient(ellipse 70% 120% at 0% 0%, ${style.glow} 0%, transparent 55%)`,
        }}
      />
      <div className='bg-card/40 relative flex flex-col gap-5 p-5 backdrop-blur-sm sm:p-7'>
        <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <span className='relative flex size-2.5'>
                <span
                  className={cn(
                    'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                    style.dot
                  )}
                />
                <span
                  className={cn(
                    'relative inline-flex size-2.5 rounded-full',
                    style.dot
                  )}
                />
              </span>
              <p className='text-muted-foreground text-xs font-medium tracking-widest uppercase'>
                {t('Model Health')}
              </p>
            </div>
            <h1
              className={cn(
                'text-[clamp(1.6rem,3.6vw,2.4rem)] leading-[1.1] font-bold tracking-tight',
                props.summary ? style.text : 'text-foreground'
              )}
            >
              {headline}
            </h1>
            <p className='text-muted-foreground/80 max-w-2xl text-sm'>
              {t(
                'Real-time availability of each model, derived from channel health checks, with success rate over the selected period.'
              )}
            </p>
            {updatedLabel && (
              <p className='text-muted-foreground/70 flex items-center gap-1.5 text-xs'>
                <RefreshCw className='size-3' />
                {t('Last updated')} {updatedLabel}
              </p>
            )}
          </div>

          {/* Period segmented control */}
          <div className='bg-muted/60 inline-flex rounded-lg border p-0.5 backdrop-blur-sm'>
            {PERIODS.map((p) => {
              const isActive = props.period === p.id
              return (
                <button
                  key={p.id}
                  type='button'
                  onClick={() => props.onPeriodChange(p.id)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t(p.labelKey)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
