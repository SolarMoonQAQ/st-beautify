type ThoughtProps = { speaker: string; content: string }

export default function Thought({ speaker, content }: ThoughtProps) {
    return (
        <aside className="ct-thought" aria-label={`${speaker}的心声`}>
            <div className="ct-thought-heading">
                <span>{speaker}</span>
                <span className="ct-thought-label">心声</span>
            </div>
            <div className="ct-thought-content">{content}</div>
        </aside>
    )
}
