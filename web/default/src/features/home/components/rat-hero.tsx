import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'

export function RatHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status } = useStatus()

  // 处理"领一份奶酪"按钮点击
  const handleGetCheese = () => {
    if (isAuthenticated) {
      // 已登录，跳转到新版控制台概览
      navigate({ to: '/dashboard/$section', params: { section: 'overview' } })
    } else {
      // 未登录，跳转到登录页面，并在登录后进入控制台概览
      navigate({ to: '/sign-in', search: { redirect: '/dashboard/overview' } })
    }
  }

  // 在线人数:优先读后端 online_users(最近活跃访客),缺失时退回连接数;
  // 两者都无效时显示 --,不再用固定数字伪装在线人数
  const onlineUsersValue = Number((status as any)?.online_users)
  const activeConnections = Number(
    (status as any)?.http_stats?.active_connections
  )
  const onlineUsers =
    Number.isFinite(onlineUsersValue) && onlineUsersValue > 0
      ? onlineUsersValue
      : Number.isFinite(activeConnections) && activeConnections > 0
        ? activeConnections
        : null

  return (
    <main className='mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-center px-4 py-24 text-center sm:px-8 sm:py-32 lg:py-40'>
      <div className='w-full space-y-10 sm:space-y-14 lg:space-y-16'>
        {/* 标题 */}
        <h1 className='font-outfit text-[clamp(2.5rem,8vw,8rem)] leading-[0.85] font-black tracking-[-0.04em]'>
          STAMPEDE <br />
          OF{' '}
          <span className='text-rat-yellow drop-shadow-[0_0_15px_rgba(255,210,63,0.5)]'>
            INTELLIGENCE
          </span>
        </h1>

        {/* 描述文本 - 居中 */}
        <p className='text-rat-brown/60 mx-auto max-w-3xl text-xl leading-relaxed font-medium sm:text-2xl'>
          {t('这里是')}{' '}
          <span className='rounded bg-yellow-200 px-2'>{t('鼠鼠🐭公益站')}</span>
          。{t('为您搬运全世界最好的 AI 模型。')}
          <br />
          {t('不讲武德，只要奶酪。')}
        </p>

        {/* 按钮区域 - 移动端垂直排列，桌面端水平排列 */}
        <div className='flex flex-col items-center justify-center gap-4 pt-6 sm:flex-row sm:gap-6 sm:pt-10'>
          {/* 主按钮 */}
          <button
            onClick={handleGetCheese}
            className='group bg-rat-brown relative z-10 w-full overflow-hidden rounded-[28px] px-8 py-4 text-lg font-black text-white transition-all hover:scale-105 hover:-rotate-1 active:scale-95 sm:w-auto sm:px-12 sm:py-6 sm:text-xl'
          >
            <span className='relative z-10'>{t('领一份奶酪 🧀')}</span>
            <span className='relative z-10 ml-2 inline-block transition-transform group-hover:translate-x-2'>
              →
            </span>
            <div className='bg-rat-orange cubic-bezier(0.2,1,0.3,1) absolute inset-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0'></div>
          </button>

          {/* 在线人数显示 - 移到按钮右边 */}
          <div className='flex items-center gap-3 rounded-full border border-yellow-100/50 bg-white/80 px-5 py-3 shadow-sm backdrop-blur sm:py-2'>
            <span className='relative flex h-3 w-3'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75'></span>
              <span className='relative inline-flex h-3 w-3 rounded-full bg-orange-500'></span>
            </span>
            <span className='text-rat-brown/80 text-[11px] font-black tracking-wider whitespace-nowrap uppercase sm:text-[10px] sm:tracking-widest'>
              {t('当前')}{' '}
              <span className='text-rat-orange'>
                {onlineUsers === null ? '--' : onlineUsers.toLocaleString()}
              </span>{' '}
              {t('只鼠鼠在线')}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
