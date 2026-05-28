import { motion } from 'framer-motion'

export default function Toggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2
        ${checked ? 'bg-brand-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <motion.span
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`
          pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg ring-0
        `}
      />
    </button>
  )
}
