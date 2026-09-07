import type { ContentNode } from './content-model'

export const SEMANTIC_SELECTOR = '[data-ct-kind="dialogue"], [data-ct-kind="thought"]'

export const CONTENT_SELECTOR = '[data-ct-content]'

const RAW_SEMANTIC_PATTERN =
    /(?:<p>\s*)?<(dialogue|thought)\s+speaker\s*=\s*"([^"]*)"\s*>([\s\S]*?)<\/\1\s*>(?:\s*<\/p>)?/gi
const ESCAPED_SEMANTIC_PATTERN =
    /(?:<p>\s*)?&lt;(dialogue|thought)\s+speaker\s*=\s*&quot;([\s\S]*?)&quot;\s*&gt;([\s\S]*?)&lt;\/\1\s*&gt;(?:\s*<\/p>)?/gi
const RAW_CONTENT_OPEN_PATTERN = /(?:<p>\s*)?<content\b[^>]*>(?:\s*<\/p>)?/gi
const RAW_CONTENT_CLOSE_PATTERN = /(?:<p>\s*)?<\/content\s*>(?:\s*<\/p>)?/gi
const ESCAPED_CONTENT_OPEN_PATTERN = /(?:<p>\s*)?&lt;content\b[^&]*&gt;(?:\s*<\/p>)?/gi
const ESCAPED_CONTENT_CLOSE_PATTERN = /(?:<p>\s*)?&lt;\/content\s*&gt;(?:\s*<\/p>)?/gi

function escapeAttribute(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function replaceSemanticBlocks(markup: string, pattern: RegExp) {
    return markup.replace(
        pattern,
        (_, kind: 'dialogue' | 'thought', speaker: string, content: string) =>
            `<div data-ct-kind="${kind}" data-ct-speaker="${escapeAttribute(speaker)}">${content}</div>`,
    )
}

/** 酒馆完成 Markdown 后调用的内部转换，不会出现在酒馆正则列表中。 */
export function transformContentMarkup(markup: string) {
    const withSemanticBlocks = replaceSemanticBlocks(
        replaceSemanticBlocks(markup, RAW_SEMANTIC_PATTERN),
        ESCAPED_SEMANTIC_PATTERN,
    )

    return withSemanticBlocks
        .replace(RAW_CONTENT_OPEN_PATTERN, '<div data-ct-content>')
        .replace(ESCAPED_CONTENT_OPEN_PATTERN, '<div data-ct-content>')
        .replace(RAW_CONTENT_CLOSE_PATTERN, '</div>')
        .replace(ESCAPED_CONTENT_CLOSE_PATTERN, '</div>')
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
