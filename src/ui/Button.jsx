import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * variant: primary | secondary | ghost | soft | danger | danger-soft
 * size: sm | md | lg
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading = false, full = false, as: As, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  const cls = `btn btn-${variant} btn-${size} ${full ? 'btn-full' : ''} ${loading ? 'is-loading' : ''} ${className}`
  const content = (
    <>
      {loading ? <Loader2 className="btn-spin" size={size === 'sm' ? 15 : 17} aria-hidden /> : Icon && <Icon size={size === 'sm' ? 15 : 17} aria-hidden />}
      {children && <span>{children}</span>}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 15 : 17} aria-hidden />}
    </>
  )
  if (As) {
    // e.g. <Button as={Link} to="/x"> — keeps react-router out of the boot bundle.
    return (
      <As ref={ref} className={cls} {...rest}>
        {content}
      </As>
    )
  }
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  )
})

export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', className = '', badge, ...rest },
  ref,
) {
  return (
    <button ref={ref} type="button" className={`icon-btn icon-btn-${variant} icon-btn-${size} ${className}`} aria-label={label} title={label} {...rest}>
      <Icon size={size === 'sm' ? 16 : 19} aria-hidden />
      {badge ? <span className="icon-btn-badge">{badge > 9 ? '9+' : badge}</span> : null}
    </button>
  )
})
