// Space types define vocabulary, defaults and dashboard tone. This is what makes
// each space feel like it was made for its purpose while sharing one design system.

export const SPACE_TYPES = {
  personal: {
    label: 'My Space',
    noun: 'personal space',
    icon: 'user-round',
    accent: 'violet',
    description: 'Private to you. Nobody else can be added.',
    heroLine: 'Here is your day at a glance.',
    privacy: 'Only you can see this space',
    modules: ['tasks', 'expenses', 'bills', 'calendar', 'habits', 'groceries', 'meals', 'medicines', 'periods', 'reminders', 'documents'],
    widgets: ['tasks', 'calendar', 'expenses', 'habits', 'medicines', 'reminders'],
    mobileNav: ['tasks', 'expenses'],
  },
  couple: {
    label: 'Couple',
    noun: 'couple space',
    icon: 'heart',
    accent: 'rose',
    description: 'For two: plans, to-dos, money and little reminders.',
    heroLine: 'What the two of you have coming up.',
    privacy: 'Shared with your partner only',
    modules: ['tasks', 'calendar', 'expenses', 'bills', 'reminders', 'groceries'],
    widgets: ['calendar', 'tasks', 'expenses', 'reminders'],
    mobileNav: ['calendar', 'tasks'],
  },
  family: {
    label: 'Family',
    noun: 'family space',
    icon: 'house',
    accent: 'amber',
    description: 'Run the household together: chores, groceries, bills and meals.',
    heroLine: "Here's how the household is doing today.",
    privacy: 'Shared with family members',
    modules: ['tasks', 'groceries', 'bills', 'expenses', 'reminders', 'habits', 'meals', 'documents', 'calendar'],
    widgets: ['tasks', 'groceries', 'bills', 'calendar', 'meals'],
    mobileNav: ['tasks', 'groceries'],
  },
  friends: {
    label: 'Friends',
    noun: 'friends space',
    icon: 'party-popper',
    accent: 'sky',
    description: 'Plan trips and hangouts, split costs, keep everyone in the loop.',
    heroLine: 'Plans, costs and to-dos for the group.',
    privacy: 'Shared with the group',
    modules: ['tasks', 'bills', 'expenses', 'calendar'],
    widgets: ['calendar', 'expenses', 'tasks'],
    mobileNav: ['calendar', 'expenses'],
  },
  office: {
    label: 'Office',
    noun: 'team space',
    icon: 'briefcase',
    accent: 'indigo',
    description: 'Deadlines, schedules and shared work with colleagues.',
    heroLine: "Your team's deadlines and schedule.",
    privacy: 'Shared with your team',
    modules: ['tasks', 'expenses', 'reminders', 'calendar'],
    widgets: ['tasks', 'calendar', 'reminders'],
    mobileNav: ['tasks', 'calendar'],
  },
  custom: {
    label: 'Custom',
    noun: 'space',
    icon: 'sparkles',
    accent: 'emerald',
    description: 'Your name, your icon, the features you choose.',
    heroLine: "Here's what's happening in this space.",
    privacy: 'Shared with members',
    modules: ['tasks'],
    widgets: ['tasks'],
    mobileNav: ['tasks', 'calendar'],
  },
}

export const SHARED_TYPE_KEYS = ['couple', 'family', 'friends', 'office', 'custom']

/** Normalise a raw households row from Supabase into a Space object used by the UI. */
export function toSpace(row, role) {
  const type = SPACE_TYPES[row.room_type] ? row.room_type : 'family'
  const def = SPACE_TYPES[type]
  const asArray = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
  return {
    id: row.id,
    name: row.name,
    type,
    isPersonal: type === 'personal',
    createdBy: row.created_by,
    role: role || 'member',
    isOwner: role === 'owner',
    icon: row.icon || def.icon,
    accent: row.accent || def.accent,
    enabled: asArray(row.enabled_modules),
    cards: asArray(row.overview_modules),
    raw: row,
  }
}
