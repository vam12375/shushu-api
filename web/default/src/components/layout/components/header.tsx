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
import { cn } from '@/lib/utils'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement>

export function Header({ className, children, ...props }: HeaderProps) {
  return (
    <header
      className={cn(
        'bg-background/85 sticky top-0 z-40 h-[var(--app-header-height,4.25rem)] w-full shrink-0 border-b backdrop-blur-xl',
        className
      )}
      {...props}
    >
      <div className='flex h-full min-w-0 items-center gap-1.5 px-2.5 sm:gap-3 sm:px-5'>
        <SidebarTrigger
          variant='outline'
          className='size-8 rounded-full sm:size-9'
        />
        {children}
      </div>
    </header>
  )
}
