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
import {
  Zap,
  Shield,
  Globe,
  Code,
  Gauge,
  DollarSign,
  Users,
  HeartHandshake,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimateInView } from '@/components/animate-in-view'

interface FeaturesProps {
  className?: string
}

export function Features(_props: FeaturesProps) {
  const { t } = useTranslation()

  const features = [
    {
      id: 'fast',
      num: '01',
      title: t('Lightning Fast Rat'),
      desc: t('Fast like a rat stealing cheese'),
      emoji: '🧀',
      span: 'md:col-span-2',
      icon: <Zap className='size-4' />,
      borderColor: 'border-l-yellow-500',
      iconColor: 'text-yellow-500',
      visual: (
        <div className='mt-4 grid grid-cols-3 gap-2'>
          {['OpenAI', 'Claude', 'Gemini', 'DeepSeek', 'Qwen', 'Llama'].map(
            (name, i) => (
              <div
                key={name}
                className='border-border/30 bg-muted/20 text-muted-foreground flex items-center justify-center rounded-lg border px-3 py-2 text-xs transition-all duration-300 hover:scale-105 hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-600 hover:shadow-[2px_2px_0_rgb(234,179,8)]'
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {name}
              </div>
            )
          )}
        </div>
      ),
    },
    {
      id: 'secure',
      num: '02',
      title: t('Stable Infrastructure'),
      desc: t('Rock-solid public infrastructure'),
      emoji: '🛡️',
      span: 'md:col-span-1',
      icon: <Shield className='size-4' />,
      borderColor: 'border-l-green-500',
      iconColor: 'text-green-500',
      visual: (
        <div className='mt-4 flex items-center justify-center'>
          <div className='relative'>
            <div className='flex size-16 items-center justify-center rounded-2xl border-2 border-green-500 bg-green-500/10 transition-transform duration-300 hover:rotate-12'>
              <Shield className='size-7 text-green-600' strokeWidth={1.5} />
            </div>
            <div className='absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-green-500 shadow-[2px_2px_0_rgb(34,197,94)]'>
              <svg
                className='size-3 text-white'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={3}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='m4.5 12.75 6 6 9-13.5'
                />
              </svg>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'global',
      num: '03',
      title: t('Load Balancing Master'),
      desc: t('Multi-region smart routing'),
      emoji: '🌍',
      span: 'md:col-span-1',
      icon: <Globe className='size-4' />,
      borderColor: 'border-l-blue-500',
      iconColor: 'text-blue-500',
      visual: (
        <div className='mt-4 space-y-2'>
          {[t('Load Balancing'), t('Rate Limiting'), t('Cost Tracking')].map(
            (step, i) => (
              <div key={step} className='flex items-center gap-2'>
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ${
                    i === 1
                      ? 'border-2 border-blue-500 bg-blue-500/20 text-blue-600 shadow-[2px_2px_0_rgb(59,130,246)]'
                      : 'border-border/40 bg-muted text-muted-foreground border'
                  }`}
                >
                  {i + 1}
                </div>
                <div className='bg-border/40 h-px flex-1' />
                <span className='text-muted-foreground text-xs'>{step}</span>
              </div>
            )
          )}
        </div>
      ),
    },
    {
      id: 'developer',
      num: '04',
      title: t('Developer-Friendly First'),
      desc: t('Multi-protocol compatible, just works'),
      emoji: '💻',
      span: 'md:col-span-2',
      icon: <Code className='size-4' />,
      borderColor: 'border-l-purple-500',
      iconColor: 'text-purple-500',
      visual: (
        <div className='mt-4 flex items-center gap-3'>
          <div className='flex -space-x-2'>
            {['API', 'SDK', 'CLI', 'Docs'].map((n, i) => (
              <div
                key={n}
                className='border-background from-muted to-muted/60 text-muted-foreground flex size-8 items-center justify-center rounded-full border-2 bg-gradient-to-br text-[9px] font-bold transition-transform duration-300 hover:z-10 hover:scale-125'
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {n}
              </div>
            ))}
          </div>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Code className='size-3.5 text-purple-500' />
            {t('Multi-protocol Compatible')}
          </div>
        </div>
      ),
    },
  ]

  const additionalFeatures = [
    {
      icon: <Gauge className='size-5' strokeWidth={1.5} />,
      title: t('High Performance'),
      desc: t('High concurrency with auto load balancing'),
      emoji: '⚡',
      color: 'text-orange-500',
    },
    {
      icon: <DollarSign className='size-5' strokeWidth={1.5} />,
      title: t('Transparent Billing'),
      desc: t('Pay-as-you-go with real-time monitoring'),
      emoji: '💰',
      color: 'text-green-500',
    },
    {
      icon: <Users className='size-5' strokeWidth={1.5} />,
      title: t('Team Collaboration'),
      desc: t('Multi-user with flexible permissions'),
      emoji: '👥',
      color: 'text-blue-500',
    },
    {
      icon: <HeartHandshake className='size-5' strokeWidth={1.5} />,
      title: t('Open Source'),
      desc: t('Community-driven, self-hosted, extensible'),
      emoji: '❤️',
      color: 'text-red-500',
    },
  ]

  return (
    <section className='relative z-10 px-6 py-24 md:py-32'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-16 max-w-2xl'>
          <p className='text-muted-foreground mb-3 text-xs font-bold uppercase tracking-widest'>
            {t('Core Features')} ✨
          </p>
          <h2 className='text-3xl leading-tight font-black tracking-tight md:text-4xl'>
            {t('Built for devs,')}
            <br />
            <span className='inline-block -rotate-1 bg-cyan-400 px-2 text-foreground'>
              {t('designed to fly')} 🚀
            </span>
          </h2>
        </AnimateInView>

        {/* Bento grid - 添加彩色左边框 */}
        <div className='border-border/40 bg-border/40 grid gap-px overflow-hidden rounded-2xl border-2 shadow-[4px_4px_0_var(--foreground)] md:grid-cols-3'>
          {features.map((f, i) => (
            <AnimateInView
              key={f.id}
              delay={i * 100}
              animation='scale-in'
              className={`bg-background group hover:bg-muted/20 relative overflow-hidden border-l-4 p-7 transition-all duration-300 md:p-8 ${f.span} ${f.borderColor}`}
            >
              {/* 装饰性大号 emoji */}
              <div className='pointer-events-none absolute -top-2 -right-2 text-6xl opacity-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:opacity-10'>
                {f.emoji}
              </div>

              <div className='relative z-10'>
                <div className='mb-3 flex items-center gap-3'>
                  <span className='border-border/40 bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg border-2 text-xs font-bold tabular-nums shadow-[2px_2px_0_var(--foreground)]'>
                    {f.num}
                  </span>
                  <div
                    className={`transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 ${f.iconColor}`}
                  >
                    {f.icon}
                  </div>
                  <h3 className='text-sm font-bold'>{f.title}</h3>
                </div>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  {f.desc}
                </p>
                {f.visual}
              </div>
            </AnimateInView>
          ))}
        </div>

        {/* 附加功能 - 标签云效果 */}
        <div className='mt-16 grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8'>
          {additionalFeatures.map((f, i) => (
            <AnimateInView
              key={f.title}
              delay={i * 100}
              animation='fade-up'
              className='group flex flex-col items-center text-center'
            >
              <div
                className={`text-muted-foreground border-border/50 bg-muted/30 mb-3 flex size-14 items-center justify-center rounded-2xl border-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:border-current group-hover:shadow-[3px_3px_0_currentColor] ${f.color}`}
              >
                {f.icon}
              </div>
              <div className='mb-1 text-2xl'>{f.emoji}</div>
              <h3 className='mb-1.5 text-sm font-bold'>{f.title}</h3>
              <p className='text-muted-foreground max-w-[200px] text-xs leading-relaxed'>
                {f.desc}
              </p>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
