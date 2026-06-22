import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrandLogo } from './ui/BrandLogo'

interface SplashScreenProps {
  onDone: () => void
  duration?: number
}

export function SplashScreen({ onDone, duration = 2200 }: SplashScreenProps): JSX.Element {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 600)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDone])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream dark:bg-love-dark"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 animate-pulse-soft rounded-full bg-primary-500/20 blur-2xl" />
            <BrandLogo className="relative h-24 w-24 drop-shadow-glow" />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 font-display text-4xl font-bold tracking-tight text-gradient"
          >
            MoneyLove
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-2 text-sm text-gray-500 dark:text-gray-400"
          >
            Le tue finanze, con amore
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
