import { parseContent } from '@/content/content-parser.ts'
import type { ContentNode } from '@/content/content-model.ts'
import Content from '@/content/Content.tsx'
import { createRoot } from 'react-dom/client'

type RenderState = {
    mount: HTMLElement
    stop: () => void
}

export const CONTENT_TAG_NAME = 'content'

const MESSAGE_SELECTOR = '.mes_text'
const DEBUG_PREFIX = '[st-content-beautify]'
const renderStates = new Map<HTMLElement, RenderState>()

function getMessageId(messageElement: HTMLElement) {
    return messageElement.closest('.mes')?.getAttribute('mesid') ?? 'unknown'
}

function logDebug(messageElement: HTMLElement, stage: string, value: unknown) {
    console.log(`${DEBUG_PREFIX} ${stage} (mes ${getMessageId(messageElement)})`, value)
}

function describeDomNode(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        return {
            nodeName: element.nodeName,
            localName: element.localName,
            attributes: Object.fromEntries(
                Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]),
            ),
            html: element.outerHTML,
        }
    }

    return {
        nodeType: node.nodeType,
        text: node.textContent,
    }
}

function describeContentNode(node: ContentNode) {
    if (node.kind === 'native-dom') {
        return {
            kind: node.kind,
            dom: describeDomNode(node.data.node),
        }
    }

    return node
}

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
    logDebug(messageElement, 'raw chat message', raw)

    const content = /<content\b[^>]*>([\s\S]*?)<\/content\s*>/i.exec(raw)?.[1]
    logDebug(messageElement, 'extracted <content>', content ?? null)

    return content === undefined ? null : { messageId, content }
}

