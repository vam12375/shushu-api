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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getUserQuotaDates } from '@/features/dashboard/api'

/**
 * 获取今日统计数据（token消耗、请求数）
 * 用于首页看板展示
 */
export function useTodayStats() {
  // 计算今日时间范围（00:00:00 - 23:59:59）
  const todayRange = useMemo(() => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    )
    return {
      start_timestamp: Math.floor(startOfDay.getTime() / 1000),
      end_timestamp: Math.floor(endOfDay.getTime() / 1000),
    }
  }, [])

  const query = useQuery({
    queryKey: ['home', 'today-stats', todayRange.start_timestamp],
    queryFn: async () =>
      getUserQuotaDates(
        {
          start_timestamp: todayRange.start_timestamp,
          end_timestamp: todayRange.end_timestamp,
          default_time: 'hour',
        },
        true // 获取所有用户的数据（管理员视角）
      ),
    staleTime: 60 * 1000, // 1分钟缓存
    refetchInterval: 5 * 60 * 1000, // 每5分钟自动刷新,配合看板滚动展示本轮新增token
  })

  // 计算今日总token消耗和总请求数
  const stats = useMemo(() => {
    const data = query.data?.data ?? []
    let totalTokens = 0
    let totalRequests = 0

    for (const item of data) {
      totalTokens += Number(item.token_used) || 0
      totalRequests += Number(item.count) || 0
    }

    return {
      totalTokens,
      totalRequests,
    }
  }, [query.data])

  return {
    ...stats,
    isLoading: query.isLoading,
    error: query.error,
  }
}
