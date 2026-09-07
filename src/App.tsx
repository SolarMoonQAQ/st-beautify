import { useSyncExternalStore } from 'react'
import { getThemeSnapshot, subscribeTheme, saveTheme, themes } from '@/theme'

export default function App({ onClose }: { onClose?: () => void }) {
    const selected = useSyncExternalStore(subscribeTheme, getThemeSnapshot)
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
            <p className="ct-settings-note">即时生效 · 保存到当前对话</p>
        </section>
    )
}
