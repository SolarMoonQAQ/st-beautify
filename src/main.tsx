import App from '@/App'
import { startThemeSync } from '@/theme'
import { createRoot, type Root } from 'react-dom/client'
import pluginCss from './style/index.css?inline'
import { injectContentPrompt } from '@/content/content-inject.ts'
import { startContentRender } from '@/content/content-runtime.tsx'
import '@/shared/i18n.ts'

const STYLE_ID = 'cangxuanjie-plugin-style'
const APP_ROOT_ID = 'cangxuanjie-app-root'

let appRoot: Root | null = null
let appContainer: HTMLDialogElement | null = null
let menuButton: HTMLButtonElement | null = null
let menuObserver: MutationObserver | null = null

let stopInjectBeautifyPrompt: (() => void) | null = null
let stopContentRender: (() => void) | null = null
let stopThemeSync: (() => void) | null = null

function mountApp(tavernDocument: Document) {
    tavernDocument.getElementById(APP_ROOT_ID)?.remove()

    const dialog = tavernDocument.createElement('dialog')
    appContainer = dialog
    dialog.id = APP_ROOT_ID
    dialog.className = 'ct-settings-dialog'
    dialog.setAttribute('aria-labelledby', 'ct-settings-title')
    tavernDocument.body.appendChild(dialog)
    appRoot = createRoot(dialog)
    appRoot.render(<App onClose={() => dialog?.close()} />)
    dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return
        const rect = dialog.getBoundingClientRect()
        if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
        )
            dialog.close()
    })

    menuButton = tavernDocument.createElement('button')
    menuButton.id = 'ct-theme-menu-button'
    menuButton.type = 'button'
    menuButton.className = 'list-group-item ct-menu-button'
    menuButton.innerHTML =
        '<i class="fa-solid fa-palette extensionsMenuExtensionButton" aria-hidden="true"></i><span>正文美化</span>'
    menuButton.addEventListener('click', () => appContainer?.showModal())
    tavernDocument.getElementById('ct-theme-menu-button')?.remove()
    // 魔棒菜单由酒馆异步创建，出现后再挂入按钮。
    function attachMenu() {
        const menu = tavernDocument.getElementById('extensionsMenu')
        if (!menu || !menuButton) return
        menu.appendChild(menuButton)
        menuObserver?.disconnect()
    }
    menuObserver = new MutationObserver(attachMenu)
    menuObserver.observe(tavernDocument.body, { childList: true, subtree: true })
    attachMenu()
}

function initializePlugin() {
    const tavernDocument = window.parent.document

    tavernDocument.getElementById(STYLE_ID)?.remove()

    const style = tavernDocument.createElement('style')
    style.id = STYLE_ID
    style.textContent = pluginCss
    tavernDocument.head.appendChild(style)

    stopThemeSync = startThemeSync()

    // 注册魔棒入口，界面默认关闭
    mountApp(tavernDocument)

    // 启动正文渲染
    stopInjectBeautifyPrompt = injectContentPrompt()
    stopContentRender = startContentRender()

    toastr.success('正文美化插件已加载')
}

$(() => {
    try {
        initializePlugin()
    } catch (error) {
        console.error('[正文美化插件] 加载失败', error)
        toastr.error('正文美化插件加载失败')
    }
})

$(window).on('pagehide', () => {
    stopThemeSync?.()
    stopThemeSync = null

    stopContentRender?.()
    stopContentRender = null

    stopInjectBeautifyPrompt?.()
    stopInjectBeautifyPrompt = null

    appRoot?.unmount()
    appRoot = null

    menuObserver?.disconnect()
    menuObserver = null
    menuButton?.remove()
    menuButton = null
    delete window.parent.document.documentElement.dataset.ctTheme

    appContainer?.remove()
    appContainer = null

    window.parent.document.getElementById(STYLE_ID)?.remove()
})
