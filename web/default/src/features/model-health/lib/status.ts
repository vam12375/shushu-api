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
import type { ModelHealthStatus } from '../types'

type StatusMeta = {
  /** Translation key for the human-readable label. */
  labelKey: string
  /** Tailwind classes for the small status dot. */
  dotClass: string
  /** Tailwind classes for the status badge text/background. */
  badgeClass: string
  /** Tailwind class adding a colored glow ring on hover (for cards). */
  glowClass: string
  /** Raw color for SVG strokes / donut segments. */
  color: string
  /** Tailwind text color class for emphasized numbers. */
  textClass: string
}

const STATUS_META: Record<ModelHealthStatus, StatusMeta> = {
  online: {
    labelKey: 'Online',
    dotClass: 'bg-emerald-500',
    badgeClass:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    glowClass:
      'hover:border-emerald-500/40 hover:shadow-[0_0_0_1px_rgb(16_185_129/0.15),0_8px_30px_-12px_rgb(16_185_129/0.45)]',
    color: 'oklch(0.72 0.17 162)',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  degraded: {
    labelKey: 'Degraded',
    dotClass: 'bg-amber-500',
    badgeClass:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    glowClass:
      'hover:border-amber-500/40 hover:shadow-[0_0_0_1px_rgb(245_158_11/0.15),0_8px_30px_-12px_rgb(245_158_11/0.45)]',
    color: 'oklch(0.77 0.16 78)',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  offline: {
    labelKey: 'Offline',
    dotClass: 'bg-red-500',
    badgeClass:
      'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    glowClass:
      'hover:border-red-500/40 hover:shadow-[0_0_0_1px_rgb(239_68_68/0.15),0_8px_30px_-12px_rgb(239_68_68/0.45)]',
    color: 'oklch(0.64 0.21 25)',
    textClass: 'text-red-600 dark:text-red-400',
  },
  unknown: {
    labelKey: 'Not checked',
    dotClass: 'bg-muted-foreground/40',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    glowClass: 'hover:border-border',
    color: 'oklch(0.6 0.02 250)',
    textClass: 'text-muted-foreground',
  },
}

export function getStatusMeta(status: ModelHealthStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.unknown
}

/** Color for a 0..1 success rate (green/amber/red thresholds). */
export function successColor(rate: number): string {
  if (rate >= 0.99) return 'oklch(0.72 0.17 162)'
  if (rate >= 0.9) return 'oklch(0.77 0.16 78)'
  return 'oklch(0.64 0.21 25)'
}

export function successTextClass(rate: number): string {
  if (rate >= 0.99) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 0.9) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}
