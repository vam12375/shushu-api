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
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Search, SignalHigh, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLobeIcon } from '@/lib/lobe-icon'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CARD_ITEM_VARIANTS, CARD_STAGGER_VARIANTS } from '@/lib/motion'
import { Ring } from './donut'
import {
  getStatusMeta,
  successColor,
  successTextClass,
} from '../lib/status'
import type { ModelHealthItem, ModelHealthStatus } from '../types'

type HealthGridProps = {
  rows: ModelHealthItem[]
}

type FilterId = 'all' | ModelHealthStatus

function formatResponseTime(ms: number): string {
  if (!ms || ms <= 0) return '—'
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}

function formatLastChecked(
  ts: number,
  language: string,
  neverLabel: string
): string {
  if (!ts || ts <= 0) return neverLabel
  return new Date(ts * 1000).toLocaleString(language)
}

export function HealthGrid({ rows }: HealthGridProps) {
  const { t, i18n } = useTranslation()
  const shouldReduce = useReducedMotion()
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = {
      all: rows.length,
      online: 0,
      degraded: 0,
      offline: 0,
      unknown: 0,
    }
    rows.forEach((r) => {
      c[r.status] += 1
    })
    return c
  }, [rows])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false
      if (!kw) return true
      return (
        row.model_name.toLowerCase().includes(kw) ||
        row.vendor.toLowerCase().includes(kw)
      )
    })
  }, [rows, keyword, filter])

  const FILTERS: { id: FilterId; labelKey: string }[] = [
    { id: 'all', labelKey: 'All' },
    { id: 'online', labelKey: 'Online' },
    { id: 'degraded', labelKey: 'Degraded' },
    { id: 'offline', labelKey: 'Offline' },
    { id: 'unknown', labelKey: 'Not checked' },
  ]

  return (
    <section className='space-y-4'>
      {/* Toolbar: filter chips + search */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-wrap items-center gap-1.5'>
          {FILTERS.map((f) => {
            const isActive = filter === f.id
            return (
              <button
                key={f.id}
                type='button'
                onClick={() => setFilter(f.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-foreground/20 bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {t(f.labelKey)}
                <span
                  className={cn(
                    'tabular-nums',
                    isActive ? 'text-background/70' : 'text-muted-foreground/60'
                  )}
                >
                  {counts[f.id]}
                </span>
              </button>
            )
          })}
        </div>
        <div className='relative max-w-[260px] sm:w-[260px]'>
          <Search className='text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('Search models')}
            className='h-9 rounded-full pl-9'
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className='bg-card text-muted-foreground rounded-2xl border border-dashed py-20 text-center text-sm'>
          {t('No models found')}
        </div>
      ) : (
        <motion.div
          variants={shouldReduce ? undefined : CARD_STAGGER_VARIANTS}
          initial={shouldReduce ? undefined : 'initial'}
          animate={shouldReduce ? undefined : 'animate'}
          className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'
        >
          {filtered.map((row) => (
            <HealthCard
              key={row.model_name}
              row={row}
              language={i18n.language}
              variants={shouldReduce ? undefined : CARD_ITEM_VARIANTS}
            />
          ))}
        </motion.div>
      )}
    </section>
  )
}

function HealthCard({
  row,
  language,
  variants,
}: {
  row: ModelHealthItem
  language: string
  variants?: typeof CARD_ITEM_VARIANTS
}) {
  const { t } = useTranslation()
  const meta = getStatusMeta(row.status)
  const hasTraffic = row.request_count + row.error_count > 0
  const ratePct = row.success_rate * 100

  return (
    <motion.div
      variants={variants}
      className={cn(
        'group bg-card relative overflow-hidden rounded-2xl border p-4 transition-all duration-300',
        meta.glowClass
      )}
    >
      {/* Top: identity + status */}
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <div className='bg-muted/50 ring-border/50 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1'>
            {getLobeIcon(row.vendor_icon || row.vendor, 22)}
          </div>
          <div className='min-w-0'>
            <h3 className='text-foreground truncate font-mono text-sm font-semibold'>
              {row.model_name}
            </h3>
            <p className='text-muted-foreground truncate text-xs'>
              {row.vendor}
            </p>
          </div>
        </div>
        <Badge
          variant='outline'
          className={cn('shrink-0 gap-1.5 font-medium', meta.badgeClass)}
        >
          <span className={cn('size-1.5 rounded-full', meta.dotClass)} />
          {t(meta.labelKey)}
        </Badge>
      </div>

      {/* Middle: success ring + key stats */}
      <div className='mt-4 flex items-center gap-4'>
        <Ring
          value={hasTraffic ? row.success_rate : 0}
          size={62}
          thickness={6}
          color={hasTraffic ? successColor(row.success_rate) : 'oklch(0.6 0.02 250)'}
        >
          {hasTraffic ? (
            <span
              className={cn(
                'text-xs font-bold tabular-nums',
                successTextClass(row.success_rate)
              )}
            >
              {ratePct.toFixed(0)}%
            </span>
          ) : (
            <span className='text-muted-foreground/50 text-[10px]'>—</span>
          )}
        </Ring>

        <div className='grid flex-1 grid-cols-2 gap-x-3 gap-y-2 text-xs'>
          <Stat
            icon={<SignalHigh className='size-3.5' />}
            label={t('Channels')}
          >
            <span
              className={cn(
                'font-semibold',
                row.healthy_channels === 0 ? 'text-red-500' : 'text-foreground'
              )}
            >
              {row.healthy_channels}
            </span>
            <span className='text-muted-foreground'>
              {' / '}
              {row.total_channels}
            </span>
          </Stat>
          <Stat icon={<Timer className='size-3.5' />} label={t('Latency')}>
            <span className='text-foreground font-semibold tabular-nums'>
              {formatResponseTime(row.avg_response_time_ms)}
            </span>
          </Stat>
        </div>
      </div>

      {/* Footer: requests + last checked */}
      <div className='text-muted-foreground mt-4 flex items-center justify-between border-t pt-3 text-xs'>
        <span>
          {hasTraffic ? (
            <>
              <span className='text-foreground font-medium tabular-nums'>
                {row.request_count.toLocaleString()}
              </span>{' '}
              {t('Requests')}
              {row.error_count > 0 && (
                <span className='text-red-500'>
                  {' '}
                  · {row.error_count.toLocaleString()} {t('errors')}
                </span>
              )}
            </>
          ) : (
            <span className='text-muted-foreground/60'>{t('No traffic')}</span>
          )}
        </span>
        <span className='whitespace-nowrap'>
          {formatLastChecked(row.last_test_time, language, t('Never'))}
        </span>
      </div>
    </motion.div>
  )
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-muted-foreground/70 flex items-center gap-1'>
        {icon}
        {label}
      </span>
      <span className='tabular-nums'>{children}</span>
    </div>
  )
}
