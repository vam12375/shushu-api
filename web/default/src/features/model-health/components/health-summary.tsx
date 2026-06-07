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
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Boxes, Gauge, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARD_ITEM_VARIANTS, CARD_STAGGER_VARIANTS } from '@/lib/motion'
import { Donut } from './donut'
import type { ModelHealthSummary } from '../types'

type HealthSummaryProps = {
  summary: ModelHealthSummary
  avgResponseTime: number
}

function formatMs(ms: number): string {
  if (!ms || ms <= 0) return '—'
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

export function HealthSummaryCards({
  summary,
  avgResponseTime,
}: HealthSummaryProps) {
  const { t } = useTranslation()
  const shouldReduce = useReducedMotion()

  const onlineRate =
    summary.total_models > 0
      ? Math.round((summary.online / summary.total_models) * 100)
      : 0

  const segments = [
    { key: 'online', value: summary.online, color: 'oklch(0.72 0.17 162)' },
    { key: 'degraded', value: summary.degraded, color: 'oklch(0.77 0.16 78)' },
    { key: 'offline', value: summary.offline, color: 'oklch(0.64 0.21 25)' },
    { key: 'unknown', value: summary.unknown, color: 'oklch(0.6 0.02 250)' },
  ]

  const statusTiles = [
    {
      key: 'online',
      label: t('Online'),
      value: summary.online,
      dot: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      glow: 'oklch(0.72 0.17 162 / 35%)',
    },
    {
      key: 'degraded',
      label: t('Degraded'),
      value: summary.degraded,
      dot: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      glow: 'oklch(0.77 0.16 78 / 35%)',
    },
    {
      key: 'offline',
      label: t('Offline'),
      value: summary.offline,
      dot: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      glow: 'oklch(0.64 0.21 25 / 35%)',
    },
    {
      key: 'unknown',
      label: t('Not checked'),
      value: summary.unknown,
      dot: 'bg-muted-foreground/40',
      text: 'text-foreground',
      glow: 'transparent',
    },
  ]

  const metricTiles = [
    {
      key: 'models',
      label: t('Total models'),
      value: summary.total_models.toString(),
      icon: Boxes,
    },
    {
      key: 'channels',
      label: t('Total channels'),
      value: summary.total_channels.toString(),
      icon: Gauge,
    },
    {
      key: 'latency',
      label: t('Avg response time'),
      value: formatMs(avgResponseTime),
      icon: Timer,
    },
  ]

  return (
    <motion.section
      variants={shouldReduce ? undefined : CARD_STAGGER_VARIANTS}
      initial={shouldReduce ? undefined : 'initial'}
      animate={shouldReduce ? undefined : 'animate'}
      className='grid grid-cols-2 gap-3 lg:grid-cols-4'
    >
      {/* Hero tile: donut + ratio (spans 2x2 on desktop) */}
      <motion.div
        variants={shouldReduce ? undefined : CARD_ITEM_VARIANTS}
        className='bg-card relative col-span-2 row-span-2 flex items-center gap-5 overflow-hidden rounded-2xl border p-5 sm:gap-7 sm:p-6'
      >
        <div
          aria-hidden
          className='pointer-events-none absolute -top-10 -right-10 size-40 rounded-full opacity-40 blur-3xl'
          style={{ background: 'oklch(0.72 0.17 162 / 30%)' }}
        />
        <div className='relative shrink-0'>
          <Donut segments={segments} size={150} thickness={13}>
            <span className='text-3xl font-bold tracking-tight tabular-nums'>
              {onlineRate}%
            </span>
            <span className='text-muted-foreground text-[11px] font-medium'>
              {t('Online')}
            </span>
          </Donut>
        </div>
        <div className='relative min-w-0 space-y-2.5'>
          <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
            {t('Health overview')}
          </p>
          <div className='space-y-1.5'>
            {segments.map((seg, idx) => {
              const tile = statusTiles[idx]
              return (
                <div
                  key={seg.key}
                  className='flex items-center justify-between gap-4 text-sm'
                >
                  <span className='flex items-center gap-2'>
                    <span
                      className='size-2 rounded-full'
                      style={{ background: seg.color }}
                    />
                    <span className='text-muted-foreground'>{tile.label}</span>
                  </span>
                  <span className='text-foreground font-semibold tabular-nums'>
                    {seg.value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Status tiles */}
      {statusTiles.map((tile) => (
        <motion.div
          key={tile.key}
          variants={shouldReduce ? undefined : CARD_ITEM_VARIANTS}
          className='bg-card relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-shadow hover:shadow-md'
        >
          <div
            aria-hidden
            className='pointer-events-none absolute -top-8 -right-8 size-24 rounded-full opacity-50 blur-2xl'
            style={{ background: tile.glow }}
          />
          <div className='text-muted-foreground relative flex items-center gap-1.5 text-xs font-medium'>
            <span className={cn('size-2 rounded-full', tile.dot)} />
            {tile.label}
          </div>
          <div
            className={cn(
              'relative mt-3 text-2xl font-bold tracking-tight tabular-nums',
              tile.text
            )}
          >
            {tile.value}
          </div>
        </motion.div>
      ))}

      {/* Metric tiles */}
      {metricTiles.map((tile) => {
        const Icon = tile.icon
        return (
          <motion.div
            key={tile.key}
            variants={shouldReduce ? undefined : CARD_ITEM_VARIANTS}
            className='bg-card flex flex-col justify-between rounded-2xl border p-4'
          >
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
              <Icon className='size-3.5' />
              {tile.label}
            </div>
            <div className='text-foreground mt-3 text-2xl font-bold tracking-tight tabular-nums'>
              {tile.value}
            </div>
          </motion.div>
        )
      })}
    </motion.section>
  )
}
