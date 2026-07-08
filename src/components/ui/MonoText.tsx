import clsx from 'clsx'

interface MonoTextProps {
  children: React.ReactNode
  className?: string
  truncate?: boolean
  copyable?: boolean
}

export default function MonoText({
  children,
  className,
  truncate = false,
}: MonoTextProps) {
  const text = typeof children === 'string' ? children : String(children)

  if (truncate && text.length > 20) {
    const shortened = `${text.slice(0, 8)}…${text.slice(-6)}`
    return (
      <span
        className={clsx('font-mono text-[#9AA6B2]', className)}
        title={text}
      >
        {shortened}
      </span>
    )
  }

  return (
    <span className={clsx('font-mono text-[#9AA6B2]', className)}>
      {children}
    </span>
  )
}
