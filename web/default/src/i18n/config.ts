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
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

// 语言包按需异步加载(LCP 优化):6 个语言包合计约 2MB,
// 原先全部 eager 打进主 chunk;现在仅加载「当前语言 + en 兜底」。
// 使用显式映射而非模板字符串动态 import,避免打包器引入额外目录上下文。
const localeLoaders: Record<string, () => Promise<{ default: object }>> = {
  en: () => import('./locales/en.json'),
  zh: () => import('./locales/zh.json'),
  fr: () => import('./locales/fr.json'),
  ru: () => import('./locales/ru.json'),
  ja: () => import('./locales/ja.json'),
  vi: () => import('./locales/vi.json'),
}

// 自定义 i18next backend:把语言包读取代理到上面的懒加载映射
const lazyLocaleBackend = {
  type: 'backend' as const,
  init() {
    // i18next BackendModule 接口要求,无需初始化逻辑
  },
  read(
    language: string,
    namespace: string,
    callback: (err: unknown, data?: unknown) => void
  ) {
    const loader = localeLoaders[language]
    if (!loader) {
      callback(new Error(`Unsupported language: ${language}`))
      return
    }
    loader()
      .then((module) => {
        // locale JSON 顶层带 namespace 层(形如 { translation: {...} }),
        // 而 backend read 必须返回「当前 namespace 的平面 key->value 数据」,
        // 否则查找路径多一层包装导致全部 miss(表现为整站显示英文 key)
        const data = module.default as Record<string, unknown>
        callback(null, data[namespace] ?? data)
      })
      .catch((error) => callback(error))
  },
}

i18n
  .use(LanguageDetector)
  .use(lazyLocaleBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh', 'fr', 'ru', 'ja', 'vi'],
    load: 'languageOnly', // Convert zh-CN -> zh
    nsSeparator: false, // Allow literal colons in keys (e.g., URLs, labels)
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      // 不挂起渲染:语言包到达前先以 key(即源文案)渲染,到达后自动刷新。
      // 这让首屏(LCP)不被语言包网络请求阻塞。
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
    },
  })

export default i18n
