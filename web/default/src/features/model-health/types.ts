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
// ----------------------------------------------------------------------------
// Model health types
// ----------------------------------------------------------------------------
//
// Shape of the data shown on the /model-health page. Availability-first, with
// success-rate metrics derived from request logs over the selected period.

export type ModelHealthPeriod = 'today' | 'week' | 'month' | 'all'

export type ModelHealthStatus = 'online' | 'degraded' | 'offline' | 'unknown'

export type ModelHealthItem = {
  model_name: string
  vendor: string
  vendor_icon?: string
  status: ModelHealthStatus
  total_channels: number
  healthy_channels: number
  avg_response_time_ms: number
  last_test_time: number
  /** 0..1, success rate over the selected period (from logs). */
  success_rate: number
  request_count: number
  error_count: number
  /** Average successful request latency in seconds. */
  avg_use_time: number
}

export type ModelHealthSummary = {
  total_models: number
  online: number
  degraded: number
  offline: number
  unknown: number
  total_channels: number
}

export type ModelHealthSnapshot = {
  period: ModelHealthPeriod
  updated_at: number
  summary: ModelHealthSummary
  models: ModelHealthItem[]
}
