import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  children,
  size = 'md',
  showClose = true,
}) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`bg-white rounded-2xl shadow-modal w-full ${sizes[size] || sizes.md} overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {title && (
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="p-2 rounded-xl bg-brand-50">
                      <Icon className="w-5 h-5 text-brand-600" />
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                </div>
                {showClose && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
