import { type CSSProperties } from 'react'
import { cn } from '@/shared/lib/utils.ts'

export type SealProps = {
    text?: string
    variant?: 'inline' | 'square'
    relief?: 'yin' | 'yang'
    size?: number
    rotation?: number
    fontSize?: number
    backgroundOpacity?: number
    className?: string
}

export default function Seal({
    text = '印',
    variant = 'inline',
    relief = 'yin',
    size = 56,
    rotation = -2,
    fontSize,
    backgroundOpacity,
    className,
}: SealProps) {
    const isSquare = variant === 'square'
    const isYang = relief === 'yang'
    const characters = Array.from(text).slice(0, 4)
    const resolvedBackgroundOpacity = Math.min(
        1,
        Math.max(0, backgroundOpacity ?? (isYang ? 0.85 : 1)),
    )

    const style: CSSProperties = {
        width: isSquare ? size : undefined,
        height: isSquare ? size : undefined,
        rotate: `${rotation}deg`,
        fontSize: isSquare ? (fontSize ?? size * 0.28) : undefined,
        fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
        backgroundColor: isYang
            ? `rgb(255 248 237 / ${resolvedBackgroundOpacity})`
            : `rgb(158 42 43 / ${resolvedBackgroundOpacity})`,
    }

    return (
        <div
            className={cn(
                'relative items-center justify-center select-none',
                'font-serif font-bold leading-none',
                'border',
                isYang
                    ? cn(
                          'text-[#9e2a2b] border-[#9e2a2b]',
                          'shadow-[0_0_0_1px_rgba(158,42,43,0.2)]',
                      )
                    : cn('text-red-50 border-[#7f1d1d]', 'shadow-[0_0_0_1px_rgba(158,42,43,0.3)]'),
                'rounded-xs align-baseline',
                isSquare
                    ? cn(
                          'inline-grid grid-cols-2 grid-rows-2 place-items-center p-1',
                          'after:pointer-events-none after:absolute after:inset-[3px]',
                          'after:rounded-[1px] after:border',
                          isYang
                              ? cn(
                                    'after:border-[rgba(158,42,43,0.55)]',
                                    'after:shadow-[inset_0_0_0_1px_rgba(158,42,43,0.12)]',
                                )
                              : cn(
                                    'after:border-red-100/45',
                                    'after:shadow-[inset_0_0_0_1px_rgba(127,29,29,0.18)]',
                                ),
                      )
                    : 'inline-flex text-xs px-1 py-0.5 mr-1.5 tracking-tight',
                className,
            )}
            data-relief={relief}
            style={style}
        >
            {isSquare
                ? characters.map((character, index) => (
                      <span
                          key={`${character}-${index}`}
                          className="relative z-10 flex items-center justify-center"
                      >
                          {character}
                      </span>
                  ))
                : text}
        </div>
    )
}
