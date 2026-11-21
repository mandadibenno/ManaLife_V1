import {
  BellRing, CalendarDays, ChartColumn, Flower2, FolderLock, ListChecks, Pill, ReceiptText,
  Repeat2, ShoppingBasket, UtensilsCrossed,
} from 'lucide-react'

// Feature registry. Keys match the values stored in households.enabled_modules /
// overview_modules in V1, so existing spaces keep their configuration.
// `personalOnly` modules hold user-scoped (not space-scoped) data and live in My Space.
export const MODULES = {
  tasks: {
    icon: ListChecks,
    short: 'Tasks',
    titles: { personal: 'My Tasks', couple: 'Our To-dos', family: 'Household Tasks', friends: 'Group Tasks', office: 'Team Tasks', custom: 'Tasks' },
    blurb: 'To-dos, routines and deadlines',
  },
  calendar: {
    icon: CalendarDays,
    short: 'Calendar',
    titles: { personal: 'Calendar', couple: 'Our Plans', family: 'Family Calendar', friends: 'Plans & Events', office: 'Schedule', custom: 'Calendar' },
    blurb: 'Events, birthdays and plans',
  },
  expenses: {
    icon: ChartColumn,
    short: 'Spending',
    titles: { personal: 'Spending', couple: 'Our Spending', family: 'Household Spending', friends: 'Group Expenses', office: 'Team Expenses', custom: 'Expenses' },
    blurb: 'Daily spending and monthly budget',
  },
  bills: {
    icon: ReceiptText,
    short: 'Bills',
    titles: { personal: 'Bills', couple: 'Shared Bills', family: 'Household Bills', friends: 'Group Bills', office: 'Recurring Costs', custom: 'Bills' },
    blurb: 'Due dates and payments',
  },
  groceries: {
    icon: ShoppingBasket,
    short: 'Shopping',
    titles: { personal: 'Shopping List', couple: 'Groceries', family: 'Groceries', friends: 'Shopping List', office: 'Office Supplies', custom: 'Shopping List' },
    blurb: 'One list everyone can tick off',
  },
  habits: {
    icon: Repeat2,
    short: 'Habits',
    titles: { personal: 'Habits', couple: 'Shared Habits', family: 'Family Habits', friends: 'Challenges', office: 'Team Rituals', custom: 'Habits' },
    blurb: 'Daily routines and streaks',
  },
  meals: {
    icon: UtensilsCrossed,
    short: 'Meals',
    titles: { personal: 'Meal Planner', couple: 'Our Meals', family: 'Family Meals', friends: 'Food Plans', office: 'Team Meals', custom: 'Meal Planner' },
    blurb: 'Weekly meals and nutrition',
  },
  reminders: {
    icon: BellRing,
    short: 'Reminders',
    titles: { personal: 'Reminders', couple: 'Reminders', family: 'Reminders', friends: 'Reminders', office: 'Reminders', custom: 'Reminders' },
    blurb: 'Everything due, in one agenda',
  },
  documents: {
    icon: FolderLock,
    short: 'Documents',
    titles: { personal: 'My Documents', couple: 'Shared Documents', family: 'Family Vault', friends: 'Shared Files', office: 'Team Files', custom: 'Documents' },
    blurb: 'Important files, privately stored',
  },
  medicines: {
    icon: Pill,
    short: 'Medicines',
    personalOnly: true,
    titles: { personal: 'Medicines' },
    blurb: 'Doses, schedules and refills',
  },
  periods: {
    icon: Flower2,
    short: 'Cycle',
    personalOnly: true,
    titles: { personal: 'Cycle Tracker', couple: "Partner's Cycle", family: "Partner's Cycle" },
    blurb: 'Private cycle tracking',
  },
}

export const MODULE_ORDER = ['tasks', 'calendar', 'expenses', 'bills', 'groceries', 'habits', 'meals', 'medicines', 'periods', 'reminders', 'documents']
export const SHARED_MODULES = MODULE_ORDER.filter((k) => !MODULES[k].personalOnly)
export const PERSONAL_MODULES = MODULE_ORDER

export function moduleTitle(key, type = 'custom') {
  const m = MODULES[key]
  if (!m) return 'Overview'
  return m.titles[type] || m.titles.custom || m.titles.personal || m.short
}
