// Habits and meal plans (space-scoped).
import { db } from '../lib/supabase'
import { unwrap } from '../lib/errors'
import { addDays, isoDate } from '../lib/dates'

// ---- Habits ----
export async function listHabits(spaceId) {
  const habits = unwrap(await db().from('habits').select('*').eq('household_id', spaceId).order('created_at')) || []
  const ids = habits.map((h) => h.id)
  const checks = ids.length
    ? unwrap(await db().from('habit_checks').select('habit_id,user_id,done_on').in('habit_id', ids).gte('done_on', addDays(isoDate(), -90))) || []
    : []
  return { habits, checks }
}

export async function saveHabit(spaceId, userId, title, id) {
  if (id) return unwrap(await db().from('habits').update({ title: title.trim() }).eq('id', id).eq('household_id', spaceId).select().single())
  return unwrap(await db().from('habits').insert({ title: title.trim(), household_id: spaceId, created_by: userId }).select().single())
}

export async function deleteHabit(spaceId, id) {
  unwrap(await db().from('habits').delete().eq('id', id).eq('household_id', spaceId))
}

export async function setHabitDone(habitId, userId, day, done) {
  if (done) {
    const res = await db().from('habit_checks').insert({ habit_id: habitId, user_id: userId, done_on: day })
    if (res.error && res.error.code !== '23505') unwrap(res)
  } else {
    unwrap(await db().from('habit_checks').delete().eq('habit_id', habitId).eq('user_id', userId).eq('done_on', day))
  }
}

// ---- Meals ----
export const MEAL_TYPES = ['breakfast', 'mid_morning', 'lunch', 'afternoon_snack', 'evening_snack', 'dinner', 'bedtime_snack']
export const MEAL_LABELS = {
  breakfast: 'Breakfast',
  mid_morning: 'Mid-morning',
  lunch: 'Lunch',
  afternoon_snack: 'Afternoon snack',
  evening_snack: 'Evening snack',
  dinner: 'Dinner',
  bedtime_snack: 'Bedtime snack',
}
export const MAIN_MEALS = ['breakfast', 'lunch', 'dinner']

// Per 100 g: kcal, protein, carbs, fat (V1 values, editable estimates)
export const FOODS = {
  'Cooked Rice': [130, 2.7, 28.2, 0.3],
  'Cooked Dal': [116, 7, 19, 1.7],
  Idli: [128, 4.4, 24.2, 1.2],
  Chapati: [297, 9, 49, 7],
  'Boiled Potato': [87, 1.9, 20.1, 0.1],
  Tomato: [18, 0.9, 3.9, 0.2],
  Milk: [61, 3.2, 4.8, 3.3],
  Egg: [143, 13, 0.7, 9.5],
  Paneer: [265, 18.3, 1.2, 20.8],
  'Cooking Oil': [884, 0, 0, 100],
}

export function nutrition(items = []) {
  return items.reduce(
    (t, i) => {
      const f = (Number(i.grams) || 0) / 100
      return { kcal: t.kcal + f * (Number(i.kcal) || 0), protein: t.protein + f * (Number(i.protein) || 0), carbs: t.carbs + f * (Number(i.carbs) || 0), fat: t.fat + f * (Number(i.fat) || 0) }
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export async function listMeals(spaceId, weekStart) {
  return unwrap(await db().from('meal_plans').select('*').eq('household_id', spaceId).gte('meal_date', weekStart).lte('meal_date', addDays(weekStart, 6)).order('meal_date')) || []
}

export async function saveMeal(spaceId, userId, values, id) {
  const items = values.nutrition_items || []
  const row = {
    meal_date: values.meal_date,
    meal_type: values.meal_type,
    meal_name: values.meal_name.trim(),
    servings: Number(values.servings) || 1,
    ingredients: items.map((i) => `${i.name} ${i.grams}g`).join(', '),
    nutrition_items: items,
  }
  if (id) return unwrap(await db().from('meal_plans').update(row).eq('id', id).eq('household_id', spaceId).select().single())
  return unwrap(await db().from('meal_plans').insert({ ...row, household_id: spaceId, created_by: userId }).select().single())
}

export async function deleteMeal(spaceId, id) {
  unwrap(await db().from('meal_plans').delete().eq('id', id).eq('household_id', spaceId))
}
