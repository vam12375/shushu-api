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
import { useEffect, useState } from 'react'
import { getHomePageContent } from '../api'
import type { HomePageContentResult } from '../types'

const STORAGE_KEY = 'home_page_content'

function readCachedContent(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * Hook to load and manage custom home page content
 * Supports both Markdown/HTML content and iframe URLs
 *
 * 乐观渲染策略(LCP 优化):不再等待 API 返回才渲染首页。
 * 初始值取 localStorage 缓存(绝大多数站点为空 => 直接渲染默认首页),
 * API 在后台刷新,内容有变化时再无缝替换。
 */
export function useHomePageContent(): HomePageContentResult {
  const [content, setContent] = useState<string>(readCachedContent)

  useEffect(() => {
    let mounted = true

    const loadContent = async () => {
      try {
        const response = await getHomePageContent()
        const { success, data } = response

        if (!mounted) return

        if (success && data) {
          setContent(data)
          localStorage.setItem(STORAGE_KEY, data)
        } else {
          // 后台确认无自定义内容时清空(已渲染的默认首页不受影响)
          setContent('')
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (error) {
        // 拉取失败时保留当前内容(缓存或默认首页),仅记录日志不打扰用户
        // eslint-disable-next-line no-console
        console.error('Failed to load home page content:', error)
      }
    }

    loadContent()

    return () => {
      mounted = false
    }
  }, [])

  let isUrl = false
  try {
    const url = new URL(content)
    isUrl = url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    // not a URL
  }

  return { content, isUrl }
}
