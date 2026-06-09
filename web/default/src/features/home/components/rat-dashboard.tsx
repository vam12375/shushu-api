import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useModelHealth } from '@/features/model-health/hooks/use-model-health'
import { useTodayStats } from '../hooks/use-today-stats'

export function RatDashboard() {
  const { t } = useTranslation()
  // 获取今日模型健康度数据
  const { data: healthData, isLoading: healthLoading } = useModelHealth('today')
  // 获取今日token消耗统计
  const { totalTokens, totalRequests, isLoading: statsLoading } = useTodayStats()

  const isLoading = healthLoading || statsLoading

  // 计算整体成功率
  const overallSuccessRate =
    healthData?.data?.summary
      ? Math.round(
          (healthData.data.summary.online / healthData.data.summary.total_models) * 100
        )
      : 0

  // 计算平均响应时间
  const avgResponseTime =
    healthData?.data?.models && healthData.data.models.length > 0
      ? Math.round(
          healthData.data.models.reduce((sum, m) => sum + m.avg_response_time_ms, 0) /
            healthData.data.models.length
        )
      : 0

  // 获取Top2成功率最高的模型
  const topModels =
    healthData?.data?.models
      ?.filter((m) => m.status === 'online')
      ?.sort((a, b) => b.success_rate - a.success_rate)
      ?.slice(0, 2) || []

  return (
    <div className='mt-24 sm:mt-40 lg:mt-48 w-full max-w-5xl mx-auto relative px-4 sm:px-8 pb-16 sm:pb-24'>
      <div className='absolute -top-12 -left-12 size-48 bg-yellow-400/20 blur-[80px]'></div>
      <div className='absolute -bottom-12 -right-12 size-48 bg-orange-400/20 blur-[80px]'></div>

      <div
        className={cn(
          'relative z-10 text-left overflow-hidden border-b-[8px] border-yellow-400/50',
          'bg-white/70 backdrop-blur-[20px] border-2 border-white/50 rounded-[32px] sm:rounded-[48px] p-6 sm:p-12 transition-all duration-500 cubic-bezier(0.2,1,0.3,1)',
          'hover:translate-y-[-12px] hover:scale-[1.02] hover:shadow-[0_40px_80px_-20px_rgba(74,53,33,0.1)] hover:border-yellow-400 hover:bg-rat-cream'
        )}
      >
        <div className='flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 mb-8 sm:mb-12'>
          <div>
            <h3 className='text-2xl sm:text-3xl font-black mb-1'>
              {t('鼠工智能看板')} <span className='font-hand opacity-50 font-normal text-lg sm:text-xl'>v3.0.4</span>
            </h3>
            <p className='text-rat-brown/40 font-bold text-[10px] sm:text-xs uppercase tracking-widest'>
              Rat-Powered Node Status
            </p>
          </div>
          <div className='bg-[#FFECB3] text-[#795548] px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl font-black text-[0.7rem] sm:text-[0.75rem] uppercase tracking-widest shadow-[2px_2px_0_#D7CCC8]'>
            {t('系统状态：巨稳')}
          </div>
        </div>

        {isLoading ? (
          <div className='flex justify-center items-center h-32 sm:h-40 text-rat-brown/60 font-bold animate-pulse'>
            {t('Loading...')}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12'>
            <div className='space-y-4 sm:space-y-8'>
              {/* Top Model 1 */}
              {topModels[0] && (
                <div className='bg-white/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/60'>
                  <div className='flex justify-between items-center mb-3 sm:mb-4'>
                    <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
                      <div className='size-7 sm:size-8 bg-rat-brown rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0'>
                        1
                      </div>
                      <div className='font-black truncate text-sm sm:text-base'>
                        {topModels[0].model_name}
                      </div>
                    </div>
                    <div className='text-[11px] sm:text-xs font-mono-rat text-rat-emerald font-bold whitespace-nowrap ml-2'>
                      {topModels[0].avg_response_time_ms}ms
                    </div>
                  </div>
                  <div className='h-2.5 sm:h-3 bg-[#F5E8D6] rounded-full overflow-hidden relative mb-2'>
                    <div
                      className='h-full bg-rat-yellow rounded-full shadow-[0_0_15px_rgba(255,210,63,0.5)] animate-pulse-width'
                      style={{ width: `${topModels[0].success_rate * 100}%` }}
                    ></div>
                  </div>
                  <div className='flex justify-between text-[9px] sm:text-[10px] font-bold text-rat-brown/30 uppercase'>
                    <span>{t('成功率')}</span>
                    <span>{(topModels[0].success_rate * 100).toFixed(2)}%</span>
                  </div>
                </div>
              )}
              {/* Top Model 2 */}
              {topModels[1] && (
                <div className='bg-white/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/60'>
                  <div className='flex justify-between items-center mb-3 sm:mb-4'>
                    <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
                      <div className='size-7 sm:size-8 bg-rat-orange rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0'>
                        2
                      </div>
                      <div className='font-black truncate text-sm sm:text-base'>
                        {topModels[1].model_name}
                      </div>
                    </div>
                    <div className='text-[11px] sm:text-xs font-mono-rat text-rat-emerald font-bold whitespace-nowrap ml-2'>
                      {topModels[1].avg_response_time_ms}ms
                    </div>
                  </div>
                  <div className='h-2.5 sm:h-3 bg-[#F5E8D6] rounded-full overflow-hidden relative mb-2'>
                    <div
                      className='h-full bg-rat-orange rounded-full shadow-[0_0_15px_rgba(255,159,28,0.5)] animate-pulse-width'
                      style={{
                        width: `${topModels[1].success_rate * 100}%`,
                        animationDelay: '0.5s',
                      }}
                    ></div>
                  </div>
                  <div className='flex justify-between text-[9px] sm:text-[10px] font-bold text-rat-brown/30 uppercase'>
                    <span>{t('成功率')}</span>
                    <span>{(topModels[1].success_rate * 100).toFixed(2)}%</span>
                  </div>
                </div>
              )}
              {/* Fallback if no models */}
              {topModels.length === 0 && (
                <div className='bg-white/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/60 text-center text-rat-brown/40 text-sm sm:text-base'>
                  {t('暂无模型数据')}
                </div>
              )}
            </div>

            <div className='bg-rat-brown/5 rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 flex flex-col justify-center items-center text-center space-y-3 sm:space-y-4'>
              <div className='size-24 sm:size-32 bg-white rounded-full flex items-center justify-center shadow-xl animate-float-rat'>
                <img
                  src='https://api.iconify.design/noto:cheese-wedge.svg'
                  className='size-16 sm:size-20'
                  alt='Cheese'
                />
              </div>
              <h4 className='text-lg sm:text-xl font-black'>{t('今日奶酪已被偷取')}</h4>
              <div className='text-4xl sm:text-5xl font-black text-rat-orange tracking-tighter'>
                {totalTokens.toLocaleString()}
              </div>
              <p className='text-[11px] sm:text-xs font-bold text-rat-brown/40 uppercase tracking-widest'>
                {t('成功率')} {overallSuccessRate}% · {t('平均延迟')} {avgResponseTime}ms
              </p>
              <p className='text-[10px] font-bold text-rat-brown/30 uppercase tracking-wider'>
                {t('总请求数')} {totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
