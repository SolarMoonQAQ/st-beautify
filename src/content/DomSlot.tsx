import { useLayoutEffect, useRef } from 'react'

type DomSlotProps = {
    node: Node
    returnTo: HTMLElement
}

/**
 * 把酒馆正则处理后的真实 DOM 节点移动到 React 布局中。
 * 不复制 HTML，因此图片、插件生成的节点和原有 class 都会保留。
 */
export default function DomSlot({ node, returnTo }: DomSlotProps) {
    const slotRef = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        const slot = slotRef.current

        if (!slot) return

        slot.appendChild(node)

        return () => {
            if (node.parentNode !== slot) return

            // returnTo 可以是离屏容器；始终归还原节点，保留其身份和事件。
            returnTo.appendChild(node)
        }
    }, [node, returnTo])

    return <div ref={slotRef} className="cx-dom-slot" />
}
