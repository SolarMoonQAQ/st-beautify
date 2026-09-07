import i18n from 'i18next'
import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18n.use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'zh-CN',
        supportedLngs: ['zh-CN'],
        ns: ['workshop'],
        defaultNS: 'workshop',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
        backend: {
            loadPath: `/locales/{{lng}}/{{ns}}.json`,
            requestOptions: {
                cache: 'no-store',
            },
        },
    })

export default i18n
