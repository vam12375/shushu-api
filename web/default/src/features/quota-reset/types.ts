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

export type QuotaResetStatus = 'pending' | 'completed' | 'all'

export interface QuotaResetSummary {
  threshold_quota: number
  target_quota: number
  threshold_usd: number
  target_usd: number
  delay_seconds: number
  pending_count: number
  due_count: number
  completed_count: number
  low_balance_user_count: number
  next_reset_at: number
  now: number
}

export interface QuotaResetState {
  user_id: number
  username: string
  display_name: string
  email: string
  group: string
  user_status: number
  current_quota: number
  used_quota: number
  status: Exclude<QuotaResetStatus, 'all'>
  triggered_at: number
  reset_at: number
  completed_at: number
  trigger_quota: number
  created_at: number
  updated_at: number
}

export interface QuotaResetPageData {
  items: QuotaResetState[]
  total: number
  page: number
  page_size: number
}

export interface QuotaResetMonitorData {
  summary: QuotaResetSummary
  states: QuotaResetPageData
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}
