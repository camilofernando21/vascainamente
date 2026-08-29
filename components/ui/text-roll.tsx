"use client"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

const STAGGER = 0.035
const NBSP = " "

export default function TextRoll({
  children,
  className,
  center = false,
}: {
  children: string
  className?: string
  center?: boolean
}) {
  return (
    <motion.span
      initial="initial"
      whileHover="hovered"
      className={cn("relative block overflow-hidden cursor-pointer", className)}
      style={{ lineHeight: 0.85 }}
    >
      <div>
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i
          return (
            <motion.span
              variants={{ initial: { y: 0 }, hovered: { y: "-100%" } }}
              transition={{ ease: "easeInOut", delay }}
              className="inline-block"
              key={i}
            >
              {l === " " ? NBSP : l}
            </motion.span>
          )
        })}
      </div>
      <div className="absolute inset-0">
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i
          return (
            <motion.span
              variants={{ initial: { y: "100%" }, hovered: { y: 0 } }}
              transition={{ ease: "easeInOut", delay }}
              className="inline-block"
              key={i}
            >
              {l === " " ? NBSP : l}
            </motion.span>
          )
        })}
      </div>
    </motion.span>
  )
}
