import { useId, cloneElement, isValidElement, forwardRef } from 'react'
import { Search, X } from 'lucide-react'

/**
 * Label + control + hint/error, wired for accessibility.
 * - Form controls (Input/Select/Textarea/native) get id + aria-invalid/describedby and a real <label for>.
 * - Composite children (chips, pickers) get aria-labelledby instead of a dangling <label for>.
 * - Pass `id` when the control is nested inside a wrapper (e.g. password + show button).
 */
export function Field({ label, hint, error, children, className = '', optional, id: forId }) {
  const autoId = useId()
  const describedBy = error ? `${autoId}-err` : hint ? `${autoId}-hint` : undefined
  const isControl = isValidElement(children) && (CONTROLS.has(children.type) || ['input', 'select', 'textarea'].includes(children.type))
  const controlId = forId || (isControl ? children.props.id || autoId : undefined)
  const labelId = `${autoId}-label`
  let control = children
  if (isValidElement(children) && isControl) {
    control = cloneElement(children, { id: controlId, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })
  } else if (isValidElement(children) && !forId) {
    control = cloneElement(children, { 'aria-labelledby': label ? labelId : undefined, 'aria-describedby': describedBy })
  }
  const labelContent = (
    <>
      {label}
      {optional && <span className="field-optional">Optional</span>}
    </>
  )
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label &&
        (controlId ? (
          <label htmlFor={controlId} id={labelId} className="field-label">
            {labelContent}
          </label>
        ) : (
          <span id={labelId} className="field-label">
            {labelContent}
          </span>
        ))}
      {control}
      {error ? (
        <p id={`${autoId}-err`} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${autoId}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`input ${className}`} {...props} />
})

export const Textarea = forwardRef(function Textarea({ className = '', rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={`input textarea ${className}`} {...props} />
})

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <div className="select-wrap">
      <select ref={ref} className={`input select ${className}`} {...props}>
        {children}
      </select>
    </div>
  )
})

const CONTROLS = new Set([Input, Textarea, Select])

export function SearchInput({ value, onChange, placeholder = 'Search', className = '', ...rest }) {
  return (
    <div className={`search ${className}`}>
      <Search size={16} aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} {...rest} />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

/** Selectable chips (single or multi). */
export function ChipGroup({ options, value, onChange, multiple = false, label, size = 'md', ...aria }) {
  const isOn = (v) => (multiple ? value.includes(v) : value === v)
  const toggle = (v) => {
    if (!multiple) return onChange(v)
    onChange(isOn(v) ? value.filter((x) => x !== v) : [...value, v])
  }
  return (
    <div className={`chips chips-${size}`} role={multiple ? 'group' : 'radiogroup'} aria-label={aria['aria-labelledby'] ? undefined : label} {...aria}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o
        const Icon = opt.icon
        return (
          <button
            type="button"
            key={opt.value}
            className={`chip ${isOn(opt.value) ? 'is-on' : ''}`}
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={isOn(opt.value)}
            onClick={() => toggle(opt.value)}
          >
            {Icon && <Icon size={14} aria-hidden />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({ checked, onChange, label, description, disabled }) {
  const id = useId()
  return (
    <label className={`switch-row ${disabled ? 'is-disabled' : ''}`} htmlFor={id}>
      <span className="switch-text">
        <span className="switch-label">{label}</span>
        {description && <span className="switch-desc">{description}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" className="switch-input" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden>
        <span className="switch-thumb" />
      </span>
    </label>
  )
}

/** Tiny validation helper: rules = { field: (value, all) => errorString | '' } */
export function validate(values, rules) {
  const errors = {}
  for (const [k, rule] of Object.entries(rules)) {
    const msg = rule(values[k], values)
    if (msg) errors[k] = msg
  }
  return errors
}
