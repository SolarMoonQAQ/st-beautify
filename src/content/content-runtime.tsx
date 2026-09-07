import {
    parseContent,
    SEMANTIC_SELECTOR,
    transformContentMarkup,
} from '@/content/content-parser.ts'
import Content from '@/content/Content.tsx'
import { createRoot } from 'react-dom/client'

type RenderState = {
    mount: HTMLElement
    stop: () => void
}

type ContentRange = {
    markerRoot: Node
    originalNodes: ChildNode[]
    replacements: Map<Node, Node>
}

export const CONTENT_TAG_NAME = 'content'

const MESSAGE_SELECTOR = '.mes_text'
const renderStates = new Map<HTMLElement, RenderState>()

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

    if (!expectedText || !actualText) {
        return expectedText === actualText && expected.nodeName === actual.nodeName
    }

    return expectedText === actualText
}

function containsSemanticBlock(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false

    const element = node as Element
    return element.matches(SEMANTIC_SELECTOR) || Boolean(element.querySelector(SEMANTIC_SELECTOR))
}

function buildContentHost(range: ContentRange, ownerDocument: Document) {
    const contentHost = ownerDocument.createElement('div')

    for (const node of range.originalNodes) {
        const replacement = range.replacements.get(node)

        if (replacement) {
            contentHost.appendChild(replacement)
        } else if (node !== range.markerRoot || normalizedText(node)) {
            contentHost.appendChild(node)
        }
    }

    return contentHost
}

/**
 * 酒馆会把未知的 <content> 当作行内标签并提前闭合。这里根据原始消息重新格式化正文，
 * 再与现场 DOM 按文本顺序配对，以确定由 React 接管的连续区域。
 */
function resolveContentRange(messageElement: HTMLElement): ContentRange | null {
    const rawContent = getRawContent(messageElement)
    const marker = messageElement.querySelector(CONTENT_TAG_NAME)

    if (!rawContent || !marker) return null

    const expectedNodes = getFormattedNodes(
        transformContentMarkup(rawContent.content),
        rawContent.messageId,
        messageElement.ownerDocument,
    )

    if (!expectedNodes.length) return null

    let markerRoot: Node = marker
    while (markerRoot.parentNode !== messageElement) markerRoot = markerRoot.parentNode!

    const liveNodes = Array.from(messageElement.childNodes)
    const startIndex = liveNodes.indexOf(markerRoot as ChildNode)

    if (startIndex < 0) return null

    const replacements = new Map<Node, Node>()
    let cursor = startIndex

    for (const expectedNode of expectedNodes) {
        while (
            cursor < liveNodes.length &&
            (!isMeaningfulNode(liveNodes[cursor]) || !nodesMatch(expectedNode, liveNodes[cursor]))
        ) {
            cursor++
        }

        if (cursor === liveNodes.length) return null

        if (containsSemanticBlock(expectedNode)) {
            replacements.set(liveNodes[cursor], expectedNode)
        }

        cursor++
    }

    return {
        markerRoot,
        originalNodes: liveNodes.slice(startIndex, cursor),
        replacements,
    }
}

function renderMessage(messageElement: HTMLElement) {
    const existing = renderStates.get(messageElement)

    if (existing?.mount.isConnected) return

    if (existing) {
        existing.stop()
        renderStates.delete(messageElement)
    }

    const range = resolveContentRange(messageElement)
    if (!range) return

    const ownerDocument = messageElement.ownerDocument
    const mount = ownerDocument.createElement('div')

    messageElement.insertBefore(mount, range.originalNodes[0])
    range.originalNodes.forEach((node) => node.remove())

    const contentHost = buildContentHost(range, ownerDocument)
    const root = createRoot(mount)

    root.render(<Content nodes={parseContent(contentHost)} contentHost={contentHost} />)

    const stop = () => {
        root.unmount()

        if (messageElement.isConnected && mount.parentElement === messageElement) {
            mount.replaceWith(...range.originalNodes)
        }
    }

    renderStates.set(messageElement, { mount, stop })
}

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
