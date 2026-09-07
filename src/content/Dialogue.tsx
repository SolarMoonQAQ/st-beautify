import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar.tsx'
import { Separator } from '@base-ui/react'
import Seal from '@/shared/components/ui/Seal.tsx'

type DialogueProps = {
    speaker: string
    content: string
}

export default function Dialogue({ speaker, content }: DialogueProps) {
    const nameHead = speaker.charAt(0)
    const nameTail = speaker.slice(1)

    return (
        <div className="flex ct-dialogue">
            <Avatar className="h-(--ct-dialogue-header-height) w-(--ct-dialogue-header-height) shrink-0 ct-dialogue-avatar">
                <AvatarFallback>👤</AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-center shrink-0 ml-1.5!">
                <div className="flex items-center h-(--ct-dialogue-header-height)">
                    <span className="ct-dialogue-name-head">{nameHead}</span>
                </div>

                <Separator orientation="vertical" className="w-px! flex-1 ct-dialogue-line" />
            </div>

            <div className="flex flex-col flex-1">
                <div className="flex items-center h-(--ct-dialogue-header-height)">
                    <span className="ct-dialogue-name">{nameTail}</span>
                </div>

                <div>
                    <span>
                        <Seal text={nameHead} className="ct-seal"></Seal>
                    </span>
                    <span className="ct-dialogue-content">{content}</span>
                </div>
            </div>
        </div>
    )
}
