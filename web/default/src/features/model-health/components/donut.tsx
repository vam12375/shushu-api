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
import { motion, useReducedMotion } from 'motion/react'

export type DonutSegment = {
  key: string
  value: number
  /** CSS color (hex / var). */
  color: string
}

type DonutProps = {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  children?: React.ReactNode
}

/**
 * Lightweight multi-segment SVG donut. No chart dependency — crisp at any
 * size, theme-agnostic (colors passed in), and animates the ring sweep.
 */
export function Donut({
  segments,
  size = 168,
  thickness = 14,
  children,
}: DonutProps) {
  const shouldReduce = useReducedMotion()
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  let offsetAcc = 0
  const arcs =
    total > 0
      ? segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const fraction = s.value / total
            const dash = fraction * circumference
            const arc = {
              ...s,
              dash,
              gap: circumference - dash,
              offset: offsetAcc,
            }
            offsetAcc += dash
            return arc
          })
      : []

  return (
    <div
      className='relative'
      style={{ width: size, height: size }}
      role='img'
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className='-rotate-90'
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          strokeWidth={thickness}
          className='stroke-muted'
        />
        {arcs.map((arc) => (
          <motion.circle
            key={arc.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill='none'
            stroke={arc.color}
            strokeWidth={thickness}
            strokeLinecap='round'
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            initial={shouldReduce ? false : { strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${arc.dash} ${arc.gap}` }}
            transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          />
        ))}
      </svg>
      {children && (
        <div className='absolute inset-0 flex flex-col items-center justify-center'>
          {children}
        </div>
      )}
    </div>
  )
}

type RingProps = {
  /** 0..1 */
  value: number
  size?: number
  thickness?: number
  color: string
  children?: React.ReactNode
}

/** Single-value circular progress ring (used for per-model success rate). */
export function Ring({
  value,
  size = 56,
  thickness = 5,
  color,
  children,
}: RingProps) {
  const shouldReduce = useReducedMotion()
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))
  const dash = clamped * circumference

  return (
    <div className='relative' style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className='-rotate-90'
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          strokeWidth={thickness}
          className='stroke-muted'
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap='round'
          strokeDasharray={`${dash} ${circumference - dash}`}
          initial={shouldReduce ? false : { strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
          transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
        />
      </svg>
      {children && (
        <div className='absolute inset-0 flex items-center justify-center'>
          {children}
        </div>
      )}
    </div>
  )
}
