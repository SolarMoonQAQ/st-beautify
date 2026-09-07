import { CONTENT_SELECTOR, parseContent, transformContentMarkup } from '@/content/content-parser.ts'
import Content from '@/content/Content.tsx'
import { createRoot } from 'react-dom/client'

type RenderState = {
    mount: HTMLElement
    stop: () => void
}

type FormattingContext = {
    isSystem: boolean
    isUser: boolean
    isReasoning: boolean
}

type MessageFormatter = {
    stage: { AFTER_MARKDOWN: string }
    order: { NORMAL: number }
    addHook: (
        hook: (message: string, context: FormattingContext) => string,
        options: { stage: string; order: number },
    ) => void
}

type FormattingHookState = {
    active: boolean
    transform: (message: string) => string
}

type TavernContext = {
    messageFormatter?: MessageFormatter
    reloadCurrentChat: () => Promise<void>
}

type TavernWindow = Window & {
    SillyTavern: {
        getContext: () => TavernContext
    }
    __contentBeautifyFormattingHook?: FormattingHookState
}

const MESSAGE_SELECTOR = '.mes_text'
const renderStates = new Map<HTMLElement, RenderState>()

function installFormattingHook() {
    const tavernWindow = window.parent as TavernWindow
    const context = tavernWindow.SillyTavern.getContext()
    const formatter = context.messageFormatter

    if (!formatter) {
        throw new Error('当前 SillyTavern 版本不支持 messageFormatter')
    }

    let state = tavernWindow.__contentBeautifyFormattingHook

    if (!state) {
        state = {
            active: true,
            transform: transformContentMarkup,
        }

        formatter.addHook(
            (message: string, formattingContext: FormattingContext) => {
                if (
                    !state!.active ||
                    formattingContext.isSystem ||
                    formattingContext.isUser ||
                    formattingContext.isReasoning
                ) {
                    return message
                }

                return state!.transform(message)
            },
            {
                stage: formatter.stage.AFTER_MARKDOWN,
                order: formatter.order.NORMAL,
            },
        )

        tavernWindow.__contentBeautifyFormattingHook = state
    }

    state.transform = transformContentMarkup
    state.active = true

    return {
        refresh: () => context.reloadCurrentChat(),
        stop: () => {
            state.active = false
        },
    }
}

function renderMessage(messageElement: HTMLElement) {
    const existing = renderStates.get(messageElement)

    if (existing?.mount.isConnected) return

    if (existing) {
        existing.stop()
        renderStates.delete(messageElement)
    }

    const contentHost = messageElement.querySelector<HTMLElement>(CONTENT_SELECTOR)
    if (!contentHost) return

    const mount = messageElement.ownerDocument.createElement('div')
    contentHost.replaceWith(mount)

    const root = createRoot(mount)
    root.render(<Content nodes={parseContent(contentHost)} contentHost={contentHost} />)

    const stop = () => {
        root.unmount()

        if (messageElement.isConnected && mount.parentElement) {
            mount.replaceWith(contentHost)
        }
    }

    renderStates.set(messageElement, { mount, stop })
}

function renderMessagesInside(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const element = node as HTMLElement
    const contentBlocks = element.matches(CONTENT_SELECTOR)
        ? [element]
        : Array.from(element.querySelectorAll<HTMLElement>(CONTENT_SELECTOR))

    for (const contentBlock of contentBlocks) {
        const message = contentBlock.closest<HTMLElement>(MESSAGE_SELECTOR)
        if (message) renderMessage(message)
    }
}

export function startContentRender() {
    const formattingHook = installFormattingHook()
    const tavernDocument = window.parent.document
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(renderMessagesInside)
        }

        for (const [message, state] of renderStates) {
            if (message.isConnected && state.mount.isConnected) continue
            state.stop()
            renderStates.delete(message)
        }
    })

    observer.observe(tavernDocument.body, {
        childList: true,
        subtree: true,
    })

    renderMessagesInside(tavernDocument.body)
    void formattingHook.refresh()

    return () => {
        observer.disconnect()
        formattingHook.stop()
        renderStates.forEach(({ stop }) => stop())
        renderStates.clear()
    }
}
