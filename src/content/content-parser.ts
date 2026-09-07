import type { ContentNode } from './content-model'

export function parseContent(holder: HTMLElement): ContentNode[] {
    return Array.from(holder.childNodes).flatMap((node): ContentNode[] => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
            return []
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement

            switch (element.localName) {
                case 'dialogue':
                    return [parseDialogue(element)]
                case 'thought':
                    return [parseThought(element)]
            }

            // 标签在容器内部时，继续处理内部内容
            if (element.querySelector('dialogue, thought')) {
                return parseContent(element)
            }
        }

        return [createNativeDomNode(node)]
    })
}

function parseDialogue(element: Element): ContentNode {
    return {
        kind: 'dialogue',
        data: {
            speaker: element.getAttribute('speaker') ?? '',
            content: element.textContent?.trim() ?? '',
        },
    }
}

function parseThought(element: Element): ContentNode {
    return {
        kind: 'thought',
        data: {
            speaker: element.getAttribute('speaker') ?? '',
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
