import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Content from '@/content/Content.tsx'
import { parseContent, transformContentMarkup } from '@/content/content-parser.ts'
import './style/index.css'
import App from '@/App.tsx'
import '@/shared/i18n.ts'
import { applyTechColor, applyTheme, readTechColor, readTheme } from '@/theme'

applyTheme(readTheme())
applyTechColor(readTechColor())

const PREVIEW_TEXT = `
<p>暮色沿着长街铺开，远处的灯火逐一点亮。她停下脚步，回头望向身后的来路。</p>
<dialogue speaker="药芷若">你也察觉到了吗？那道光，似乎一直在跟着我们。但原神真的很好玩，我648抽到了钟离和小乔史诗皮肤。</dialogue>
<thought speaker="药芷若">不是错觉。空气里还有一丝未散尽的波动……但现在，还不能让他知道。</thought>
<p>风从巷口穿过，带起衣角。两人对视片刻，继续向灯火深处走去。</p>
`

function createPreviewContentHost(text: string): HTMLElement {
    const host = document.createElement('div')
    host.innerHTML = transformContentMarkup(text)
    return host
}

export default function Preview() {
    const [contentHost] = useState(() => {
        return createPreviewContentHost(PREVIEW_TEXT)
    })

    const nodes = parseContent(contentHost)

    return (
        <div style={{ maxWidth: 760, margin: '40px auto', padding: 16 }}>
            <Content nodes={nodes} contentHost={contentHost} />
            <div style={{ maxWidth: 360, margin: '24px auto' }}>
                <App />
            </div>
        </div>
    )
}

const container = document.getElementById('root')

if (container) {
    createRoot(container).render(<Preview />)
}
