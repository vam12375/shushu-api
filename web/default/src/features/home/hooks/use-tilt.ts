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
import { useEffect, useRef } from 'react'

/*
  3D Tilt 卡片:卡片跟随鼠标三维倾斜,并驱动高光球跟随指针位置。
  直接写 style 避免高频 setState;离开时带缓动复位。
  返回 { cardRef, glowRef },高光球元素可选。

  Edge 浏览器：禁用 Tilt 效果，避免高频 pointermove 监听导致卡顿
*/

// Edge 浏览器检测
function isEdgeBrowser() {
  return /Edg\//.test(navigator.userAgent)
}

export function useTilt<T extends HTMLElement, G extends HTMLElement = HTMLDivElement>(
  maxRotateX = 7,
  maxRotateY = 9
) {
  const cardRef = useRef<T>(null)
  const glowRef = useRef<G>(null)

  useEffect(() => {
    // Edge 浏览器：完全跳过 Tilt 绑定
    if (isEdgeBrowser()) return

    const card = cardRef.current
    if (!card) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const handlePointerMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width
      const py = (event.clientY - rect.top) / rect.height
      const rx = (py - 0.5) * -maxRotateX
      const ry = (px - 0.5) * maxRotateY
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`

      const glow = glowRef.current
      if (glow) {
        glow.style.left = `${px * 100}%`
        glow.style.top = `${py * 100}%`
      }
    }

    const handlePointerLeave = () => {
      // 复位时临时加过渡,避免生硬回弹
      card.style.transition = 'transform .5s cubic-bezier(.2,1,.3,1)'
      card.style.transform = 'rotateX(0deg) rotateY(0deg)'
      window.setTimeout(() => {
        card.style.transition = ''
      }, 500)
    }

    card.addEventListener('pointermove', handlePointerMove, { passive: true })
    card.addEventListener('pointerleave', handlePointerLeave, { passive: true })

    return () => {
      card.removeEventListener('pointermove', handlePointerMove)
      card.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [maxRotateX, maxRotateY])

  return { cardRef, glowRef }
}
