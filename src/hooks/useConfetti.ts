import { useState, useCallback } from 'react'

export function useConfetti(timeout = 3000) {
  const [active, setActive] = useState(false)

  const trigger = useCallback(() => {
    setActive(true)
    setTimeout(() => {
      setActive(false)
    }, timeout)
  }, [timeout])

  return { active, trigger }
}
