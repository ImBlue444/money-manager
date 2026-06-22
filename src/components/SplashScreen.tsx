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
      setTimeout(onDone, 500)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDone])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream dark:bg-love-dark"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <BrandLogo className="h-16 w-16" />
          </motion.div>
          <motion.h1
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-4 font-display text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100"
          >
            MoneyLove
          </motion.h1>
          <motion.p
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-1 text-sm text-gray-500 dark:text-gray-400"
          >
            Le tue finanze, con amore
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
