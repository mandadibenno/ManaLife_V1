// TanStack Query hooks: one cache for every module. Replaces V1's independent polling loops.
// Shared spaces refetch every 30 s while visible (and on focus); personal data refetches on focus.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../ui/Toast'
import * as spaces from '../services/spaces'
import * as tasks from '../services/tasks'
import * as lists from '../services/lists'
import * as money from '../services/money'
import * as routines from '../services/routines'
import * as health from '../services/health'
import * as docs from '../services/documents'

export const keys = {
  members: (s) => ['members', s],
  tasks: (s) => ['tasks', s],
  groceries: (s) => ['groceries', s],
  bills: (s) => ['bills', s],
  events: (s) => ['events', s],
  expenses: (s, m) => ['expenses', s, m],
  budget: (s, m) => ['budget', s, m],
  habits: (s) => ['habits', s],
  meals: (s, w) => ['meals', s, w],
  medicines: (u) => ['medicines', u],
  doses: (u, from, to) => ['doses', u, from, to],
  recentDoses: (u) => ['recent-doses', u],
  periods: (u) => ['periods', u],
  shares: (s, u) => ['period-shares', s, u],
  sharedWithMe: (s, u) => ['shared-with-me', s, u],
  sharedPeriods: (o) => ['shared-periods', o],
  documents: (s) => ['documents', s],
  docsAvailable: (s) => ['documents-available', s],
  joins: (s) => ['joins', s],
}

const live = (space) => (space && !space.isPersonal ? { refetchInterval: 30_000, refetchIntervalInBackground: false } : {})

export const useMembers = (space) =>
  useQuery({ queryKey: keys.members(space?.id), queryFn: () => spaces.listMembers(space.id), enabled: !!space, staleTime: 60_000 })

export const useTasks = (space) =>
  useQuery({ queryKey: keys.tasks(space?.id), queryFn: () => tasks.listTasks(space.id), enabled: !!space, ...live(space) })

export const useGroceries = (space) =>
  useQuery({ queryKey: keys.groceries(space?.id), queryFn: () => lists.listGroceries(space.id), enabled: !!space, ...live(space) })

export const useBills = (space) =>
  useQuery({ queryKey: keys.bills(space?.id), queryFn: () => lists.listBills(space.id), enabled: !!space, ...live(space) })

export const useEvents = (space) =>
  useQuery({ queryKey: keys.events(space?.id), queryFn: () => lists.listEvents(space.id), enabled: !!space, ...live(space) })

export const useExpenses = (space, month) =>
  useQuery({ queryKey: keys.expenses(space?.id, month), queryFn: () => money.listExpenses(space.id, month), enabled: !!space, ...live(space) })

export const useBudget = (space, month) =>
  useQuery({ queryKey: keys.budget(space?.id, month), queryFn: () => money.getBudget(space.id, month), enabled: !!space })

export const useHabits = (space) =>
  useQuery({ queryKey: keys.habits(space?.id), queryFn: () => routines.listHabits(space.id), enabled: !!space, ...live(space) })

export const useMeals = (space, week) =>
  useQuery({ queryKey: keys.meals(space?.id, week), queryFn: () => routines.listMeals(space.id, week), enabled: !!space, ...live(space) })

export const useMedicines = (userId) =>
  useQuery({ queryKey: keys.medicines(userId), queryFn: () => health.listMedicines(userId), enabled: !!userId })

export const useDoseLogs = (userId, from, to = from) =>
  useQuery({ queryKey: keys.doses(userId, from, to), queryFn: () => health.listDoseLogs(userId, from, to), enabled: !!userId })

export const useRecentDoses = (userId) =>
  useQuery({ queryKey: keys.recentDoses(userId), queryFn: () => health.recentDoseLogs(userId), enabled: !!userId })

export const usePeriods = (userId, enabled = true) =>
  useQuery({ queryKey: keys.periods(userId), queryFn: () => health.listPeriods(userId), enabled: !!userId && enabled })

export const useMyShares = (space, userId) =>
  useQuery({ queryKey: keys.shares(space?.id, userId), queryFn: () => health.listMyShares(space.id, userId), enabled: !!space && !!userId })

export const useSharedWithMe = (space, userId, enabled = true) =>
  useQuery({
    queryKey: keys.sharedWithMe(space?.id, userId),
    queryFn: () => health.sharedWithMe(space.id, userId),
    enabled: !!space && !!userId && enabled,
    refetchInterval: 60_000,
    retry: false,
  })

export const useSharedPeriods = (ownerId) =>
  useQuery({ queryKey: keys.sharedPeriods(ownerId), queryFn: () => health.listSharedPeriods(ownerId), enabled: !!ownerId })

export const useDocsAvailable = (space) =>
  useQuery({ queryKey: keys.docsAvailable(space?.id), queryFn: () => docs.documentsAvailable(space.id), enabled: !!space, staleTime: 300_000, retry: 1 })

export const useDocuments = (space, enabled = true) =>
  useQuery({ queryKey: keys.documents(space?.id), queryFn: () => docs.listDocuments(space.id), enabled: !!space && enabled, ...live(space) })

/**
 * Mutation with consistent UX: error toast, optional success toast, cache invalidation,
 * and optional optimistic update ({ key, update(old, vars) }).
 */
export function useAction(fn, { invalidate = [], success, optimistic, onSuccess } = {}) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: fn,
    onMutate: async (vars) => {
      if (!optimistic) return undefined
      const key = typeof optimistic.key === 'function' ? optimistic.key(vars) : optimistic.key
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      if (previous !== undefined) qc.setQueryData(key, (old) => optimistic.update(old, vars))
      return { key, previous }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.key) qc.setQueryData(ctx.key, ctx.previous)
      toast.error(err?.message || 'Something went wrong')
    },
    onSuccess: (data, vars) => {
      if (success) toast.success(typeof success === 'function' ? success(data, vars) : success)
      onSuccess?.(data, vars)
    },
    onSettled: (_d, _e, vars) => {
      const list = typeof invalidate === 'function' ? invalidate(vars) : invalidate
      list.forEach((k) => qc.invalidateQueries({ queryKey: k }))
    },
  })
}
