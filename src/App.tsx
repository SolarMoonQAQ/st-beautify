import { type CSSProperties, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
    getTechColorSnapshot,
    getThemeSnapshot,
    saveTechColor,
    saveTheme,
    subscribeTheme,
    techColors,
    themes,
} from '@/theme'

export default function App({ onClose }: { onClose?: () => void }) {
    const selected = useSyncExternalStore(subscribeTheme, getThemeSnapshot)
    const selectedTechColor = useSyncExternalStore(subscribeTheme, getTechColorSnapshot)

    return (
        <section className="ct-settings">
            <header className="ct-settings-header">
                <div>
                    <h2 id="ct-settings-title">正文美化</h2>
                    <p>选择阅读主题</p>
                </div>
                {onClose && (
                    <button type="button" className="ct-close" onClick={onClose} aria-label="关闭">
                        ×
                    </button>
                )}
            </header>
            <div className="ct-theme-options" aria-label="阅读主题">
                {themes.map((theme) => (
                    <button
                        key={theme.id}
                        type="button"
                        className="ct-theme-option"
                        data-theme={theme.id}
                        aria-pressed={selected === theme.id}
                        onClick={() => saveTheme(theme.id)}
                    >
                        <span className="ct-theme-swatch" aria-hidden="true" />
                        <span>
                            <strong>{theme.name}</strong>
                            <small>{theme.description}</small>
                        </span>
                        <span className="ct-theme-check" aria-hidden="true">
                            {selected === theme.id ? '✓' : ''}
                        </span>
                    </button>
                ))}
            </div>
            <AnimatePresence initial={false}>
                {selected === 'tech' && (
                    <motion.div
                        className="ct-color-reveal"
                        initial={{ height: 0, opacity: 0, y: -6 }}
                        animate={{ height: 'auto', opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -6 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="ct-color-settings">
                            <span className="ct-color-title">科技主色</span>
                            <div className="ct-color-options" aria-label="科技主题主色">
                                {techColors.map((color) => (
                                    <button
                                        key={color.id}
                                        type="button"
                                        className="ct-color-option"
                                        data-color={color.id}
                                        aria-label={color.name}
                                        aria-pressed={selectedTechColor === color.id}
                                        title={color.name}
                                        style={
                                            { '--ct-swatch-color': color.color } as CSSProperties
                                        }
                                        onClick={() => saveTechColor(color.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <p className="ct-settings-note">即时生效 · 保存到当前对话</p>
        </section>
    )
}
