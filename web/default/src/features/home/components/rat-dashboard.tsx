import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Gauge, HeartPulse, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useModelHealth } from '@/features/model-health/hooks/use-model-health'
import type { ModelHealthItem } from '@/features/model-health/types'
import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import type { PerfModelSummary } from '@/features/performance-metrics/types'
import { useTodayStats } from '../hooks/use-today-stats'

const PERFORMANCE_WINDOW_HOURS = 24
const TOP_MODEL_LIMIT = 6

type DashboardMetric = 'avg_latency_ms' | 'avg_tps' | 'success_rate'

type DashboardSummary = {
  successRate: number
  avgLatencyMs: number
  avgTps: number
}

type DashboardModel = {
  modelName: string
  successRate: number
  avgLatencyMs: number
}

export function RatDashboard() {
  const { t } = useTranslation()
  // 获取今日模型健康度数据，作为性能指标不可用时的兜底
  const { data: healthData, isLoading: healthLoading } = useModelHealth('today')
  const metricsQuery = useQuery({
    queryKey: ['home', 'perf-metrics-summary', PERFORMANCE_WINDOW_HOURS],
    queryFn: () => getPerfMetricsSummary(PERFORMANCE_WINDOW_HOURS),
    staleTime: 60 * 1000,
    retry: false,
  })
  // 获取今日token消耗统计
  const {
    totalTokens,
    totalRequests,
    isLoading: statsLoading,
  } = useTodayStats()

  const perfModels = useMemo(
    () => metricsQuery.data?.data.models ?? [],
    [metricsQuery.data]
  )

  // 追踪两次刷新之间的token增量,用于展示"本轮新增"
  const [tokenDelta, setTokenDelta] = useState(0)
  const lastTokensRef = useRef<number | null>(null)
  useEffect(() => {
    if (statsLoading) return
    const last = lastTokensRef.current
    // 仅在数值增长时记录增量(跨天归零等回退场景不展示)
    if (last !== null && totalTokens > last) {
      setTokenDelta(totalTokens - last)
    }
    lastTokensRef.current = totalTokens
  }, [totalTokens, statsLoading])

  const healthModels = useMemo(
    () => healthData?.data.models ?? [],
    [healthData]
  )

  const dashboardModels = useMemo(() => {
    if (perfModels.length > 0) {
      return perfModels.slice(0, TOP_MODEL_LIMIT).map(mapPerfModel)
    }

    return healthModels
      .filter(hasHealthTraffic)
      .sort((a, b) => {
        const aTraffic = a.request_count + a.error_count
        const bTraffic = b.request_count + b.error_count
        if (aTraffic !== bTraffic) return bTraffic - aTraffic
        return b.success_rate - a.success_rate
      })
      .slice(0, TOP_MODEL_LIMIT)
      .map(mapHealthModel)
  }, [healthModels, perfModels])

  const summary = useMemo(() => {
    if (perfModels.length > 0) {
      return buildPerfSummary(perfModels)
    }
    return buildHealthSummary(healthModels)
  }, [healthModels, perfModels])

  const isLoading =
    statsLoading || (metricsQuery.isLoading && !healthData && healthLoading)

  return (
    <div className='relative mx-auto mt-24 w-full max-w-5xl px-4 pb-16 sm:mt-40 sm:px-8 sm:pb-24 lg:mt-48'>
      <div className='absolute -top-12 -left-12 size-48 bg-yellow-400/20 blur-[80px] dark:bg-yellow-400/10'></div>
      <div className='absolute -right-12 -bottom-12 size-48 bg-orange-400/20 blur-[80px] dark:bg-orange-400/10'></div>

      <div
        className={cn(
          'relative z-10 overflow-hidden border-b-[8px] border-yellow-400/50 text-left',
          'cubic-bezier(0.2,1,0.3,1) rounded-[32px] border-2 border-white/50 bg-white/70 p-6 backdrop-blur-[20px] transition-all duration-500 sm:rounded-[48px] sm:p-12 dark:border-white/10 dark:border-b-yellow-400/40 dark:bg-white/5',
          'hover:bg-rat-cream hover:translate-y-[-12px] hover:scale-[1.02] hover:border-yellow-400 hover:shadow-[0_40px_80px_-20px_rgba(74,53,33,0.1)] dark:hover:border-yellow-400/60 dark:hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55)]'
        )}
      >
        <div className='mb-8 flex flex-col items-start justify-between gap-4 sm:mb-12 sm:flex-row sm:gap-0'>
          <div>
            <h3 className='mb-1 text-2xl font-black sm:text-3xl'>
              {t('鼠工智能看板')}{' '}
              <span className='font-hand text-lg font-normal opacity-50 sm:text-xl'>
                v3.0.4
              </span>
            </h3>
            <p className='text-rat-brown/40 text-[10px] font-bold tracking-widest uppercase sm:text-xs'>
              Rat-Powered Node Status
            </p>
          </div>
          <div className='rounded-xl bg-[#FFECB3] px-3 py-1 text-[0.7rem] font-black tracking-widest text-[#795548] uppercase shadow-[2px_2px_0_#D7CCC8] sm:px-4 sm:py-1.5 sm:text-[0.75rem] dark:bg-yellow-400/15 dark:text-yellow-200 dark:shadow-[2px_2px_0_rgba(0,0,0,0.45)]'>
            {t('系统状态：巨稳')}
          </div>
        </div>

        {isLoading ? (
          <div className='text-rat-brown/60 flex h-32 animate-pulse items-center justify-center font-bold sm:h-40'>
            {t('Loading...')}
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-6 sm:gap-12 md:grid-cols-2'>
            <div className='rounded-2xl border border-white/60 bg-white/40 p-4 sm:rounded-3xl sm:p-6 dark:border-white/10 dark:bg-white/5'>
              <div className='mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-3'>
                <MetricCell
                  icon={HeartPulse}
                  label={t('成功率')}
                  value={formatPercent(summary.successRate)}
                  valueClassName={rateTextClass(summary.successRate)}
                />
                <MetricCell
                  icon={Timer}
                  label={t('平均延迟')}
                  value={formatLatency(summary.avgLatencyMs)}
                />
                <MetricCell
                  icon={Gauge}
                  label={t('Throughput')}
                  value={formatThroughput(summary.avgTps)}
                />
              </div>

              <div className='text-rat-brown/50 mb-3 text-[11px] font-bold sm:text-xs'>
                {t('Top models by traffic')}
              </div>

              {dashboardModels.length > 0 ? (
                <div className='grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2'>
                  {dashboardModels.map((model) => (
                    <ModelRow key={model.modelName} model={model} />
                  ))}
                </div>
              ) : (
                <div className='text-rat-brown/40 py-6 text-center text-sm sm:text-base'>
                  {t('暂无模型数据')}
                </div>
              )}
            </div>

            <div className='bg-rat-brown/5 flex flex-col items-center justify-center space-y-3 rounded-[32px] p-6 text-center sm:space-y-4 sm:rounded-[40px] sm:p-8'>
              {/* 奶酪图标用 emoji 替代外链 SVG(api.iconify.design 国内访问不稳定且增加请求) */}
              <div className='animate-float-rat flex size-24 items-center justify-center rounded-full bg-white shadow-xl sm:size-32 dark:bg-white/10'>
                <span
                  className='text-6xl leading-none sm:text-7xl'
                  role='img'
                  aria-label='Cheese'
                >
                  🧀
                </span>
              </div>
              <h4 className='text-lg font-black sm:text-xl'>
                {t('今日奶酪已被偷取')}
              </h4>
              <div className='text-rat-orange text-4xl font-black tracking-tighter sm:text-5xl'>
                <RollingNumber value={totalTokens} />
              </div>
              {tokenDelta > 0 && (
                <div
                  // key 变化时重新触发入场动画,提示"本轮新增"
                  key={`${totalTokens}-${tokenDelta}`}
                  className='animate-in fade-in slide-in-from-bottom-2 rounded-full bg-yellow-200/80 px-3 py-1 text-[11px] font-black tracking-wider text-[#795548] uppercase duration-700 sm:text-xs dark:bg-yellow-400/15 dark:text-yellow-200'
                >
                  +{tokenDelta.toLocaleString()} {t('本轮新增')}
                </div>
              )}
              <p className='text-rat-brown/40 text-[11px] font-bold tracking-widest uppercase sm:text-xs'>
                {t('成功率')} {formatPercent(summary.successRate)} ·{' '}
                {t('平均延迟')} {formatLatency(summary.avgLatencyMs)}
              </p>
              <p className='text-rat-brown/30 text-[10px] font-bold tracking-wider uppercase'>
                {t('总请求数')} {totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 滚动数字:数值变化时从旧值平滑滚动到新值,避免大数字生硬跳变
function RollingNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return
    prevRef.current = to

    const duration = 1200
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutCubic:前快后慢,滚动观感更自然
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span className='tabular-nums'>{display.toLocaleString()}</span>
}

function MetricCell(props: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  valueClassName?: string
}) {
  const Icon = props.icon

  return (
    <div className='bg-rat-cream/60 rounded-2xl border border-white/70 px-3 py-3 dark:border-white/10'>
      <div className='text-rat-brown/45 flex items-center gap-1.5 text-[10px] font-bold sm:text-[11px]'>
        <Icon className='size-3 shrink-0' aria-hidden='true' />
        <span className='truncate'>{props.label}</span>
      </div>
      <div
        className={cn(
          'font-mono-rat mt-2 text-sm font-black tabular-nums sm:text-base',
          props.valueClassName
        )}
      >
        {props.value}
      </div>
    </div>
  )
}

function ModelRow(props: { model: DashboardModel }) {
  const model = props.model

  return (
    <div className='flex min-w-0 items-center justify-between gap-3 text-[11px] sm:text-xs'>
      <span className='font-mono-rat text-rat-brown/80 min-w-0 truncate font-black'>
        {model.modelName}
      </span>
      <span className='font-mono-rat inline-flex shrink-0 items-center gap-1.5 font-black tabular-nums'>
        <span
          className={cn(
            'size-1.5 rounded-full',
            rateDotClass(model.successRate)
          )}
          aria-hidden='true'
        />
        <span className={rateTextClass(model.successRate)}>
          {formatPercent(model.successRate)}
        </span>
      </span>
    </div>
  )
}

function mapPerfModel(model: PerfModelSummary): DashboardModel {
  return {
    modelName: model.model_name,
    successRate: Number(model.success_rate),
    avgLatencyMs: Number(model.avg_latency_ms),
  }
}

function mapHealthModel(model: ModelHealthItem): DashboardModel {
  return {
    modelName: model.model_name,
    successRate: model.success_rate * 100,
    avgLatencyMs: healthLatencyMs(model),
  }
}

function hasHealthTraffic(model: ModelHealthItem): boolean {
  return model.request_count + model.error_count > 0
}

function buildPerfSummary(models: PerfModelSummary[]): DashboardSummary {
  return {
    successRate: simpleAverage(models, 'success_rate', Number.isFinite),
    avgLatencyMs: Math.round(
      simpleAverage(
        models,
        'avg_latency_ms',
        (value) => Number.isFinite(value) && value > 0
      )
    ),
    avgTps: simpleAverage(
      models,
      'avg_tps',
      (value) => Number.isFinite(value) && value > 0
    ),
  }
}

function buildHealthSummary(models: ModelHealthItem[]): DashboardSummary {
  const trafficModels = models.filter(hasHealthTraffic)
  const dashboardModels = trafficModels.map(mapHealthModel)

  return {
    successRate: average(
      dashboardModels
        .map((model) => model.successRate)
        .filter((value) => Number.isFinite(value))
    ),
    avgLatencyMs: Math.round(
      average(
        dashboardModels
          .map((model) => model.avgLatencyMs)
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    ),
    avgTps: Number.NaN,
  }
}

function simpleAverage(
  rows: PerfModelSummary[],
  metric: DashboardMetric,
  isValid: (value: number) => boolean
): number {
  return average(
    rows.map((row) => Number(row[metric])).filter((value) => isValid(value))
  )
}

function average(values: number[]): number {
  if (values.length === 0) return Number.NaN
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function healthLatencyMs(model: ModelHealthItem): number {
  if (model.avg_use_time > 0) return Math.round(model.avg_use_time * 1000)
  return Number(model.avg_response_time_ms)
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '-'
  return `${value.toFixed(2)}%`
}

function formatLatency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '-'
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`
  return `${Math.round(value)}ms`
}

function formatThroughput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '-'
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K t/s`
  return `${value.toFixed(value < 10 ? 2 : 1)} t/s`
}

function rateTextClass(rate: number): string {
  if (!Number.isFinite(rate)) return 'text-rat-brown/40'
  if (rate >= 99.9) return 'text-success'
  if (rate >= 99) return 'text-warning'
  return 'text-destructive'
}

function rateDotClass(rate: number): string {
  if (!Number.isFinite(rate)) return 'bg-rat-brown/30'
  if (rate >= 99.9) return 'bg-success'
  if (rate >= 99) return 'bg-warning'
  return 'bg-destructive'
}
