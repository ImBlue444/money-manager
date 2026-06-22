import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfettiPiece {
  id: number
  x: number
  color: string
  delay: number
  duration: number
  size: number
  rotation: number
}

interface ConfettiProps {
  active: boolean
  onDone?: () => void
}

const COLORS = ['#ff5e8a', '#a78bfa', '#34d399', '#ffb703', '#ff4d6d', '#60a5fa']

export function Confetti({ active, onDone }: ConfettiProps): JSX.Element {
  const [visible, setVisible] = useState(active)

  useEffect(() => {
    if (active) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        onDone?.()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [active, onDone])

  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.4,
      duration: 1.5 + Math.random() * 1,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360
    }))
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
          {pieces.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: `${p.x}vw`,
                y: -20,
                rotate: 0,
                opacity: 1
              }}
              animate={{
                y: '110vh',
                rotate: p.rotation,
                opacity: 0
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              style={{
                position: 'absolute',
                left: 0,
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
                borderRadius: 2
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
