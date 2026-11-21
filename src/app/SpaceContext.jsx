import { createContext, useContext, useMemo } from 'react'
import { useAuth } from '../hooks/auth'
import { useMembers, useSharedWithMe } from '../hooks/data'
import { enabledModules } from '../hooks/workspace'
import { MODULES, MODULE_ORDER, moduleTitle } from '../config/modules'
import { SPACE_TYPES } from '../config/spaceTypes'

const SpaceContext = createContext(null)

export function cycleTrackingEnabled(user) {
  const md = user?.user_metadata || {}
  return typeof md.cycle_tracking === 'boolean' ? md.cycle_tracking : md.gender === 'female'
}

export function SpaceProvider({ space, children }) {
  const { user } = useAuth()
  const members = useMembers(space)
  // Partner cycle view: only in couple/family spaces, only if a member explicitly granted access.
  const canHaveShares = !space.isPersonal && (space.type === 'couple' || space.type === 'family')
  const shared = useSharedWithMe(space, user.id, canHaveShares)

  const value = useMemo(() => {
    const enabled = enabledModules(space)
    const modules = MODULE_ORDER.filter((key) => {
      if (key === 'periods') {
        if (space.isPersonal) return enabled.includes('periods') && cycleTrackingEnabled(user)
        return canHaveShares && (shared.data || []).length > 0
      }
      if (key === 'medicines') return space.isPersonal && enabled.includes('medicines')
      return enabled.includes(key)
    })
    const people = members.data || []
    return {
      space,
      type: SPACE_TYPES[space.type],
      user,
      userId: user.id,
      members: people,
      membersLoading: members.isLoading,
      nameOf: (id) => people.find((p) => p.id === id)?.display_name || (id === user.id ? 'You' : 'Member'),
      modules,
      has: (key) => modules.includes(key),
      title: (key) => moduleTitle(key, space.type),
      icon: (key) => MODULES[key]?.icon,
      sharedCycleOwners: shared.data || [],
      basePath: `/space/${space.id}`,
    }
  }, [space, user, members.data, members.isLoading, shared.data, canHaveShares])

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>
}

export const useSpace = () => useContext(SpaceContext)
