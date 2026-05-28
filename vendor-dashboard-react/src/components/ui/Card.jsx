import { motion } from 'framer-motion'

export default function Card({
  children,
  className = '',
  hover = false,
  padding = true,
  onClick,
  ...props
}) {
  const Component = onClick ? motion.button : motion.div
  return (
    <Component
      onClick={onClick}
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      className={`
        bg-white rounded-2xl shadow-card border border-gray-100
        ${hover ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : ''}
        ${padding ? 'p-6' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
