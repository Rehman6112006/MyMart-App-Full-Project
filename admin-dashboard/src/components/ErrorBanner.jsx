import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'

export default function ErrorBanner({ error, onDismiss }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          {onDismiss && (
            <button onClick={onDismiss} className="p-1 hover:bg-red-100 rounded-lg transition-colors" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
