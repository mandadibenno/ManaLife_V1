import { useEffect, useState } from 'react'
import { Sheet } from '../../ui/Sheet'
import { Button } from '../../ui/Button'
import { ChipGroup, Field, Input, Select, Textarea, validate } from '../../ui/Form'
import { useSpace } from '../../app/SpaceContext'
import { isoDate } from '../../lib/dates'
import { TASK_CATEGORIES } from './taskActions'

const blank = (space) => ({
  title: '',
  description: '',
  due_on: isoDate(),
  time: '',
  repeat: 'none',
  priority: 'medium',
  category: space.type === 'office' ? 'Work' : space.isPersonal ? 'Personal' : 'Home',
  assigned_to: '',
})

export function TaskForm({ open, onClose, task, onSave, saving }) {
  const { space, members, userId } = useSpace()
  const [form, setForm] = useState(() => blank(space))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(task ? { ...blank(space), ...task, time: task.time || '', assigned_to: task.assigned_to || '', description: task.description || '' } : blank(space))
    // Reset only when the sheet opens or a different task is chosen (not on background refetch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id, space.id])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))

  function submit(e) {
    e.preventDefault()
    const errs = validate(form, {
      title: (v) => (!v.trim() ? 'Give the task a name' : v.length > 180 ? 'Keep it under 180 characters' : ''),
      due_on: (v) => (!v ? 'Pick a date' : ''),
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSave(form)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={saving}>
            {task ? 'Save changes' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id="task-form" className="form" onSubmit={submit} noValidate>
        <Field label="Task" error={errors.title}>
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Water the plants" maxLength={180} data-autofocus />
        </Field>
        <Field label="Notes" optional>
          <Textarea rows={2} value={form.description} onChange={set('description')} maxLength={1000} placeholder="Add a few details…" />
        </Field>
        <div className="form-row">
          <Field label={form.repeat === 'none' ? 'Due date' : 'Starts on'} error={errors.due_on}>
            <Input type="date" value={form.due_on} onChange={set('due_on')} />
          </Field>
          <Field label="Time" optional>
            <Input type="time" value={form.time} onChange={set('time')} />
          </Field>
        </div>
        <Field label="Repeat">
          <ChipGroup
            size="sm"
            label="Repeat"
            value={form.repeat}
            onChange={set('repeat')}
            options={[
              { value: 'none', label: 'Once' },
              { value: 'daily', label: 'Every day' },
              { value: 'weekly', label: 'Every week' },
              { value: 'monthly', label: 'Every month' },
            ]}
          />
        </Field>
        <Field label="Priority">
          <ChipGroup size="sm" label="Priority" value={form.priority} onChange={set('priority')} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
        </Field>
        <div className="form-row">
          <Field label="Category">
            <Select value={form.category} onChange={set('category')}>
              {[...new Set([...TASK_CATEGORIES, form.category])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          {!space.isPersonal && (
            <Field label="Assign to">
              <Select value={form.assigned_to} onChange={set('assigned_to')}>
                <option value="">Anyone</option>
                {members.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === userId ? `${p.display_name} (me)` : p.display_name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        {!space.isPersonal && <p className="field-hint">Everyone in this space can see this task, whoever it's assigned to.</p>}
      </form>
    </Sheet>
  )
}
