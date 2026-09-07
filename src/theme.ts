export const themes = [
    { id: 'ancient', name: '古风', description: '宣纸 · 墨色 · 朱砂' },
    { id: 'tech', name: '科技', description: '深空 · 冰蓝 · 纸纹' },
    { id: 'urban', name: '都市异能', description: '夜幕 · 紫电 · 霓虹' },
] as const

export type Theme = (typeof themes)[number]['id']
// 保存在当前对话的变量表里，不影响其他插件变量。
const THEME_KEY = 'st-content-beautify-theme'
let currentTheme: Theme = 'ancient'
const listeners = new Set<() => void>()

export function readTheme(): Theme {
    // 独立预览没有酒馆接口，仅在本次页面中保留选择。
    if (typeof getVariables === 'undefined') return currentTheme
    const saved = getVariables({ type: 'chat' })[THEME_KEY]
    return themes.find((theme) => theme.id === saved)?.id ?? 'ancient'
}

export function applyTheme(theme: Theme) {
    currentTheme = theme
    window.parent.document.documentElement.dataset.ctTheme = theme
    listeners.forEach((listener) => listener())
}

export function saveTheme(theme: Theme) {
    if (typeof insertOrAssignVariables !== 'undefined') {
        insertOrAssignVariables({ [THEME_KEY]: theme }, { type: 'chat' })
    }
    applyTheme(theme)
}

export function getThemeSnapshot() {
    return currentTheme
}

export function subscribeTheme(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export function startThemeSync() {
    applyTheme(readTheme())
    return eventOn(tavern_events.CHAT_CHANGED, () => applyTheme(readTheme())).stop
}
