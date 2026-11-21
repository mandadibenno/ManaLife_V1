import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Button } from './Button'
import { Field, Input } from './Form'

const ConfirmContext = createContext(null)

/**
 * Promise-based confirmation dialog replacing window.confirm (unreliable in WebViews).
 * confirm({ title, body, confirmLabel, tone: 'danger', typeToConfirm })
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const [typed, setTyped] = useState('')
  const resolver = useRef(null)

  const confirm = useCallback((opts) => {
    setTyped('')
    setState({ confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'primary', ...opts })
    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const finish = (result) => {
    resolver.current?.(result)
    resolver.current = null
    setState(null)
  }

  const blocked = state?.typeToConfirm && typed.trim() !== state.typeToConfirm

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={!!state}
        onClose={() => finish(false)}
        title={state?.title}
        size="sm"
        initialFocus={!!state?.typeToConfirm}
        footer={
          <>
            <Button variant="secondary" onClick={() => finish(false)}>
              {state?.cancelLabel}
            </Button>
            <Button variant={state?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => finish(true)} disabled={blocked} data-autofocus={!state?.typeToConfirm || undefined}>
              {state?.confirmLabel}
            </Button>
          </>
        }
      >
        {state?.body && <div className="confirm-body">{state.body}</div>}
        {state?.typeToConfirm && (
          <Field label={`Type “${state.typeToConfirm}” to confirm`}>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
        )}
      </Sheet>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
