import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react'
import { Showcase } from './Showcase'
import { Logo } from '../../ui/Logo'
import { Button } from '../../ui/Button'
import { Field, Input, validate } from '../../ui/Form'
import { Segmented } from '../../ui/Display'
import { useToast } from '../../ui/Toast'
import { sendPasswordReset, signIn, signUp } from '../../services/profile'
import { ease } from '../../motion'

const emailRule = (v) => (!v?.trim() ? 'Enter your email' : !/^\S+@\S+\.\S+$/.test(v.trim()) ? 'Enter a valid email address' : '')

export default function AuthScreen() {
  const [mode, setMode] = useState('login') // login | register | reset
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)
  const [sent, setSent] = useState('')
  const toast = useToast()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const rules = { email: emailRule }
    if (mode !== 'reset') rules.password = (v) => (!v ? 'Enter your password' : mode === 'register' && v.length < 8 ? 'Use at least 8 characters' : '')
    if (mode === 'register') rules.name = (v) => (!v?.trim() ? 'Tell us what to call you' : '')
    const errs = validate(form, rules)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      if (mode === 'login') await signIn(form.email, form.password)
      else if (mode === 'register') {
        const data = await signUp(form.email, form.password, form.name)
        if (!data.session) setSent(`We sent a confirmation link to ${form.email.trim()}. Open it, then sign in.`)
      } else {
        await sendPasswordReset(form.email)
        setSent(`If ${form.email.trim()} has an account, a reset link is on its way.`)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const heading = { login: 'Welcome back', register: 'Create your space', reset: 'Reset your password' }[mode]
  const sub = {
    login: 'Sign in to pick up where you left off.',
    register: 'Start with your own private space. Invite people whenever you like.',
    reset: "Enter your email and we'll send you a reset link.",
  }[mode]

  return (
    <div className="auth">
      <Showcase />
      <main className="auth-main">
        <m.div className="auth-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <div className="auth-mobile-logo">
            <Logo size={38} tagline />
          </div>
          {mode !== 'reset' && (
            <Segmented
              layoutId="auth-tab"
              label="Sign in or create account"
              value={mode}
              onChange={(v) => {
                setMode(v)
                setErrors({})
                setSent('')
              }}
              options={[
                { value: 'login', label: 'Sign in' },
                { value: 'register', label: 'Create account' },
              ]}
            />
          )}
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={mode} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
              <h2 className="auth-title">{heading}</h2>
              <p className="auth-sub">{sub}</p>
              {sent ? (
                <div className="notice notice-accent" role="status">
                  <Mail size={18} />
                  <span>{sent}</span>
                </div>
              ) : (
                <form className="form" onSubmit={submit} noValidate>
                  {mode === 'register' && (
                    <Field label="Your name" error={errors.name}>
                      <Input value={form.name} onChange={set('name')} autoComplete="name" maxLength={70} placeholder="First name" />
                    </Field>
                  )}
                  <Field label="Email" error={errors.email}>
                    <Input type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" />
                  </Field>
                  {mode !== 'reset' && (
                    <Field label="Password" id="auth-password" error={errors.password} hint={mode === 'register' ? 'At least 8 characters' : undefined}>
                      <div className="pw">
                        <Input id="auth-password" aria-invalid={errors.password ? true : undefined} type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                        <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                          {show ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </Field>
                  )}
                  <Button type="submit" size="lg" full loading={busy} iconRight={ArrowRight}>
                    {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
                  </Button>
                </form>
              )}
              <div className="auth-links">
                {mode === 'login' && (
                  <button type="button" className="link" onClick={() => setMode('reset')}>
                    <KeyRound size={14} /> Forgot password?
                  </button>
                )}
                {(mode === 'reset' || sent) && (
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setMode('login')
                      setSent('')
                    }}
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            </m.div>
          </AnimatePresence>
          <p className="auth-foot">
            <Lock size={13} /> Your personal space is private. Shared spaces are visible only to the members you admit.
          </p>
        </m.div>
      </main>
    </div>
  )
}
