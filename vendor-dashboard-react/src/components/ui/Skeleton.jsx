export default function Skeleton({ className = '', variant = 'text' }) {
  const variants = {
    text: 'h-4 w-full',
    title: 'h-6 w-48',
    avatar: 'h-12 w-12 rounded-full',
    thumbnail: 'h-20 w-20 rounded-xl',
    card: 'h-32 w-full rounded-2xl',
    chart: 'h-64 w-full rounded-2xl',
    badge: 'h-6 w-20 rounded-full',
    button: 'h-10 w-32 rounded-xl',
  }

  return (
    <div
      className={`
        bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200
        bg-[length:200%_100%] animate-shimmer rounded-lg
        ${variants[variant] || variants.text}
        ${className}
      `}
      aria-hidden="true"
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="title" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
      <div className="flex gap-8">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-8">
          {[1, 2, 3, 4].map(j => <Skeleton key={j} className="h-4 flex-1" />)}
        </div>
      ))}
    </div>
  )
}
