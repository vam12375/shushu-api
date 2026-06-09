import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useStatus } from '@/hooks/use-status'

export function RatHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status } = useStatus()

  // 处理"领一份奶酪"按钮点击
  const handleGetCheese = () => {
    if (isAuthenticated) {
      // 已登录，跳转到控制台/仪表盘
      navigate({ to: '/panel' })
    } else {
      // 未登录，跳转到登录页面
      navigate({ to: '/login' })
    }
  }

  // 获取在线用户数（从status API获取http_stats.active_connections，fallback到1204）
  const onlineUsers = (status as any)?.http_stats?.active_connections || 1204

  return (
    <main className='max-w-7xl mx-auto px-4 sm:px-8 py-24 sm:py-32 lg:py-40 flex flex-col items-center text-center min-h-[85vh] justify-center'>
      <div className='space-y-10 sm:space-y-14 lg:space-y-16 w-full'>
        {/* 标题 */}
        <h1 className='font-outfit text-[clamp(2.5rem,8vw,8rem)] font-black leading-[0.85] tracking-[-0.04em]'>
          STAMPEDE <br />
          OF <span className='text-rat-yellow drop-shadow-[0_0_15px_rgba(255,210,63,0.5)]'>INTELLIGENCE</span>
        </h1>

        {/* 描述文本 - 居中 */}
        <p className='text-xl sm:text-2xl text-rat-brown/60 max-w-3xl mx-auto leading-relaxed font-medium'>
          {t('这里是')}{' '}
          <span className='bg-yellow-200 px-2 rounded'>{t('鼠鼠公益站')}</span>
          。{t('为您搬运全世界最好的 AI 模型。')}
          <br />
          {t('不讲武德，只要奶酪。')}
        </p>

        {/* 按钮区域 - 移动端垂直排列，桌面端水平排列 */}
        <div className='pt-6 sm:pt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6'>
          {/* 主按钮 */}
          <button
            onClick={handleGetCheese}
            className='group relative z-10 overflow-hidden bg-rat-brown text-white px-8 sm:px-12 py-4 sm:py-6 rounded-[28px] font-black text-lg sm:text-xl transition-all hover:scale-105 hover:-rotate-1 active:scale-95 w-full sm:w-auto'
          >
            <span className='relative z-10'>{t('领一份奶酪 🧀')}</span>
            <span className='inline-block transition-transform group-hover:translate-x-2 relative z-10 ml-2'>
              →
            </span>
            <div className='absolute inset-0 bg-rat-orange translate-y-full transition-transform duration-300 cubic-bezier(0.2,1,0.3,1) group-hover:translate-y-0'></div>
          </button>

          {/* 在线人数显示 - 移到按钮右边 */}
          <div className='flex items-center gap-3 bg-white/80 backdrop-blur px-5 py-3 sm:py-2 rounded-full shadow-sm border border-yellow-100/50'>
            <span className='relative flex h-3 w-3'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75'></span>
              <span className='relative inline-flex rounded-full h-3 w-3 bg-orange-500'></span>
            </span>
            <span className='text-[11px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-rat-brown/80 whitespace-nowrap'>
              {t('当前')} <span className='text-rat-orange'>{onlineUsers.toLocaleString()}</span> {t('只鼠鼠在线')}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