function getFormattedNodes(
    text: string,
    messageId: number,
    ownerDocument: Document,
    messageElement: HTMLElement,
) {
    const formattedHtml = formatAsDisplayedMessage(text, { message_id: messageId })
    logDebug(messageElement, 'formatted <content> HTML', formattedHtml)

    const holder = ownerDocument.createElement('div')
    holder.innerHTML = formattedHtml

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

type ContentRange = {
    originalNodes: ChildNode[]
    expectedNodes: Node[]
    matchedNodes: Node[]
}

const SEMANTIC_TAG_PATTERN = /<(dialogue|thought)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi
const SPEAKER_ATTRIBUTE_PATTERN = /speaker\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
const SEMANTIC_KIND_SELECTOR = '[data-ct-kind]'

function escapeAttributeValue(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function decodeAttributeValue(value: string) {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
}

function readSpeakerAttribute(attributes: string) {
    const match = SPEAKER_ATTRIBUTE_PATTERN.exec(attributes)
    const value = match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
    return decodeAttributeValue(value)
}

/**
 * 酒馆的 formatAsDisplayedMessage 会丢弃 <dialogue>/<thought> 元素本身，
 * 只保留内部文本并把引号段改写成 <q>。因此在格式化前先把语义编码成
 * 带 data-ct-* 的 span，格式化后再还原成真实标签供 parseContent 识别。
 */
function encodeSemanticTags(html: string) {
    return html.replace(
        SEMANTIC_TAG_PATTERN,
        (_, kind: string, attributes: string, inner: string) => {
            const speaker = readSpeakerAttribute(attributes)
            return (
                `<span data-ct-kind="${escapeAttributeValue(kind)}" ` +
                `data-ct-speaker="${escapeAttributeValue(speaker)}">${inner}</span>`
            )
        },
    )
}

function restoreSemanticElement(marker: Element, ownerDocument: Document) {
    const kind = marker.getAttribute('data-ct-kind')

    if (kind !== 'dialogue' && kind !== 'thought') return null

    const restored = ownerDocument.createElement(kind)
    restored.setAttribute('speaker', marker.getAttribute('data-ct-speaker') ?? '')
    restored.textContent = marker.textContent ?? ''
    return restored
}

/**
 * 把格式化后的期望节点还原为真实 DOM。整段都是对话/思考时直接重建标签节点；
 * 只有内部嵌套标签时克隆节点并把其中的编码 span 替换为真实标签。
 */
function decodeExpectedNode(node: Node, ownerDocument: Document): Node {
    if (node.nodeType !== Node.ELEMENT_NODE) return node

    const element = node as Element
    const restored = restoreSemanticElement(element, ownerDocument)

    if (restored) return restored

    const clone = element.cloneNode(true) as Element

    for (const marker of Array.from(clone.querySelectorAll(SEMANTIC_KIND_SELECTOR))) {
        const nested = restoreSemanticElement(marker, ownerDocument)
        if (nested) marker.replaceWith(nested)
    }

    return clone
}

function buildContentHost(range: ContentRange, ownerDocument: Document) {
    const contentHost = ownerDocument.createElement('div')

    range.expectedNodes.forEach((expectedNode, index) => {
        const hasSemanticMarker =
            expectedNode.nodeType === Node.ELEMENT_NODE &&
            ((expectedNode as Element).hasAttribute('data-ct-kind') ||
                Boolean((expectedNode as Element).querySelector(SEMANTIC_KIND_SELECTOR)))

        if (hasSemanticMarker) {
            contentHost.appendChild(decodeExpectedNode(expectedNode, ownerDocument))
        } else {
            contentHost.appendChild(range.matchedNodes[index])
        }
    })

    return contentHost
}

/**
 * 酒馆把 <content> 当作行内标签，会在第一个段落末尾隐式闭合它。
 * 因此用原始消息中的正文先编码语义标签、再单独走一次酒馆格式化，
 * 然后与现场顶层节点按文本顺序配对，得到真正属于正文的连续 DOM 区间。
 */
function resolveContentRange(messageElement: HTMLElement): ContentRange | null {
    const rawContent = getRawContent(messageElement)
    const marker = messageElement.querySelector(CONTENT_TAG_NAME)
    logDebug(messageElement, 'live .mes_text before range matching', messageElement.innerHTML)

    if (!rawContent || !marker) {
        logDebug(messageElement, 'range matching failed', {
            hasRawContent: Boolean(rawContent),
            hasContentMarker: Boolean(marker),
        })
        return null
    }

    const encodedContent = encodeSemanticTags(rawContent.content)
    logDebug(messageElement, 'encoded <content> HTML', encodedContent)

    const expected = getFormattedNodes(
        encodedContent,
        rawContent.messageId,
        messageElement.ownerDocument,
        messageElement,
    )
    logDebug(messageElement, 'formatted top-level nodes', expected.map(describeDomNode))
    if (!expected.length) return null

    // 标记来自当前消息，因此可以沿父节点找到消息的直接子节点。
    let start: Node = marker
    while (start.parentNode !== messageElement) start = start.parentNode!

    const live = Array.from(messageElement.childNodes)
    const startIndex = live.indexOf(start as ChildNode)
    const matched: Node[] = []
    let cursor = startIndex

    for (const node of expected) {
        while (
            cursor < live.length &&
            (!isMeaningfulNode(live[cursor]) || !nodesMatch(node, live[cursor]))
        )
            cursor++

        // 正文尚未完整显示或匹配失败时，保留酒馆原来的显示。
        if (cursor === live.length) {
            logDebug(messageElement, 'range matching stopped', {
                expectedNode: describeDomNode(node),
                cursor,
                startIndex,
                liveNodes: live.map(describeDomNode),
            })
            return null
        }
        matched.push(live[cursor])
        cursor++
    }

    const originalNodes = live.slice(startIndex, cursor)
    logDebug(messageElement, 'selected live top-level nodes', originalNodes.map(describeDomNode))

    return { originalNodes, expectedNodes: expected, matchedNodes: matched }
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

    logDebug(messageElement, 'content host before parsing', contentHost.innerHTML)

    const restoreLeadingBreaks = hideLeadingContentBreaks(contentHost)
    const root = createRoot(mount)
    const parsedNodes = parseContent(contentHost)

    logDebug(messageElement, 'parsed content nodes', parsedNodes.map(describeContentNode))
    root.render(<Content nodes={parsedNodes} contentHost={contentHost} />)

    const stop = () => {
        root.unmount()
        restoreLeadingBreaks()

        if (messageElement.isConnected && mount.parentElement === messageElement) {
            mount.replaceWith(...range.originalNodes)
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
