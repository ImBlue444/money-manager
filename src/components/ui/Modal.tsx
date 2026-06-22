import React, { useEffect, useRef } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { X } from 'lucide-react'

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps): JSX.Element | null {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      className={cn(
        'backdrop:bg-gray-900/50 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl p-0 w-full max-w-lg open:animate-in open:fade-in open:zoom-in-95',
        className
      )}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        {title ? <h3 className="text-lg font-semibold">{title}</h3> : <div />}
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  )
}
