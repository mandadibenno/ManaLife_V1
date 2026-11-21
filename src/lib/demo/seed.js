// Sample data for the local demo. Dates are relative to today so the demo always looks alive.
import { addDays, isoDate, monthKey, startOfWeek } from '../dates'

export const DEMO_USER_ID = 'demo-me'

export function seed() {
  const t = isoDate()
  const d = (n) => addDays(t, n)
  const month = monthKey(t)
  const monday = startOfWeek(t)
  let n = 0
  const id = (p) => `${p}-${++n}`
  const now = new Date().toISOString()

  const people = [
    ['demo-me', 'Alex Rao'],
    ['demo-sam', 'Sam Rao'],
    ['demo-amma', 'Lakshmi'],
    ['demo-arjun', 'Arjun'],
    ['demo-ravi', 'Ravi Kumar'],
    ['demo-neha', 'Neha'],
    ['demo-kiran', 'Kiran Shah'],
    ['demo-meera', 'Meera Iyer'],
  ]
  const profiles = people.map(([pid, display_name]) => ({ id: pid, display_name, created_at: now }))

  const households = [
    {
      id: 'sp-personal', name: 'My Space', room_type: 'personal', created_by: 'demo-me', icon: null, accent: null,
      enabled_modules: ['tasks', 'expenses', 'bills', 'calendar', 'habits', 'groceries', 'meals', 'medicines', 'periods', 'reminders', 'documents'],
      overview_modules: ['tasks', 'calendar', 'expenses', 'habits', 'medicines', 'reminders'], created_at: now,
    },
    {
      id: 'sp-home', name: 'Rao Home', room_type: 'family', created_by: 'demo-me', icon: 'house', accent: 'amber',
      enabled_modules: ['tasks', 'groceries', 'bills', 'expenses', 'reminders', 'habits', 'meals', 'documents', 'calendar'],
      overview_modules: ['tasks', 'groceries', 'bills', 'calendar', 'meals'], created_at: now,
    },
    {
      id: 'sp-us', name: 'Alex & Sam', room_type: 'couple', created_by: 'demo-me', icon: 'heart', accent: 'rose',
      enabled_modules: ['tasks', 'calendar', 'expenses', 'bills', 'reminders', 'groceries'],
      overview_modules: ['calendar', 'tasks', 'expenses', 'reminders'], created_at: now,
    },
    {
      id: 'sp-crew', name: 'Goa Trip Crew', room_type: 'friends', created_by: 'demo-ravi', icon: 'plane', accent: 'sky',
      enabled_modules: ['tasks', 'bills', 'expenses', 'calendar'], overview_modules: ['calendar', 'expenses', 'tasks'], created_at: now,
    },
    {
      id: 'sp-studio', name: 'Design Studio', room_type: 'office', created_by: 'demo-me', icon: 'briefcase', accent: 'indigo',
      enabled_modules: ['tasks', 'expenses', 'reminders', 'calendar', 'documents'], overview_modules: ['tasks', 'calendar', 'reminders'], created_at: now,
    },
  ]

  const m = (household_id, user_id, role = 'member') => ({ household_id, user_id, role, joined_at: now })
  const household_members = [
    m('sp-personal', 'demo-me', 'owner'),
    m('sp-home', 'demo-me', 'owner'), m('sp-home', 'demo-sam'), m('sp-home', 'demo-amma'), m('sp-home', 'demo-arjun'),
    m('sp-us', 'demo-me', 'owner'), m('sp-us', 'demo-sam'),
    m('sp-crew', 'demo-ravi', 'owner'), m('sp-crew', 'demo-me'), m('sp-crew', 'demo-neha'),
    m('sp-studio', 'demo-me', 'owner'), m('sp-studio', 'demo-kiran'), m('sp-studio', 'demo-meera'),
  ]

  const task = (household_id, title, extra = {}) => ({
    id: id('task'), household_id, owner_id: 'demo-me', title, description: '', category: 'Personal',
    priority: 'medium', assigned_to: null, due_on: t, time: null, repeat: 'none', created_at: now, ...extra,
  })
  const tasks = [
    task('sp-personal', 'Morning run', { repeat: 'daily', due_on: d(-20), time: '06:30', category: 'Health' }),
    task('sp-personal', 'Read 20 pages', { repeat: 'daily', due_on: d(-12), time: '21:30', category: 'Personal', priority: 'low' }),
    task('sp-personal', 'Renew passport', { due_on: d(2), category: 'Personal', priority: 'high', description: 'Book appointment at PSK' }),
    task('sp-personal', 'Call the bank about card limit', { due_on: d(-1), category: 'Work', priority: 'medium' }),
    task('sp-personal', 'Plan weekly budget', { repeat: 'weekly', due_on: t, time: '19:00', category: 'Personal' }),
    task('sp-home', 'Water the plants', { repeat: 'daily', due_on: d(-30), time: '08:00', category: 'Home', assigned_to: 'demo-arjun', priority: 'low' }),
    task('sp-home', 'Take out recycling', { repeat: 'weekly', due_on: t, time: '20:00', category: 'Home', assigned_to: 'demo-sam' }),
    task('sp-home', 'Book AC service', { due_on: d(1), category: 'Home', priority: 'high', assigned_to: 'demo-me' }),
    task('sp-home', 'Pay school fees', { due_on: d(4), category: 'Family', priority: 'high', assigned_to: 'demo-sam' }),
    task('sp-home', 'Clean the balcony', { due_on: t, category: 'Home', assigned_to: 'demo-amma' }),
    task('sp-us', 'Book anniversary dinner', { due_on: d(3), category: 'Personal', priority: 'high' }),
    task('sp-us', 'Pick paint colour for bedroom', { due_on: t, category: 'Home', assigned_to: 'demo-sam' }),
    task('sp-us', 'Sunday walk at the lake', { repeat: 'weekly', due_on: d(-((new Date().getDay() + 7) % 7)), time: '07:00', category: 'Wellness' }),
    task('sp-crew', 'Book villa in Anjuna', { due_on: d(1), priority: 'high', assigned_to: 'demo-ravi', category: 'Planning' }),
    task('sp-crew', 'Collect flight details', { due_on: t, assigned_to: 'demo-me', category: 'Planning' }),
    task('sp-studio', 'Ship onboarding mockups', { due_on: d(1), priority: 'high', assigned_to: 'demo-me', category: 'Work' }),
    task('sp-studio', 'Review brand guidelines', { due_on: t, assigned_to: 'demo-kiran', category: 'Work' }),
    task('sp-studio', 'Client feedback call', { due_on: d(-1), priority: 'high', assigned_to: 'demo-meera', category: 'Work' }),
    task('sp-studio', 'Weekly design critique', { repeat: 'weekly', due_on: d(2), time: '16:00', category: 'Work' }),
  ]
  const task_completions = [
    { id: id('tc'), task_id: tasks[0].id, occurrence_on: t, completed_by: 'demo-me', created_at: now },
    { id: id('tc'), task_id: tasks[5].id, occurrence_on: t, completed_by: 'demo-arjun', created_at: now },
    { id: id('tc'), task_id: tasks[16].id, occurrence_on: t, completed_by: 'demo-kiran', created_at: now },
  ]

  const g = (household_id, name, quantity, checked = false, added_by = 'demo-me') => ({ id: id('g'), household_id, name, quantity, checked, added_by, created_at: now })
  const groceries = [
    g('sp-home', 'Milk', '2 litres'), g('sp-home', 'Tomatoes', '1 kg', false, 'demo-amma'), g('sp-home', 'Basmati rice', '5 kg', true),
    g('sp-home', 'Eggs', '12'), g('sp-home', 'Coriander', '1 bunch', false, 'demo-amma'), g('sp-home', 'Dish soap', '1'),
    g('sp-us', 'Wine for Saturday', '1 bottle', false, 'demo-sam'), g('sp-us', 'Flowers', ''),
    g('sp-personal', 'Protein bars', '6'), g('sp-personal', 'Notebook', '1', true),
  ]

  const bill = (household_id, title, amount, due_on, extra = {}) => ({ id: id('bill'), household_id, owner_id: 'demo-me', title, amount, due_on, repeat: 'monthly', category: 'Utilities', created_at: now, ...extra })
  const bills = [
    bill('sp-home', 'Electricity', 1840, d(3)), bill('sp-home', 'Internet', 999, d(9), { category: 'Internet' }),
    bill('sp-home', 'Maid salary', 6000, d(-2), { category: 'Other' }), bill('sp-home', 'Water', 420, d(14)),
    bill('sp-personal', 'Phone', 449, d(5), { category: 'Subscription' }), bill('sp-personal', 'Gym membership', 2500, d(11), { category: 'Subscription' }),
    bill('sp-us', 'Rent', 32000, d(6), { category: 'Rent' }), bill('sp-us', 'Streaming bundle', 649, d(18), { category: 'Subscription' }),
    bill('sp-crew', 'Villa advance', 18000, d(2), { repeat: 'none', category: 'Other', owner_id: 'demo-ravi' }),
    bill('sp-studio', 'Figma seats', 4200, d(8), { category: 'Subscription' }),
  ]
  const bill_payments = [{ id: id('bp'), bill_id: bills[2].id, occurrence_on: d(-2), completed_by: 'demo-me', created_at: now }]

  const ev = (household_id, title, event_date, time = null, category = 'Family') => ({ id: id('ev'), household_id, owner_id: 'demo-me', title, event_date, time, category, created_at: now })
  const events = [
    ev('sp-personal', 'Dentist check-up', d(2), '10:30', 'Appointment'), ev('sp-personal', 'Yoga workshop', d(6), '07:00', 'Planning'),
    ev('sp-home', "Amma's birthday", d(5), null, 'Birthday'), ev('sp-home', 'Parent-teacher meeting', d(8), '15:00', 'Appointment'),
    ev('sp-home', 'Family dinner at Uncle Raj', d(1), '19:30', 'Family'),
    ev('sp-us', 'Anniversary', d(10), null, 'Anniversary'), ev('sp-us', 'Movie night', d(0), '21:00', 'Planning'),
    ev('sp-crew', 'Flight to Goa', d(12), '06:15', 'Planning'), ev('sp-crew', 'Trip planning call', d(2), '20:00', 'Planning'),
    ev('sp-studio', 'Sprint review', d(1), '11:00', 'Planning'), ev('sp-studio', 'Client workshop', d(4), '14:00', 'Appointment'),
  ]

  const ex = (household_id, amount, category, spent_on, note = '', expense_type = 'essential', created_by = 'demo-me') => ({ id: id('ex'), household_id, amount, category, spent_on, note, expense_type, created_by, created_at: now })
  const expenses = []
  const day = Number(t.slice(-2))
  const cats = [['Groceries', 640, 'Weekly vegetables'], ['Food', 380, 'Lunch'], ['Transport', 220, 'Auto'], ['Shopping', 1450, 'Shoes', 'optional'], ['Entertainment', 600, 'Movie', 'optional'], ['Health', 520, 'Pharmacy'], ['Bills', 999, 'Recharge']]
  for (let i = 0; i < Math.min(day, 18); i++) {
    const [cat, amt, note, type] = cats[i % cats.length]
    const date = `${month}-${String(day - i).padStart(2, '0')}`
    expenses.push(ex('sp-personal', Math.round(amt * (0.6 + ((i * 37) % 10) / 10)), cat, date, note, type || 'essential'))
    if (i % 2 === 0) expenses.push(ex('sp-home', Math.round(amt * 1.7), cat, date, note, type || 'essential', i % 4 ? 'demo-sam' : 'demo-me'))
    if (i % 3 === 0) expenses.push(ex('sp-us', Math.round(amt * 1.2), cat === 'Bills' ? 'Food' : cat, date, note, type || 'essential'))
  }
  expenses.push(ex('sp-crew', 4800, 'Transport', t, 'Cab to airport (split later)', 'essential', 'demo-ravi'))
  expenses.push(ex('sp-studio', 2300, 'Food', d(-1), 'Team lunch', 'optional'))
  const household_budgets = [
    { household_id: 'sp-personal', budget_month: `${month}-01`, monthly_limit: 15000, updated_by: 'demo-me' },
    { household_id: 'sp-home', budget_month: `${month}-01`, monthly_limit: 40000, updated_by: 'demo-me' },
    { household_id: 'sp-us', budget_month: `${month}-01`, monthly_limit: 20000, updated_by: 'demo-me' },
  ]

  const habit = (household_id, title, created_by = 'demo-me') => ({ id: id('hab'), household_id, title, created_by, created_at: now })
  const habits = [habit('sp-personal', 'Drink 8 glasses of water'), habit('sp-personal', 'Meditate 10 minutes'), habit('sp-personal', 'No phone after 10 PM'), habit('sp-home', 'Family walk after dinner')]
  const habit_checks = []
  for (let i = 1; i < 26; i++) {
    if (i % 5 !== 0) habit_checks.push({ habit_id: habits[0].id, user_id: 'demo-me', done_on: d(-i) })
    if (i % 3 !== 0) habit_checks.push({ habit_id: habits[1].id, user_id: 'demo-me', done_on: d(-i) })
    if (i < 6) habit_checks.push({ habit_id: habits[3].id, user_id: i % 2 ? 'demo-sam' : 'demo-me', done_on: d(-i) })
  }
  habit_checks.push({ habit_id: habits[0].id, user_id: 'demo-me', done_on: t })

  const meal = (household_id, offset, meal_type, meal_name, items) => ({ id: id('meal'), household_id, meal_date: addDays(monday, offset), meal_type, meal_name, servings: 2, ingredients: items.map((i) => `${i.name} ${i.grams}g`).join(', '), nutrition_items: items, created_by: 'demo-me', created_at: now })
  const ing = (name, grams, kcal, protein, carbs, fat) => ({ id: id('ing'), name, grams, kcal, protein, carbs, fat })
  const meal_plans = [
    meal('sp-home', 0, 'breakfast', 'Idli & sambar', [ing('Idli', 240, 128, 4.4, 24.2, 1.2), ing('Cooked Dal', 200, 116, 7, 19, 1.7)]),
    meal('sp-home', 0, 'lunch', 'Rice, dal & sabzi', [ing('Cooked Rice', 300, 130, 2.7, 28.2, 0.3), ing('Cooked Dal', 250, 116, 7, 19, 1.7)]),
    meal('sp-home', 1, 'dinner', 'Chapati & paneer', [ing('Chapati', 160, 297, 9, 49, 7), ing('Paneer', 150, 265, 18.3, 1.2, 20.8)]),
    meal('sp-home', 2, 'breakfast', 'Egg bhurji toast', [ing('Egg', 150, 143, 13, 0.7, 9.5)]),
    meal('sp-home', 3, 'lunch', 'Curd rice', [ing('Cooked Rice', 250, 130, 2.7, 28.2, 0.3), ing('Milk', 150, 61, 3.2, 4.8, 3.3)]),
    meal('sp-personal', (new Date().getDay() + 6) % 7, 'breakfast', 'Oats with banana', [ing('Custom: Oats', 60, 389, 16.9, 66, 6.9)]),
  ]

  const medications = [
    { id: id('med'), user_id: 'demo-me', name: 'Vitamin D3', dose_label: '1 capsule', schedule_times: ['08:00'], start_date: d(-40), end_date: null, refill_on: d(4), instructions: 'After breakfast', is_active: true, created_at: now },
    { id: id('med'), user_id: 'demo-me', name: 'Iron supplement', dose_label: '1 tablet', schedule_times: ['13:30', '21:00'], start_date: d(-10), end_date: d(50), refill_on: null, instructions: 'With food', is_active: true, created_at: now },
  ]
  const medicine_logs = [{ id: id('log'), medication_id: medications[0].id, user_id: 'demo-me', dose_date: t, dose_time: '08:00', status: 'taken', marked_at: now }]

  const period_entries = [
    { id: id('pe'), user_id: 'demo-me', start_date: d(-82), end_date: d(-78), flow: 'medium', symptoms: ['Cramps'], notes: '', created_at: now },
    { id: id('pe'), user_id: 'demo-me', start_date: d(-54), end_date: d(-50), flow: 'medium', symptoms: ['Fatigue'], notes: '', created_at: now },
    { id: id('pe'), user_id: 'demo-me', start_date: d(-26), end_date: d(-22), flow: 'light', symptoms: ['Bloating', 'Mood changes'], notes: '', created_at: now },
  ]

  const space_documents = [
    { id: id('doc'), household_id: 'sp-home', uploaded_by: 'demo-me', title: 'Home insurance policy', category: 'Insurance', notes: 'Renewal every March', storage_path: 'sp-home/demo-insurance.pdf', file_name: 'insurance.pdf', mime_type: 'application/pdf', size_bytes: 248000, expires_on: d(40), created_at: now },
    { id: id('doc'), household_id: 'sp-personal', uploaded_by: 'demo-me', title: 'Passport copy', category: 'ID', notes: '', storage_path: 'sp-personal/demo-passport.pdf', file_name: 'passport.pdf', mime_type: 'application/pdf', size_bytes: 512000, expires_on: d(20), created_at: now },
  ]

  return {
    profiles, households, household_members, tasks, task_completions, groceries, bills, bill_payments, events,
    expenses, household_budgets, habits, habit_checks, meal_plans, medications, medicine_logs, period_entries,
    period_shares: [{ id: id('ps'), room_id: 'sp-us', owner_id: 'demo-me', viewer_id: 'demo-sam', created_at: now }],
    space_documents,
    _join_requests: [{ id: id('jr'), room_id: 'sp-studio', user_id: 'demo-guest', name: 'Priya Nair', email: 'priya@example.com', status: 'pending' }],
    _invites: [],
  }
}
