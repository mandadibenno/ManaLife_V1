import { useSpace } from '../../app/SpaceContext'
import { keys, useAction } from '../../hooks/data'
import { addGrocery, deleteGroceries, updateGrocery } from '../../services/lists'

export function useGroceryActions() {
  const { space, userId } = useSpace()
  const key = keys.groceries(space.id)

  const add = useAction((item) => addGrocery(space.id, userId, item), {
    invalidate: [key],
    optimistic: { key, update: (old, item) => old && [{ id: `tmp-${Date.now()}`, name: item.name.trim(), quantity: item.quantity || '', checked: false, added_by: userId, pending: true }, ...old] },
  })

  const toggle = useAction(({ id, checked }) => updateGrocery(space.id, id, { checked }), {
    invalidate: [key],
    optimistic: { key, update: (old, { id, checked }) => old && old.map((g) => (g.id === id ? { ...g, checked } : g)) },
  })

  const update = useAction(({ id, values }) => updateGrocery(space.id, id, values), { invalidate: [key], success: 'Item updated' })

  const remove = useAction((ids) => deleteGroceries(space.id, ids), {
    invalidate: [key],
    optimistic: { key, update: (old, ids) => old && old.filter((g) => !ids.includes(g.id)) },
  })

  return { add, toggle, update, remove }
}
