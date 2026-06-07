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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type SystemBrandProps = {
  defaultName?: string
  defaultVersion?: string
  /**
   * Visual layout:
   * - 'sidebar': stacked card style (used inside the sidebar header).
   * - 'inline': compact horizontal pill (used inside the top app bar).
   */
  variant?: 'sidebar' | 'inline'
}

/**
 * System brand component
 * Displays current system logo + name.
 * - inline: compact pill in the top app bar; clicking navigates to home (/)
 * - sidebar: stacked card in the sidebar header (display only)
 */
export function SystemBrand(props: SystemBrandProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { logo } = useSystemConfig()

  const variant = props.variant ?? 'sidebar'
  const name = status?.system_name || props.defaultName || 'New API'
  const version =
    status?.version || props.defaultVersion || t('Unknown version')

  if (variant === 'inline') {
    return (
      <Link
        to='/'
        aria-label={t('Go to home')}
        className={cn(
          'text-foreground inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full px-1 pe-2 text-sm font-bold transition-colors outline-none select-none sm:h-10 sm:gap-2 sm:px-1.5 sm:pe-3',
          'hover:bg-card focus-visible:ring-ring/40 focus-visible:ring-2 md:hidden'
        )}
      >
        <div className='bg-accent ring-foreground/80 flex size-7 items-center justify-center overflow-hidden rounded-full shadow-[2px_2px_0_var(--foreground)] ring-1 sm:size-8 sm:shadow-[3px_3px_0_var(--foreground)]'>
          <img
            src={logo}
            alt={t('Logo')}
            className='size-full rounded-full object-cover'
          />
        </div>
        <span className='max-w-[7.5rem] truncate min-[390px]:max-w-[9rem] sm:max-w-[11rem]'>
          {name}
        </span>
      </Link>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='hover:text-sidebar-foreground active:text-sidebar-foreground h-auto cursor-default items-center gap-3 rounded-lg px-2 py-3 hover:bg-transparent active:bg-transparent'
          render={<div />}
        >
          <div className='bg-accent ring-foreground/80 flex aspect-square size-10 items-center justify-center overflow-hidden rounded-full shadow-[3px_3px_0_var(--foreground)] ring-1'>
            <img
              src={logo}
              alt={t('Logo')}
              className='size-full rounded-full object-cover'
            />
          </div>
          <div className='grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden'>
            <span className='text-muted-foreground text-[11px] leading-none font-extrabold uppercase'>
              {t('Platform')}
            </span>
            <span className='mt-1 truncate text-base leading-none font-black'>
              {name}
            </span>
            <span className='text-muted-foreground mt-1 truncate text-[11px]'>
              {version}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
