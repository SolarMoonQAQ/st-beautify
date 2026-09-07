import type { ContentNode } from './content-model.ts'
import { Fragment, type ReactNode } from 'react'
import Dialogue from '@/content/Dialogue.tsx'
import Thought from '@/content/Thought.tsx'
import DomSlot from '@/content/DomSlot.tsx'

type RenderContext = {
    contentHost: HTMLElement
}

function assertNever(value: never): never {
    throw new Error(`未知内容类型: ${JSON.stringify(value)}`)
}

function renderContent(node: ContentNode, { contentHost }: RenderContext): ReactNode {
    switch (node.kind) {
        case 'thought':
            return <Thought {...node.data} />
        case 'dialogue':
            return <Dialogue {...node.data} />

        case 'native-dom':
            return (
                <div className="ct-narration">
                    <DomSlot node={node.data.node} returnTo={contentHost} />
                </div>
            )

        default:
            return assertNever(node)
    }
}

type ContentRendererProps = {
    nodes: ContentNode[]
    contentHost: HTMLElement
}

export default function Content({ nodes, contentHost }: ContentRendererProps) {
    return (
        <div className="ct-bg">
            {nodes.map((node, index) => (
                <Fragment key={index}>{renderContent(node, { contentHost })}</Fragment>
            ))}
        </div>
    )
}
