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
import { useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { HealthGrid, HealthHero, HealthSummaryCards } from './components'
import { useModelHealth } from './hooks/use-model-health'
import type { ModelHealthPeriod } from './types'

const VALID_PERIODS: ModelHealthPeriod[] = ['today', 'week', 'month', 'all']

export function ModelHealth() {
  const { t } = useTranslation()
  const search = useSearch({ from: '/model-health/' })
  const navigate = useNavigate()

  const period: ModelHealthPeriod = VALID_PERIODS.includes(
    search.period as ModelHealthPeriod
  )
    ? (search.period as ModelHealthPeriod)
    : 'today'

  const healthQuery = useModelHealth(period)
  const snapshot = healthQuery.data?.data

  // Average response time across models that have been probed (for the bento tile).
  const avgResponseTime = useMemo(() => {
    if (!snapshot) return 0
    const probed = snapshot.models.filter((m) => m.avg_response_time_ms > 0)
    if (probed.length === 0) return 0
    const sum = probed.reduce((acc, m) => acc + m.avg_response_time_ms, 0)
    return Math.round(sum / probed.length)
  }, [snapshot])

  const handlePeriodChange = (next: ModelHealthPeriod) => {
    navigate({
      to: '/model-health',
      search: (prev) => ({ ...prev, period: next }),
    })
  }

  return (
    <PublicLayout showMainContainer={false}>
      <div className='relative'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-20 dark:opacity-[0.10]'
          style={{
            background: [
              'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 160 / 80%) 0%, transparent 70%)',
              'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)',
              'radial-gradient(ellipse 40% 35% at 50% 70%, oklch(0.70 0.12 145 / 40%) 0%, transparent 70%)',
            ].join(', '),
            maskImage:
              'linear-gradient(to bottom, black 40%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 40%, transparent 100%)',
          }}
        />
        <PageTransition className='relative mx-auto w-full max-w-[1280px] space-y-6 px-3 pt-16 pb-10 sm:px-6 sm:pt-20 sm:pb-12 xl:px-8'>
          <HealthHero
            period={period}
            onPeriodChange={handlePeriodChange}
            summary={snapshot?.summary}
            updatedAt={snapshot?.updated_at}
          />

          {healthQuery.isLoading ? (
            <HealthLoading />
          ) : !snapshot ? (
            <HealthError
              message={
                healthQuery.error instanceof Error
                  ? healthQuery.error.message
                  : t('Unable to load model health data')
              }
            />
          ) : (
            <>
              <HealthSummaryCards
                summary={snapshot.summary}
                avgResponseTime={avgResponseTime}
              />
              <HealthGrid rows={snapshot.models} />
            </>
          )}
        </PageTransition>
      </div>
    </PublicLayout>
  )
}

function HealthLoading() {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <Skeleton className='col-span-2 row-span-2 h-[200px] rounded-2xl' />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`s-${i}`} className='h-[92px] rounded-2xl' />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={`m-${i}`} className='h-[92px] rounded-2xl' />
        ))}
      </div>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`c-${i}`} className='h-[180px] rounded-2xl' />
        ))}
      </div>
    </div>
  )
}

function HealthError(props: { message: string }) {
  const { t } = useTranslation()
  return (
    <div className='bg-card rounded-xl border border-dashed px-6 py-12 text-center'>
      <h2 className='text-foreground text-base font-semibold'>
        {t('Unable to load model health')}
      </h2>
      <p className='text-muted-foreground mx-auto mt-2 max-w-md text-sm'>
        {props.message}
      </p>
    </div>
  )
}
