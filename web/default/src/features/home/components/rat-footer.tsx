import { useTranslation } from 'react-i18next'

export function RatFooter() {
  const { t } = useTranslation()

  return (
    <footer className='max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28 lg:py-32 border-t-2 border-rat-brown/5 text-center space-y-10 sm:space-y-14'>
      <div className='font-hand text-2xl sm:text-4xl opacity-30'>
        {t('"鼠鼠我呀，最爱 API 啦捏~"')}
      </div>
      <div className='flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8'>
        <div className='text-center md:text-left space-y-2'>
          <div className='font-black text-lg sm:text-xl uppercase tracking-widest'>
            New-API | Rat Charity
          </div>
          <p className='text-xs font-bold text-rat-brown/30 max-w-xs mx-auto md:mx-0'>
            {t('不盈利，不作恶。这是一个由社区鼠鼠共同维护的公益项目。')}
          </p>
        </div>
        <div className='flex gap-8 sm:gap-12 font-black text-xs uppercase tracking-[0.2em] text-rat-brown/40'>
          <a href='#' className='hover:text-rat-orange transition-colors'>
            GITHUB
          </a>
          <a href='#' className='hover:text-rat-orange transition-colors'>
            DOCS
          </a>
          <a href='#' className='hover:text-rat-orange transition-colors'>
            DONATE
          </a>
        </div>
      </div>
    </footer>
  )
}
