import { parseContent } from '@/content/content-parser.ts'
import Content from '@/content/Content.tsx'
import { createRoot } from 'react-dom/client'

type RenderState = {
    mount: HTMLElement
    stop: () => void
}

export const CONTENT_TAG_NAME = 'content'

const MESSAGE_SELECTOR = '.mes_text'
const renderStates = new Map<HTMLElement, RenderState>()

function hideLeadingContentBreaks(contentHost: HTMLElement) {
    const contentMarker = contentHost.querySelector(CONTENT_TAG_NAME)
    const snapshots: Array<{ element: HTMLElement; value: string; priority: string }> = []

    if (!contentMarker) return () => undefined

    for (const node of contentMarker.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue
        if (node.nodeType !== Node.ELEMENT_NODE || node.nodeName !== 'BR') break

        const element = node as HTMLElement
        snapshots.push({
            element,
            value: element.style.getPropertyValue('display'),
            priority: element.style.getPropertyPriority('display'),
        })
        element.style.setProperty('display', 'none', 'important')
    }

    return () => {
        snapshots.forEach(({ element, value, priority }) => {
            if (value) {
                element.style.setProperty('display', value, priority)
            } else {
                element.style.removeProperty('display')
            }
        })
    }
}

function isMeaningfulNode(node: Node) {
    return node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim())
}

function getRawContent(messageElement: HTMLElement) {
    const messageId = Number(messageElement.closest('.mes')?.getAttribute('mesid'))

    if (!Number.isInteger(messageId)) return null

    const raw = getChatMessages(messageId)[0]?.message ?? ''
    const content = /<content\b[^>]*>([\s\S]*?)<\/content\s*>/i.exec(raw)?.[1]
    return content === undefined ? null : { messageId, content }
}

function getFormattedNodes(text: string, messageId: number, ownerDocument: Document) {
    const holder = ownerDocument.createElement('div')
    holder.innerHTML = formatAsDisplayedMessage(text, { message_id: messageId })
    return Array.from(holder.childNodes).filter(isMeaningfulNode)
}

function normalizedText(node: Node) {
    return node.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

function nodesMatch(expected: Node, actual: Node) {
    const expectedText = normalizedText(expected)
    const actualText = normalizedText(actual)

    if (!expectedText || !actualText) return expected.nodeName === actual.nodeName
    return expectedText === actualText
}

/**
 * 酒馆把 <content> 当作行内标签，会在第一个段落末尾隐式闭合它。
 * 因此用原始消息中的正文单独走一次酒馆格式化，再与现场顶层节点匹配，
 * 得到真正属于正文的连续 DOM 区间。
 */
function resolveContentRange(messageElement: HTMLElement): ChildNode[] {
    const rawContent = getRawContent(messageElement)
    const marker = messageElement.querySelector(CONTENT_TAG_NAME)
    if (!rawContent || !marker) return []

    const expected = getFormattedNodes(
        rawContent.content,
        rawContent.messageId,
        messageElement.ownerDocument,
    )
    if (!expected.length) return []

    // 标记来自当前消息，因此可以沿父节点找到消息的直接子节点。
    let start: Node = marker
    while (start.parentNode !== messageElement) start = start.parentNode!

    const live = Array.from(messageElement.childNodes)
    const startIndex = live.indexOf(start as ChildNode)
    let cursor = startIndex

    for (const [index, node] of expected.entries()) {
        while (
            cursor < live.length &&
            (!isMeaningfulNode(live[cursor]) || !nodesMatch(node, live[cursor]))
        )
            cursor++

        // 正文尚未完整显示或匹配失败时，保留酒馆原来的显示。
        if (cursor === live.length || (index === 0 && cursor !== startIndex)) return []
        cursor++
    }

    return live.slice(startIndex, cursor)
}

function renderMessage(messageElement: HTMLElement) {
    const existing = renderStates.get(messageElement)

    if (existing?.mount.isConnected) return

    if (existing) {
        existing.stop()
        renderStates.delete(messageElement)
    }

    const originalNodes = resolveContentRange(messageElement)

    if (!originalNodes.length) return

    const ownerDocument = messageElement.ownerDocument
    const contentHost = ownerDocument.createElement('div')
    const mount = ownerDocument.createElement('div')

    messageElement.insertBefore(mount, originalNodes[0])
    originalNodes.forEach((node) => contentHost.appendChild(node))

    const restoreLeadingBreaks = hideLeadingContentBreaks(contentHost)
    const root = createRoot(mount)
    root.render(<Content nodes={parseContent(contentHost)} contentHost={contentHost} />)

    const stop = () => {
        root.unmount()
        restoreLeadingBreaks()

        if (messageElement.isConnected && mount.parentElement === messageElement) {
            mount.replaceWith(...originalNodes)
        }
    }

    renderStates.set(messageElement, { mount, stop })
}

// 初次加载和后续新增节点共用同一个扫描入口。
function renderMessagesMarkedInside(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const element = node as HTMLElement
    const markers = element.matches(CONTENT_TAG_NAME)
        ? [element]
        : Array.from(element.querySelectorAll(CONTENT_TAG_NAME))

    for (const marker of markers) {
        const message = marker.closest<HTMLElement>(MESSAGE_SELECTOR)
        if (message) renderMessage(message)
    }
}

export function startContentRender() {
    const tavernDocument = window.parent.document
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(renderMessagesMarkedInside)
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

    renderMessagesMarkedInside(tavernDocument.body)

    return () => {
        observer.disconnect()
        renderStates.forEach(({ stop }) => stop())
        renderStates.clear()
    }
}
