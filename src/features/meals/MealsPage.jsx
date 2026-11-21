import { useMemo, useState } from 'react'
import { m } from 'motion/react'
import { ChevronLeft, ChevronRight, Flame, Plus, ShoppingBasket, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { keys, useAction, useMeals } from '../../hooks/data'
import { useToday } from '../../hooks/useToday'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button, IconButton } from '../../ui/Button'
import { BarChart, Card, CardHeader, Segmented, Skeleton } from '../../ui/Display'
import { Field, Input, Select, Switch } from '../../ui/Form'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { useConfirm } from '../../ui/Confirm'
import { addDays, dateLabel, startOfWeek, weekdayShort } from '../../lib/dates'
import { uid } from '../../lib/format'
import { FOODS, MAIN_MEALS, MEAL_LABELS, MEAL_TYPES, deleteMeal, nutrition, saveMeal } from '../../services/routines'
import { addGroceries, listGroceries } from '../../services/lists'
import { ease } from '../../motion'

const round = (n) => Math.round(n * 10) / 10

export default function MealsPage() {
  const { space, title, userId, has } = useSpace()
  const today = useToday()
  const [week, setWeek] = useState(startOfWeek(today))
  const [day, setDay] = useState(today)
  const [allMeals, setAllMeals] = useState(false)
  const [editing, setEditing] = useState(null)
  const { data, isLoading } = useMeals(space, week)
  const key = keys.meals(space.id, week)
  const save = useAction(({ values, id }) => saveMeal(space.id, userId, values, id), { invalidate: [key], success: 'Meal saved', onSuccess: () => setEditing(null) })
  const remove = useAction((id) => deleteMeal(space.id, id), { invalidate: [key], success: 'Meal removed', onSuccess: () => setEditing(null) })
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const types = allMeals ? MEAL_TYPES : MAIN_MEALS
  const meals = data || []
  const find = (d, t) => meals.find((x) => x.meal_date === d && x.meal_type === t)
  const kcalByDay = useMemo(
    () => days.map((d) => ({ key: d, label: weekdayShort(d), highlight: d === today, value: Math.round(meals.filter((x) => x.meal_date === d).reduce((s, x) => s + nutrition(x.nutrition_items || []).kcal / Math.max(1, Number(x.servings) || 1), 0)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meals, week, today],
  )

  const changeWeek = (delta) => {
    const next = addDays(week, delta)
    setWeek(next)
    setDay(delta === 0 ? today : next)
  }

  return (
    <Page>
      <PageHeader
        eyebrow={space.name}
        title={title('meals')}
        description="Plan the week, estimate nutrition, send ingredients to the shopping list."
        actions={
          <Button icon={Plus} onClick={() => setEditing({ meal_date: day, meal_type: 'lunch' })}>
            Plan a meal
          </Button>
        }
      />
      <Reveal className="month-nav">
        <IconButton icon={ChevronLeft} label="Previous week" variant="outline" onClick={() => changeWeek(-7)} />
        <h2>
          {dateLabel(week)} – {dateLabel(addDays(week, 6))}
        </h2>
        <IconButton icon={ChevronRight} label="Next week" variant="outline" onClick={() => changeWeek(7)} />
        {week !== startOfWeek(today) && (
          <Button size="sm" variant="ghost" onClick={() => { setWeek(startOfWeek(today)); setDay(today) }}>
            This week
          </Button>
        )}
        <div className="spacer" />
        <div className="meal-toggle">
          <Switch label="All 7 meals" checked={allMeals} onChange={setAllMeals} />
        </div>
      </Reveal>

      {/* Phones: pick a day, see its meals. Larger screens: the full week grid. */}
      <Reveal className="meal-days">
        <Segmented layoutId="meal-day" label="Day" value={day} onChange={setDay} options={days.map((d) => ({ value: d, label: `${weekdayShort(d)} ${Number(d.slice(-2))}` }))} />
      </Reveal>
      <Reveal className="meal-day-list">
        {types.map((t) => {
          const meal = find(day, t)
          return <MealSlot key={t} type={t} meal={meal} onOpen={() => setEditing(meal || { meal_date: day, meal_type: t })} />
        })}
      </Reveal>

      <Reveal>
        <Card className="meal-week card-flush">
          {isLoading ? (
            <div style={{ padding: 20 }}>
              <Skeleton height={200} />
            </div>
          ) : (
            <div className="meal-grid" style={{ '--cols': types.length }}>
              <span className="meal-corner" />
              {types.map((t) => (
                <span key={t} className="meal-col-head">
                  {MEAL_LABELS[t]}
                </span>
              ))}
              {days.map((d) => (
                <MealRow key={d} d={d} today={today} types={types} find={find} onOpen={(meal, t) => setEditing(meal || { meal_date: d, meal_type: t })} />
              ))}
            </div>
          )}
        </Card>
      </Reveal>

      <Reveal>
        <Card style={{ marginTop: 16 }}>
          <CardHeader icon={Flame} title="Estimated calories per person" subtitle="One serving of each planned meal. Estimates, not lab values." />
          <BarChart data={kcalByDay} height={110} format={(v) => `${v} kcal`} />
        </Card>
      </Reveal>

      <MealEditor
        open={!!editing}
        meal={editing}
        onClose={() => setEditing(null)}
        saving={save.isPending}
        // One meal per slot (V1 behaviour): saving into an occupied slot updates that meal.
        onSave={(values) => save.mutate({ values, id: editing?.id || find(values.meal_date, values.meal_type)?.id })}
        onDelete={() => remove.mutate(editing.id)}
        canShop={has('groceries')}
      />
    </Page>
  )
}

function MealRow({ d, today, types, find, onOpen }) {
  return (
    <>
      <span className={`meal-row-head ${d === today ? 'is-today' : ''}`}>
        <small>{weekdayShort(d)}</small>
        <strong>{Number(d.slice(-2))}</strong>
      </span>
      {types.map((t) => {
        const meal = find(d, t)
        return (
          <button key={t} type="button" className={`meal-cell ${meal ? 'has-meal' : ''}`} onClick={() => onOpen(meal, t)} aria-label={`${MEAL_LABELS[t]}, ${dateLabel(d)}: ${meal ? meal.meal_name : 'empty'}`}>
            {meal ? (
              <>
                <span className="meal-name">{meal.meal_name}</span>
                {meal.nutrition_items?.length > 0 && <small>{Math.round(nutrition(meal.nutrition_items).kcal / Math.max(1, meal.servings))} kcal</small>}
              </>
            ) : (
              <Plus size={15} className="meal-plus" />
            )}
          </button>
        )
      })}
    </>
  )
}

function MealSlot({ type, meal, onOpen }) {
  return (
    <button type="button" className={`meal-slot meal-slot-lg ${meal ? 'has-meal' : ''}`} onClick={onOpen}>
      <small>{MEAL_LABELS[type]}</small>
      <span className="truncate">{meal ? meal.meal_name : '+ Plan'}</span>
    </button>
  )
}

function MealEditor({ open, meal, onClose, onSave, onDelete, saving, canShop }) {
  const { space, userId } = useSpace()
  const toast = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState({})
  const [food, setFood] = useState('Cooked Rice')
  const [draft, setDraft] = useState({ name: 'Cooked Rice', grams: '100', values: FOODS['Cooked Rice'] })
  const [error, setError] = useState('')
  const [shopping, setShopping] = useState(false)
  const [lastKey, setLastKey] = useState(null)
  const k = open ? meal?.id || `${meal?.meal_date}-${meal?.meal_type}` : null
  if (k !== lastKey) {
    setLastKey(k)
    setError('')
    setForm({ meal_date: meal?.meal_date || '', meal_type: meal?.meal_type || 'lunch', meal_name: meal?.meal_name || '', servings: meal?.servings || 2, nutrition_items: Array.isArray(meal?.nutrition_items) ? meal.nutrition_items : [] })
  }
  const total = nutrition(form.nutrition_items || [])
  const per = (v) => round(v / Math.max(1, Number(form.servings) || 1))

  function pickFood(name) {
    setFood(name)
    setDraft({ name: name === 'custom' ? '' : name, grams: '100', values: name === 'custom' ? [0, 0, 0, 0] : [...FOODS[name]] })
  }
  function addIngredient() {
    if (!draft.name.trim() || !(Number(draft.grams) > 0)) return setError('Enter the ingredient name and grams')
    if (draft.values.some((v) => !(Number(v) >= 0))) return setError('Nutrition values must be 0 or more')
    setError('')
    const [kcal, protein, carbs, fat] = draft.values.map(Number)
    setForm((f) => ({ ...f, nutrition_items: [...f.nutrition_items, { id: uid(), name: draft.name.trim(), grams: Number(draft.grams), kcal, protein, carbs, fat }] }))
    setDraft((d) => ({ ...d, grams: '100' }))
  }
  async function toShopping() {
    setShopping(true)
    try {
      const existing = new Set((await listGroceries(space.id)).filter((g) => !g.checked).map((g) => g.name.toLowerCase()))
      const items = form.nutrition_items.filter((i) => !existing.has(i.name.toLowerCase())).map((i) => ({ name: i.name, quantity: `${i.grams} g` }))
      if (!items.length) return toast.info('Those ingredients are already on the list')
      await addGroceries(space.id, userId, items)
      toast.success(`${items.length} ingredient${items.length > 1 ? 's' : ''} added to shopping`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setShopping(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={meal?.id ? 'Edit meal' : 'Plan a meal'}
      description={form.meal_date ? `${MEAL_LABELS[form.meal_type]} · ${dateLabel(form.meal_date, { weekday: 'long', day: 'numeric', month: 'short' })}` : ''}
      footer={
        <>
          {meal?.id && (
            <Button
              variant="danger-soft"
              icon={Trash2}
              onClick={async () => {
                if (await confirm({ title: 'Remove this meal?', confirmLabel: 'Remove', tone: 'danger' })) onDelete()
              }}
            >
              Remove
            </Button>
          )}
          <div className="spacer" />
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              if (!form.meal_name.trim()) return setError('Name the meal')
              if (!(Number(form.servings) >= 1 && Number(form.servings) <= 20)) return setError('Servings must be 1–20')
              onSave(form)
            }}
          >
            Save meal
          </Button>
        </>
      }
    >
      <div className="form">
        <div className="form-row">
          <Field label="Meal">
            <Input value={form.meal_name || ''} onChange={(e) => setForm((f) => ({ ...f, meal_name: e.target.value }))} placeholder="e.g. Rice, dal & sabzi" maxLength={150} data-autofocus />
          </Field>
          <div className="form-row">
            <Field label="Which meal">
              <Select value={form.meal_type} onChange={(e) => setForm((f) => ({ ...f, meal_type: e.target.value }))}>
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MEAL_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Servings">
              <Input type="number" min="1" max="20" value={form.servings || ''} onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))} />
            </Field>
          </div>
        </div>

        <div className="ingredients">
          <p className="section-title">Ingredients</p>
          {form.nutrition_items?.length > 0 && (
            <div className="ing-list">
              {form.nutrition_items.map((i) => (
                <m.div key={i.id || i.name} className="ing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, ease }}>
                  <span>
                    <strong>{i.name}</strong> {i.grams} g · {round((i.grams * i.kcal) / 100)} kcal
                  </span>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, nutrition_items: f.nutrition_items.filter((x) => x !== i) }))} aria-label={`Remove ${i.name}`}>
                    <X size={14} />
                  </button>
                </m.div>
              ))}
            </div>
          )}
          <div className="ing-add">
            <Field label="Ingredient">
              <Select value={food} onChange={(e) => pickFood(e.target.value)}>
                {Object.keys(FOODS).map((n) => (
                  <option key={n}>{n}</option>
                ))}
                <option value="custom">Custom…</option>
              </Select>
            </Field>
            {food === 'custom' && (
              <Field label="Name">
                <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} maxLength={80} />
              </Field>
            )}
            <Field label="Grams">
              <Input type="number" min="1" value={draft.grams} onChange={(e) => setDraft((d) => ({ ...d, grams: e.target.value }))} />
            </Field>
          </div>
          <details className="ing-details" open={food === 'custom'}>
            <summary>Nutrition per 100 g (editable estimates)</summary>
            <div className="ing-nutri">
              {['kcal', 'Protein g', 'Carbs g', 'Fat g'].map((label, i) => (
                <Field key={label} label={label}>
                  <Input type="number" min="0" step="any" value={draft.values[i]} onChange={(e) => setDraft((d) => ({ ...d, values: d.values.map((v, j) => (j === i ? e.target.value : v)) }))} />
                </Field>
              ))}
            </div>
          </details>
          <Button variant="soft" size="sm" icon={Plus} onClick={addIngredient}>
            Add ingredient
          </Button>
        </div>

        <div className="nutri-summary">
          {[
            ['Calories', 'kcal', ''],
            ['Protein', 'protein', ' g'],
            ['Carbs', 'carbs', ' g'],
            ['Fat', 'fat', ' g'],
          ].map(([label, key, unit]) => (
            <div key={key} className="nutri">
              <small>{label}</small>
              <strong className="tnum">
                {per(total[key])}
                {unit || ' kcal'}
              </strong>
              <span className="subtle">per serving</span>
            </div>
          ))}
        </div>
        {error && <p className="field-error">{error}</p>}
        {canShop && meal?.id && form.nutrition_items?.length > 0 && (
          <Button variant="secondary" icon={ShoppingBasket} loading={shopping} onClick={toShopping}>
            Add ingredients to shopping list
          </Button>
        )}
        <p className="field-hint">
          <UtensilsCrossed size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Nutrition values are estimates; cooking methods change real values.
        </p>
      </div>
    </Sheet>
  )
}
