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
import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ROLE } from '@/lib/roles'
import { QuotaReset } from '@/features/quota-reset'
import type { QuotaResetStatus } from '@/features/quota-reset/types'

const quotaResetSearchSchema = z.object({
  status: z.enum(['pending', 'completed', 'all']).optional().catch('pending'),
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
})

export const Route = createFileRoute('/_authenticated/quota-reset/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()

    if (!auth.user || auth.user.role < ROLE.SUPER_ADMIN) {
      throw redirect({
        to: '/403',
      })
    }
  },
  validateSearch: quotaResetSearchSchema,
  component: QuotaResetRoute,
})

function QuotaResetRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const status = search.status ?? 'pending'
  const page = Math.max(1, search.page ?? 1)
  const pageSize = Math.max(1, search.pageSize ?? 20)

  return (
    <QuotaReset
      status={status as QuotaResetStatus}
      page={page}
      pageSize={pageSize}
      onSearchChange={(patch) => {
        void navigate({
          search: (prev) => ({
            ...prev,
            status: patch.status ?? prev.status,
            page: patch.page,
            pageSize: patch.pageSize ?? prev.pageSize,
          }),
        })
      }}
    />
  )
}
