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
import type { ElementType } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import {
  Activity,
  CalendarClock,
  CircleCheck,
  Clock3,
  RefreshCw,
  ShieldAlert,
  TimerReset,
  UsersRound,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  formatCurrencyUSD,
  formatQuota,
  formatTimestampToDate,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionPageLayout } from '@/components/layout'
import { StatusBadge } from '@/components/status-badge'
import { TableId } from '@/components/table-id'
import {
  getQuotaResetMonitor,
  resetAllLowBalanceUsersToTargetQuota,
} from './api'
import type {
  QuotaResetMonitorData,
  QuotaResetState,
  QuotaResetStatus,
  QuotaResetSummary,
} from './types'

type QuotaResetSearchPatch = {
  status?: QuotaResetStatus | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

interface QuotaResetProps {
  status: QuotaResetStatus
  page: number
  pageSize: number
  onSearchChange: (patch: QuotaResetSearchPatch) => void
}

const STATUS_TABS: Array<{ value: QuotaResetStatus; labelKey: string }> = [
  { value: 'pending', labelKey: 'Pending resets' },
  { value: 'completed', labelKey: 'Completed resets' },
  { value: 'all', labelKey: 'All resets' },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatDuration(seconds: number, t: TFunction) {
  const value = Math.max(0, Math.floor(seconds))
  if (value <= 0) return t('Due now')

  const days = Math.floor(value / 86400)
  const hours = Math.floor((value % 86400) / 3600)
  const minutes = Math.floor((value % 3600) / 60)

  if (days > 0) return t('{{days}}d {{hours}}h', { days, hours })
  if (hours > 0) return t('{{hours}}h {{minutes}}m', { hours, minutes })
  return t('{{minutes}}m', { minutes: Math.max(1, minutes) })
}

function getResetProgress(item: QuotaResetState, now: number): number {
  if (item.status === 'completed') return 100
  const total = item.reset_at - item.triggered_at
  if (total <= 0) return 100
  return clamp(((now - item.triggered_at) / total) * 100, 0, 100)
}

function getStatusBadge(item: QuotaResetState, now: number, t: TFunction) {
  if (item.status === 'completed') {
    return (
      <StatusBadge label={t('Completed')} variant='success' copyable={false} />
    )
  }

  if (item.reset_at > 0 && item.reset_at <= now) {
    return (
      <StatusBadge
        label={t('Due now')}
        variant='danger'
        pulse
        copyable={false}
      />
    )
  }

  return (
    <StatusBadge
      label={t('Pending')}
      variant='warning'
      pulse
      copyable={false}
    />
  )
}

function SummaryCard(props: {
  title: string
  value: string | number
  description: string
  icon: ElementType
  loading?: boolean
  tone?: 'default' | 'warning' | 'success' | 'danger'
}) {
  const Icon = props.icon

  return (
    <Card size='sm'>
      <CardHeader className='grid-cols-[1fr_auto]'>
        <div className='min-w-0'>
          <CardDescription className='truncate'>{props.title}</CardDescription>
          <CardTitle className='mt-2 font-mono text-2xl font-black tracking-normal tabular-nums'>
            {props.loading ? <Skeleton className='h-7 w-20' /> : props.value}
          </CardTitle>
        </div>
        <CardAction>
          <span
            className={cn(
              'bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md',
              props.tone === 'warning' && 'text-warning',
              props.tone === 'success' && 'text-success',
              props.tone === 'danger' && 'text-destructive'
            )}
          >
            <Icon className='size-4' aria-hidden='true' />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {props.loading ? (
            <Skeleton className='h-4 w-32' />
          ) : (
            props.description
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function PolicyOverview(props: {
  summary?: QuotaResetSummary
  loading: boolean
  isFetching: boolean
  isResetting: boolean
  onRefresh: () => void
  onResetAll: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const summary = props.summary
  const targetLabel = summary
    ? `${formatCurrencyUSD(summary.target_usd)} / ${formatQuota(summary.target_quota)}`
    : t('Reset target')
  const pendingProgress =
    summary && summary.low_balance_user_count > 0
      ? (summary.pending_count / summary.low_balance_user_count) * 100
      : 0
  const eligibleCount = summary?.one_click_reset_eligible_count ?? 0
  const canReset = !props.loading && !props.isResetting && eligibleCount > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <TimerReset
            className='text-muted-foreground size-4'
            aria-hidden='true'
          />
          {t('Low balance reset policy')}
        </CardTitle>
        <CardDescription>
          {t(
            'Users below the threshold are queued for an automatic balance reset after the waiting window.'
          )}
        </CardDescription>
        <CardAction>
          <div className='flex flex-wrap justify-end gap-2'>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant='destructive'
                    size='sm'
                    disabled={!canReset}
                  />
                }
              >
                <TimerReset data-icon='inline-start' />
                {props.isResetting ? t('Resetting...') : t('One-click reset')}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <ShieldAlert aria-hidden='true' />
                  </AlertDialogMedia>
                  <AlertDialogTitle>
                    {t('Confirm one-click balance reset?')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      'This will immediately set every user below {{amount}} to {{amount}}. Users at or above {{amount}} will be left untouched.',
                      { amount: targetLabel }
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={props.isResetting}>
                    {t('Cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    disabled={props.isResetting}
                    onClick={(event) => {
                      event.preventDefault()
                      void props
                        .onResetAll()
                        .then(() => setConfirmOpen(false))
                        .catch(() => undefined)
                    }}
                  >
                    {props.isResetting
                      ? t('Resetting...')
                      : t('Reset balances')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant='outline'
              size='sm'
              onClick={props.onRefresh}
              disabled={props.isFetching || props.isResetting}
            >
              <RefreshCw data-icon='inline-start' />
              {t('Refresh')}
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]'>
          <div className='grid gap-3 sm:grid-cols-3'>
            <PolicyMetric
              label={t('Trigger threshold')}
              value={
                props.loading || !summary
                  ? undefined
                  : `${formatCurrencyUSD(summary.threshold_usd)} / ${formatQuota(summary.threshold_quota)}`
              }
            />
            <PolicyMetric
              label={t('Reset target')}
              value={props.loading || !summary ? undefined : targetLabel}
            />
            <PolicyMetric
              label={t('Waiting window')}
              value={
                props.loading || !summary
                  ? undefined
                  : formatDuration(summary.delay_seconds, t)
              }
            />
          </div>
          <div className='bg-muted/50 rounded-lg border p-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='min-w-0'>
                <div className='text-sm font-medium'>{t('Queue coverage')}</div>
                <div className='text-muted-foreground mt-1 text-xs'>
                  {props.loading || !summary ? (
                    <Skeleton className='h-3 w-36' />
                  ) : (
                    t('{{pending}} queued / {{lowBalance}} low balance users', {
                      pending: summary.pending_count,
                      lowBalance: summary.low_balance_user_count,
                    })
                  )}
                </div>
              </div>
              {summary && summary.due_count > 0 ? (
                <StatusBadge
                  label={t('{{count}} due', { count: summary.due_count })}
                  variant='danger'
                  pulse
                  copyable={false}
                />
              ) : (
                <StatusBadge
                  label={t('Healthy')}
                  variant='success'
                  copyable={false}
                />
              )}
            </div>
            <Progress
              value={clamp(pendingProgress, 0, 100)}
              className='mt-3 h-2'
            />
            <div className='text-muted-foreground mt-3 text-xs'>
              {props.loading || !summary ? (
                <Skeleton className='h-3 w-32' />
              ) : (
                t('{{count}} users are below the one-click reset target.', {
                  count: eligibleCount,
                })
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PolicyMetric(props: { label: string; value?: string }) {
  return (
    <div className='bg-muted/50 rounded-lg border p-3'>
      <div className='text-muted-foreground text-xs font-medium'>
        {props.label}
      </div>
      <div className='mt-2 min-h-6 font-mono text-sm font-semibold tabular-nums'>
        {props.value ? props.value : <Skeleton className='h-5 w-28' />}
      </div>
    </div>
  )
}

function QuotaResetRows(props: {
  data?: QuotaResetMonitorData
  isLoading: boolean
}) {
  const { t } = useTranslation()
  const items = props.data?.states.items ?? []
  const now = props.data?.summary.now ?? Math.floor(Date.now() / 1000)

  if (props.isLoading) {
    return (
      <div className='flex flex-col gap-2 p-4'>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className='h-12 w-full' />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Empty className='min-h-64 border-0'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <CircleCheck />
          </EmptyMedia>
          <EmptyTitle>{t('No reset records found')}</EmptyTitle>
          <EmptyDescription>
            {t('The selected queue has no balance reset states yet.')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('User')}</TableHead>
          <TableHead>{t('Status')}</TableHead>
          <TableHead>{t('Balance')}</TableHead>
          <TableHead>{t('Timeline')}</TableHead>
          <TableHead>{t('Wait progress')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const progress = getResetProgress(item, now)
          const remaining = item.reset_at > 0 ? item.reset_at - now : 0
          const delta = item.current_quota - item.trigger_quota
          const displayName =
            item.display_name || item.username || t('Missing user')

          return (
            <TableRow
              key={`${item.user_id}-${item.status}-${item.triggered_at}`}
            >
              <TableCell>
                <div className='flex min-w-[180px] flex-col gap-1'>
                  <div className='flex items-center gap-2'>
                    <TableId value={item.user_id} />
                    <span className='truncate font-medium'>{displayName}</span>
                  </div>
                  <div className='text-muted-foreground flex max-w-[240px] flex-wrap items-center gap-1 text-xs'>
                    {item.username && item.display_name && (
                      <span className='truncate'>@{item.username}</span>
                    )}
                    {item.group && (
                      <StatusBadge
                        label={item.group}
                        variant='neutral'
                        copyable={false}
                      />
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(item, now, t)}</TableCell>
              <TableCell>
                <div className='flex min-w-[160px] flex-col gap-1'>
                  <div className='font-mono text-sm font-semibold tabular-nums'>
                    {formatQuota(item.current_quota)}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('Triggered at {{quota}}', {
                      quota: formatQuota(item.trigger_quota),
                    })}
                  </div>
                  <div
                    className={cn(
                      'text-xs tabular-nums',
                      delta >= 0 ? 'text-success' : 'text-destructive'
                    )}
                  >
                    {delta >= 0 ? '+' : ''}
                    {formatQuota(delta)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className='flex min-w-[220px] flex-col gap-1 text-xs'>
                  <TimelineLine
                    label={t('Queued')}
                    value={formatTimestampToDate(item.triggered_at)}
                  />
                  <TimelineLine
                    label={
                      item.status === 'completed'
                        ? t('Completed')
                        : t('Reset at')
                    }
                    value={formatTimestampToDate(
                      item.status === 'completed'
                        ? item.completed_at
                        : item.reset_at
                    )}
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className='flex min-w-[180px] flex-col gap-2'>
                  <div className='flex items-center justify-between gap-2 text-xs'>
                    <span className='text-muted-foreground'>
                      {item.status === 'completed'
                        ? t('Finished')
                        : formatDuration(remaining, t)}
                    </span>
                    <span className='font-mono tabular-nums'>
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    className={cn(
                      'h-2',
                      item.status === 'completed' &&
                        '[&_[data-slot=progress-indicator]]:bg-success',
                      item.status === 'pending' &&
                        item.reset_at <= now &&
                        '[&_[data-slot=progress-indicator]]:bg-destructive'
                    )}
                  />
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function TimelineLine(props: { label: string; value: string }) {
  return (
    <div className='grid grid-cols-[72px_minmax(0,1fr)] gap-2'>
      <span className='text-muted-foreground'>{props.label}</span>
      <span className='font-mono tabular-nums'>{props.value}</span>
    </div>
  )
}

function RecordsCard(props: {
  status: QuotaResetStatus
  page: number
  pageSize: number
  data?: QuotaResetMonitorData
  isLoading: boolean
  onSearchChange: (patch: QuotaResetSearchPatch) => void
}) {
  const { t } = useTranslation()
  const total = props.data?.states.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / props.pageSize))
  const clampedPage = clamp(props.page, 1, pageCount)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Reset queue records')}</CardTitle>
        <CardDescription>
          {t('Inspect pending and completed low-balance reset states.')}
        </CardDescription>
        <CardAction>
          <Tabs
            value={props.status}
            onValueChange={(value) =>
              props.onSearchChange({
                status: value as QuotaResetStatus,
                page: undefined,
              })
            }
          >
            <TabsList className='max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto'>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {t(tab.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className='px-0'>
        <QuotaResetRows data={props.data} isLoading={props.isLoading} />
      </CardContent>
      <div className='bg-muted/40 flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='text-muted-foreground text-sm'>
          {t('{{total}} records', { total })}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={clampedPage <= 1}
            onClick={() => props.onSearchChange({ page: clampedPage - 1 })}
          >
            {t('Previous')}
          </Button>
          <div className='text-muted-foreground min-w-20 text-center text-sm tabular-nums'>
            {clampedPage} / {pageCount}
          </div>
          <Button
            variant='outline'
            size='sm'
            disabled={clampedPage >= pageCount}
            onClick={() => props.onSearchChange({ page: clampedPage + 1 })}
          >
            {t('Next')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function QuotaReset(props: QuotaResetProps) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['quota-reset-monitor', props.status, props.page, props.pageSize],
    queryFn: async () => {
      const response = await getQuotaResetMonitor({
        status: props.status,
        page: props.page,
        pageSize: props.pageSize,
      })
      if (!response.success || !response.data) {
        throw new Error(
          response.message || 'Failed to load balance reset monitor'
        )
      }
      return response.data
    },
    refetchInterval: 30000,
    placeholderData: (previous) => previous,
  })
  const resetAllMutation = useMutation({
    mutationFn: resetAllLowBalanceUsersToTargetQuota,
    onSuccess: async (response) => {
      if (!response.success || !response.data) {
        toast.error(response.message || t('Failed to reset balances'))
        return
      }
      if (response.data.affected_count === 0) {
        toast.info(t('No eligible users to reset'))
      } else {
        toast.success(
          t('Reset {{count}} users to {{amount}}', {
            count: response.data.affected_count,
            amount: formatQuota(response.data.target_quota),
          })
        )
      }
      await query.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t('Failed to reset balances')
      )
    },
  })

  const data = query.data
  const summary = data?.summary
  const nextResetLabel = useMemo(() => {
    if (!summary?.next_reset_at) return t('No pending reset')
    return formatTimestampToDate(summary.next_reset_at)
  }, [summary?.next_reset_at, t])

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Balance Resets')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='flex flex-col gap-4'>
          {query.error && (
            <Card size='sm'>
              <CardContent>
                <div className='text-destructive text-sm'>
                  {query.error instanceof Error
                    ? query.error.message
                    : t('Failed to load balance reset monitor')}
                </div>
              </CardContent>
            </Card>
          )}

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <SummaryCard
              title={t('Pending resets')}
              value={summary?.pending_count ?? 0}
              description={t('Users waiting for the 24-hour reset window')}
              icon={Clock3}
              loading={query.isLoading}
              tone='warning'
            />
            <SummaryCard
              title={t('Due now')}
              value={summary?.due_count ?? 0}
              description={t('Records ready for the maintenance task')}
              icon={CalendarClock}
              loading={query.isLoading}
              tone={summary?.due_count ? 'danger' : 'success'}
            />
            <SummaryCard
              title={t('Low balance users')}
              value={summary?.low_balance_user_count ?? 0}
              description={t('Enabled users currently below threshold')}
              icon={UsersRound}
              loading={query.isLoading}
            />
            <SummaryCard
              title={t('Next reset')}
              value={nextResetLabel}
              description={t('Earliest pending reset time')}
              icon={Activity}
              loading={query.isLoading}
            />
          </div>

          <PolicyOverview
            summary={summary}
            loading={query.isLoading}
            isFetching={query.isFetching}
            isResetting={resetAllMutation.isPending}
            onRefresh={() => void query.refetch()}
            onResetAll={async () => {
              await resetAllMutation.mutateAsync()
            }}
          />

          <RecordsCard
            status={props.status}
            page={props.page}
            pageSize={props.pageSize}
            data={data}
            isLoading={query.isLoading}
            onSearchChange={props.onSearchChange}
          />
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
