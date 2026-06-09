import { useTranslation } from 'react-i18next'

export function RatTicker() {
  const { t } = useTranslation()
  const providers = [
    'OPENAI',
    'ANTHROPIC',
    'GEMINI',
    'DEEPSEEK',
    'GROQ',
    'LLAMA',
    'MISTRAL',
    'AZURE',
    'BEDROCK',
    'VERTEX',
  ]

  return (
    <div className='py-20 sm:py-36 lg:py-40 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]'>
      <div className='flex gap-12 sm:gap-24 whitespace-nowrap animate-scroll-x items-center h-16 sm:h-20'>
        {/* Triple for smooth infinite scroll */}
        {[...providers, ...providers, ...providers].map((provider, i) => (
          <span
            key={i}
            className='text-[1.5rem] sm:text-[2rem] font-black opacity-15 transition-all duration-300 hover:opacity-100 hover:text-rat-orange hover:scale-110 cursor-default'
          >
            {provider}
          </span>
        ))}
      </div>
    </div>
  )
}
