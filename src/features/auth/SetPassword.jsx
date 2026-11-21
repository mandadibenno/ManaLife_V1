import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Logo } from '../../ui/Logo'
import { Button } from '../../ui/Button'
import { Field, Input } from '../../ui/Form'
import { useToast } from '../../ui/Toast'
import { setNewPassword } from '../../services/profile'
import { useAuth } from '../../hooks/auth'

/** Shown after opening a password-reset email link (Supabase PASSWORD_RECOVERY event). */
export default function SetPassword() {
  const { clearRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function submit(e) {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError("Passwords don't match.")
    setBusy(true)
    try {
      await setNewPassword(password)
      toast.success('Password updated')
      clearRecovery()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="full-center">
      <div className="auth-card auth-card-solo">
        <Logo size={38} />
        <h2 className="auth-title">Choose a new password</h2>
        <form className="form" onSubmit={submit}>
          <Field label="New password" error={error}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
          </Field>
          <Field label="Confirm password">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Field>
          <Button type="submit" size="lg" full loading={busy} icon={KeyRound}>
            Save password
          </Button>
        </form>
      </div>
    </div>
  )
}
