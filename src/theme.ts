export const themes = [
    { id: 'ancient', name: '古风', description: '宣纸 · 墨色 · 朱砂' },
    { id: 'tech', name: '科技', description: '玻璃屏 · 霓虹 · 数据流' },
] as const

export const techColors = [
    { id: 'red', name: '赤红', color: '#ff5c6c', rgb: '255 92 108' },
    { id: 'orange', name: '橙光', color: '#ff9f43', rgb: '255 159 67' },
    { id: 'yellow', name: '明黄', color: '#f6dc5c', rgb: '246 220 92' },
    { id: 'green', name: '荧绿', color: '#54e391', rgb: '84 227 145' },
    { id: 'cyan', name: '冰川蓝', color: '#63e6ff', rgb: '99 230 255' },
    { id: 'blue', name: '电光蓝', color: '#5f8cff', rgb: '95 140 255' },
    { id: 'violet', name: '脉冲紫', color: '#b07cff', rgb: '176 124 255' },
    { id: 'black', name: '曜石黑', color: '#181b20', rgb: '24 27 32' },
    { id: 'white', name: '极光白', color: '#f4f7ff', rgb: '244 247 255' },
] as const

export type Theme = (typeof themes)[number]['id']
export type TechColor = (typeof techColors)[number]['id']
// 保存在当前对话的变量表里，不影响其他插件变量。
const THEME_KEY = 'st-content-beautify-theme'
const TECH_COLOR_KEY = 'st-content-beautify-tech-color'
let currentTheme: Theme = 'ancient'
let currentTechColor: TechColor = 'cyan'
const listeners = new Set<() => void>()

export function readTheme(): Theme {
    // 独立预览没有酒馆接口，仅在本次页面中保留选择。
    if (typeof getVariables === 'undefined') return currentTheme
    const saved = getVariables({ type: 'chat' })[THEME_KEY]
    if (saved === 'urban') return 'tech'
    return themes.find((theme) => theme.id === saved)?.id ?? 'ancient'
}

export function readTechColor(): TechColor {
    if (typeof getVariables === 'undefined') return currentTechColor
    const saved = getVariables({ type: 'chat' })[TECH_COLOR_KEY]
    if (saved === 'magenta') return 'red'
    if (saved === 'amber') return 'orange'
    return techColors.find((color) => color.id === saved)?.id ?? 'cyan'
}

export function applyTheme(theme: Theme) {
    currentTheme = theme
    window.parent.document.documentElement.dataset.ctTheme = theme
    listeners.forEach((listener) => listener())
}

export function applyTechColor(color: TechColor) {
    currentTechColor = color
    const root = window.parent.document.documentElement
    const option = techColors.find((item) => item.id === color) ?? techColors[4]
    root.dataset.ctTechColor = color
    root.style.setProperty('--ct-tech-accent', option.color)
    root.style.setProperty('--ct-tech-accent-rgb', option.rgb)
    listeners.forEach((listener) => listener())
}

export function saveTheme(theme: Theme) {
    if (typeof insertOrAssignVariables !== 'undefined') {
        insertOrAssignVariables({ [THEME_KEY]: theme }, { type: 'chat' })
    }
    applyTheme(theme)
}

export function saveTechColor(color: TechColor) {
    if (typeof insertOrAssignVariables !== 'undefined') {
        insertOrAssignVariables({ [TECH_COLOR_KEY]: color }, { type: 'chat' })
    }
    applyTechColor(color)
}

export function getThemeSnapshot() {
    return currentTheme
}

export function getTechColorSnapshot() {
    return currentTechColor
}

export function subscribeTheme(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export function startThemeSync() {
    applyTheme(readTheme())
    applyTechColor(readTechColor())
    return eventOn(tavern_events.CHAT_CHANGED, () => {
        applyTheme(readTheme())
        applyTechColor(readTechColor())
    }).stop
}
