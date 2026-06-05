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
import { SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useSearch } from '@/context/search-provider'
import { Button } from './ui/button'

type SearchProps = {
  className?: string
  type?: React.HTMLInputTypeAttribute
  placeholder?: string
}

export function Search({ className = '', placeholder }: SearchProps) {
  const { t } = useTranslation()
  const { setOpen } = useSearch()
  const resolvedPlaceholder = placeholder ?? t('Search')

  return (
    <Button
      variant='outline'
      className={cn(
        'bg-card/80 group text-muted-foreground hover:bg-card border-border relative h-10 w-full flex-1 justify-start rounded-full ps-10 pe-16 text-sm font-semibold shadow-none sm:w-44 md:flex-none lg:w-56 xl:w-72',
        className
      )}
      onClick={() => setOpen(true)}
      aria-label={resolvedPlaceholder}
    >
      <SearchIcon
        aria-hidden='true'
        className='absolute start-3 top-1/2 -translate-y-1/2'
      />
      <span className='truncate'>{resolvedPlaceholder}</span>
      <kbd className='bg-background group-hover:bg-muted pointer-events-none absolute end-2 top-1/2 hidden h-5 -translate-y-1/2 items-center gap-1 rounded-md border px-1.5 font-mono text-[10px] font-bold opacity-100 select-none sm:flex'>
        <span className='text-xs'>⌘</span>
        {t('K')}
      </kbd>
    </Button>
  )
}
