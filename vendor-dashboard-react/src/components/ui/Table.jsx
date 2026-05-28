import { motion } from 'framer-motion'

export default function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto rounded-2xl shadow-card border border-gray-100 bg-white">
      <table className={`w-full text-sm ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function THead({ children }) {
  return (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-100">
        {children}
      </tr>
    </thead>
  )
}

export function Th({ children, className = '' }) {
  return (
    <th className={`text-left py-3.5 px-4 text-gray-500 font-medium text-xs uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

export function Td({ children, className = '' }) {
  return (
    <td className={`py-3.5 px-4 ${className}`}>
      {children}
    </td>
  )
}

export function TableRow({ children, onClick, index = 0, className = '' }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className={`
        border-b border-gray-50 hover:bg-emerald-50/30 transition-colors
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.tr>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="py-16 text-center">
      {Icon && <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />}
      <p className="text-gray-500 font-medium">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
