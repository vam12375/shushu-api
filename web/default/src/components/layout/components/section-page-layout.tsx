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
import {
  Children,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Main } from './main'
import { PageFooterProvider } from './page-footer'

type SlotProps = { children?: ReactNode }

function SectionPageLayoutTitle(_props: SlotProps) {
  return null
}
SectionPageLayoutTitle.displayName = 'SectionPageLayout.Title'

function SectionPageLayoutActions(_props: SlotProps) {
  return null
}
SectionPageLayoutActions.displayName = 'SectionPageLayout.Actions'

function SectionPageLayoutContent(_props: SlotProps) {
  return null
}
SectionPageLayoutContent.displayName = 'SectionPageLayout.Content'

function SectionPageLayoutBreadcrumb(_props: SlotProps) {
  return null
}
SectionPageLayoutBreadcrumb.displayName = 'SectionPageLayout.Breadcrumb'

export type SectionPageLayoutProps = {
  children: ReactNode
}

export function SectionPageLayout(props: SectionPageLayoutProps) {
  const [footerContainer, setFooterContainer] = useState<HTMLDivElement | null>(
    null
  )

  let title: ReactNode = null
  let actions: ReactNode = null
  let content: ReactNode = null
  let breadcrumb: ReactNode = null

  Children.forEach(props.children, (node) => {
    if (!isValidElement(node)) return
    const child = node as ReactElement<SlotProps>
    if (child.type === SectionPageLayoutTitle) title = child.props.children
    else if (child.type === SectionPageLayoutActions)
      actions = child.props.children
    else if (child.type === SectionPageLayoutContent)
      content = child.props.children
    else if (child.type === SectionPageLayoutBreadcrumb)
      breadcrumb = child.props.children
  })

  return (
    <PageFooterProvider container={footerContainer}>
      <Main>
        <div className='mx-auto w-full max-w-[1680px] shrink-0 px-3 pt-4 pb-2.5 sm:px-6 sm:pt-7 sm:pb-4'>
          {breadcrumb != null && (
            <div className='mb-2 sm:mb-3'>{breadcrumb}</div>
          )}
          <div className='flex flex-wrap items-start justify-between gap-x-4 gap-y-3 sm:items-end'>
            <div className='min-w-0 flex-1'>
              <h2 className='line-clamp-2 text-2xl leading-tight font-black tracking-normal break-words sm:truncate sm:text-4xl sm:leading-none'>
                {title}
              </h2>
            </div>
            {actions != null && (
              <div className='no-scrollbar -mx-1 flex w-[calc(100%+0.5rem)] shrink-0 items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0'>
                {actions}
              </div>
            )}
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-auto px-3 pt-1 pb-3 sm:px-6 sm:pt-1.5 sm:pb-6'>
          <div className='mx-auto w-full max-w-[1680px]'>{content}</div>
        </div>

        <div
          ref={setFooterContainer}
          className='bg-background shrink-0 border-t px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] empty:hidden sm:px-4 sm:py-3'
        />
      </Main>
    </PageFooterProvider>
  )
}

SectionPageLayout.Title = SectionPageLayoutTitle
SectionPageLayout.Actions = SectionPageLayoutActions
SectionPageLayout.Content = SectionPageLayoutContent
SectionPageLayout.Breadcrumb = SectionPageLayoutBreadcrumb
