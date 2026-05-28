const variants = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
  indigo: 'bg-indigo-100 text-indigo-800',
}

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${variants[variant] || variants.default}
        ${sizes[size] || sizes.md}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${variants[variant]?.split(' ')[0] || 'bg-gray-400'}`} />
      )}
      {children}
    </span>
  )
}

export function StatusBadge({ status, className = '' }) {
  const map = {
    pending: { label: 'Pending', variant: 'warning' },
    confirmed: { label: 'Confirmed', variant: 'info' },
    processing: { label: 'Processing', variant: 'info' },
    shipped: { label: 'Shipped', variant: 'purple' },
    delivered: { label: 'Delivered', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'danger' },
    refunded: { label: 'Refunded', variant: 'danger' },
    paid: { label: 'Paid', variant: 'success' },
    unpaid: { label: 'Unpaid', variant: 'warning' },
    active: { label: 'Active', variant: 'success' },
    inactive: { label: 'Inactive', variant: 'default' },
  }
  const s = map[status] || { label: status, variant: 'default' }
  return <Badge variant={s.variant} dot className={className}>{s.label}</Badge>
}
