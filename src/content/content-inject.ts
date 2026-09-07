import prompt from '@/assets/prompts/content.yaml?raw'

const CONTENT_PROMPT_ID = 'sm-content-format'

const contentPrompt = {
    id: CONTENT_PROMPT_ID,
    position: 'in_chat' as const,
    depth: 0,
    role: 'system' as const,
    should_scan: false,
    content: prompt,
}

export function injectContentPrompt() {
    let uninject: (() => void) | null = null

    const installPrompt = () => {
        uninject?.()
        uninject = injectPrompts([contentPrompt]).uninject
    }

    installPrompt()

    const listeners = [eventOn(tavern_events.CHAT_CHANGED, installPrompt)]

    return () => {
        listeners.forEach((listener) => listener.stop())
        uninject?.()
        uninject = null
    }
}
