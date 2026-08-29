"use client"
import { useRef, RefObject } from "react"
import { cn } from "@/lib/utils"

function parseSettings(s: string): Record<string, number> {
  const result: Record<string, number> = {}
  Array.from(s.matchAll(/'(\w+)'\s+([\d.]+)/g)).forEach((m) => {
    result[m[1]] = Number(m[2])
  })
  return result
}

interface Props {
  children: string
  className?: string
  containerRef?: RefObject<HTMLElement>
  fromFontVariationSettings?: string
  toFontVariationSettings?: string
  radius?: number
}

export function VariableFontCursorProximity({
  children,
  className,
  fromFontVariationSettings = "'wght' 100",
  toFontVariationSettings = "'wght' 900",
  radius = 100,
}: Props) {
  const charRefs = useRef<(HTMLSpanElement | null)[]>([])
  const from = parseSettings(fromFontVariationSettings)
  const to = parseSettings(toFontVariationSettings)

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  function handleMouseMove(e: React.MouseEvent) {
    charRefs.current.forEach((el) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))
      const t = Math.max(0, 1 - dist / radius)
      el.style.fontVariationSettings = Object.entries(from)
        .map(([axis, fv]) => `'${axis}' ${lerp(fv, to[axis] ?? fv, t).toFixed(1)}`)
        .join(", ")
    })
  }

  function handleMouseLeave() {
    charRefs.current.forEach((el) => {
      if (!el) return
      el.style.fontVariationSettings = fromFontVariationSettings
    })
  }

  return (
    <span className={cn("inline", className)} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {children.split("").map((ch, i) => (
        <span
          key={i}
          ref={(el) => { charRefs.current[i] = el }}
          style={{ fontVariationSettings: fromFontVariationSettings, display: "inline-block", transition: "font-variation-settings 0.1s ease-out" }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  )
}
