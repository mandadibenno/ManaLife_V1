import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Lock } from 'lucide-react'
import { useWorkspace } from '../../hooks/workspace'
import { useAuth } from '../../hooks/auth'
import { useToast } from '../../ui/Toast'
import { Page, PageHeader } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Card, SpaceIcon } from '../../ui/Display'
import { Field, Input } from '../../ui/Form'
import { SHARED_TYPE_KEYS, SPACE_TYPES } from '../../config/spaceTypes'
import { createSpace } from '../../services/spaces'
import { AccentPicker, IconPicker, ModulePicker } from './SpacePickers'
import { ease } from '../../motion'

const PLACEHOLDER = { couple: 'e.g. Alex & Sam', family: 'e.g. The Rao Home', friends: 'e.g. Goa Trip Crew', office: 'e.g. Design Team', custom: 'e.g. Book Club' }
const STEPS = ['Type', 'Name & look', 'Features']

export default function CreateSpace() {
  const ws = useWorkspace()
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [form, setForm] = useState(() => preset('family'))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const types = SHARED_TYPE_KEYS.filter((t) => ws.v2 || t !== 'couple')

  function preset(type) {
    const def = SPACE_TYPES[type]
    return { type, name: '', icon: def.icon, accent: def.accent, enabled: [...def.modules], cards: [...def.widgets] }
  }

  const go = (n) => {
    setDir(n > step ? 1 : -1)
    setError('')
    setStep(n)
  }

  async function create() {
    if (!form.name.trim()) {
      go(1)
      return setError('Give your space a name')
    }
    if (!form.enabled.length) return setError('Choose at least one feature')
    setBusy(true)
    try {
      const id = await createSpace(form, { v2: ws.v2 })
      await qc.invalidateQueries({ queryKey: ['spaces', user.id] })
      await qc.refetchQueries({ queryKey: ['spaces', user.id] })
      toast.success(`${form.name.trim()} is ready. Invite your people!`)
      navigate(`/space/${id}/settings#invite`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page className="page-narrow">
      <PageHeader eyebrow="New shared space" title="Create a space" description="A place for the people you share life with. You can change everything later." />
      <div className="stepper" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <button key={s} type="button" className={`step ${i === step ? 'is-current' : ''} ${i < step ? 'is-done' : ''}`} onClick={() => i < step && go(i)} disabled={i > step}>
            <span className="step-dot">{i < step ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
            <span className="step-label">{s}</span>
          </button>
        ))}
      </div>

      <Card className="wizard">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <m.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0, transition: { duration: 0.28, ease } }} exit={{ opacity: 0, x: dir * -24, transition: { duration: 0.14 } }}>
            {step === 0 && (
              <div className="type-grid" role="radiogroup" aria-label="Space type">
                {types.map((t) => {
                  const def = SPACE_TYPES[t]
                  const on = form.type === t
                  return (
                    <button key={t} type="button" role="radio" aria-checked={on} className={`type-card ${on ? 'is-on' : ''}`} onClick={() => setForm((f) => ({ ...preset(t), name: f.name }))}>
                      <SpaceIcon icon={def.icon} accent={def.accent} size={44} />
                      <strong>{def.label}</strong>
                      <small>{def.description}</small>
                      {on && (
                        <m.span className="type-check" layoutId="type-check">
                          <Check size={13} strokeWidth={3} />
                        </m.span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {step === 1 && (
              <div className="form">
                <div className="name-preview">
                  <SpaceIcon icon={form.icon} accent={form.accent} size={56} />
                  <div className="stack" style={{ minWidth: 0 }}>
                    <strong className="truncate">{form.name || PLACEHOLDER[form.type].replace('e.g. ', '')}</strong>
                    <small className="subtle">{SPACE_TYPES[form.type].label} space</small>
                  </div>
                </div>
                <Field label="Name" error={error}>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={PLACEHOLDER[form.type]} maxLength={100} autoFocus />
                </Field>
                {ws.v2 ? (
                  <>
                    <Field label="Icon">
                      <IconPicker value={form.icon} accent={form.accent} onChange={(icon) => setForm((f) => ({ ...f, icon }))} />
                    </Field>
                    <Field label="Colour">
                      <AccentPicker value={form.accent} onChange={(accent) => setForm((f) => ({ ...f, accent }))} />
                    </Field>
                  </>
                ) : (
                  <p className="field-hint">Custom icons and colours are available after the 2.0 database update.</p>
                )}
              </div>
            )}

            {step === 2 && (
              <>
                <p className="muted" style={{ marginBottom: 14 }}>
                  Pick what this space needs. Members see the same features; each person can arrange their own dashboard.
                </p>
                <ModulePicker type={form.type} enabled={form.enabled} cards={form.cards} onChange={(v) => setForm((f) => ({ ...f, ...v }))} />
                <div className="notice" style={{ marginTop: 14 }}>
                  <Lock size={16} />
                  <span>Medicines and cycle tracking always stay in your private My Space.</span>
                </div>
                {error && <p className="field-error" style={{ marginTop: 10 }}>{error}</p>}
              </>
            )}
          </m.div>
        </AnimatePresence>
      </Card>

      <div className="wizard-actions">
        {step > 0 ? (
          <Button variant="ghost" icon={ArrowLeft} onClick={() => go(step - 1)}>
            Back
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        )}
        {step < 2 ? (
          <Button
            iconRight={ArrowRight}
            onClick={() => {
              if (step === 1 && !form.name.trim()) return setError('Give your space a name')
              go(step + 1)
            }}
          >
            Continue
          </Button>
        ) : (
          <Button icon={Check} loading={busy} onClick={create}>
            Create space
          </Button>
        )}
      </div>
    </Page>
  )
}
