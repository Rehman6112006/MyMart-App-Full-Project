import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function Input({
  label,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        )}
        <input
          type={isPassword && showPassword ? 'text' : type}
          className={`
            w-full bg-white border rounded-xl text-gray-900 placeholder-gray-400
            outline-none transition-all text-sm
            ${Icon ? 'pl-12' : 'pl-4'}
            ${isPassword ? 'pr-12' : 'pr-4'}
            py-3.5
            ${error
              ? 'border-red-300 focus:ring-2 focus:ring-red-500/30 focus:border-red-500'
              : 'border-gray-200 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500'
            }
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.name}-error` : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${props.name}-error`} className="text-xs text-red-500 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
