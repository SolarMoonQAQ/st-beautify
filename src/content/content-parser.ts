import type { ContentNode } from './content-model'

export const SEMANTIC_SELECTOR = '[data-ct-kind="dialogue"], [data-ct-kind="thought"]'

const SEMANTIC_TAG_PATTERN =
    /<(dialogue|thought)\s+speaker\s*=\s*"([^"]*)"\s*>([\s\S]*?)<\/\1\s*>/gi

function escapeAttribute(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

/** 原始消息仍保留 XML；此转换只存在于插件内部，不会注册到酒馆正则列表。 */
export function transformContentMarkup(markup: string) {
    return markup.replace(
        SEMANTIC_TAG_PATTERN,
        (_, kind: 'dialogue' | 'thought', speaker: string, content: string) =>
            `<div data-ct-kind="${kind}" data-ct-speaker="${escapeAttribute(speaker)}">${content}</div>`,
    )
}

export function parseContent(holder: HTMLElement): ContentNode[] {
    return Array.from(holder.childNodes).flatMap((node): ContentNode[] => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) return []

        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            const kind = element.dataset.ctKind

            if (kind === 'dialogue' || kind === 'thought') {
                return [parseSemanticElement(element, kind)]
            }

            if (element.querySelector(SEMANTIC_SELECTOR)) {
                return parseContent(element)
            }
        }

        return [createNativeDomNode(node)]
    })
}

function parseSemanticElement(element: HTMLElement, kind: 'dialogue' | 'thought'): ContentNode {
    return {
        kind,
        data: {
            speaker: element.dataset.ctSpeaker ?? '',
            content: element.textContent?.trim() ?? '',
        },
    }
}

function createNativeDomNode(node: Node): ContentNode {
    return {
        kind: 'native-dom',
        data: { node },
    }
}
