import { useMemo, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ChevronDown, Pencil, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { useGroceries } from '../../hooks/data'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Badge, Card, CheckCircle, EmptyState, SkeletonRows } from '../../ui/Display'
import { Field, Input, SearchInput } from '../../ui/Form'
import { Menu } from '../../ui/Menu'
import { Sheet } from '../../ui/Sheet'
import { useConfirm } from '../../ui/Confirm'
import { useToast } from '../../ui/Toast'
import { shortName } from '../../lib/format'
import { listItem } from '../../motion'
import { useGroceryActions } from './groceryActions'

export default function GroceriesPage() {
  const { space, title, nameOf, userId } = useSpace()
  const { data, isLoading } = useGroceries(space)
  const { add, toggle, update, remove } = useGroceryActions()
  const confirm = useConfirm()
  const toast = useToast()
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [query, setQuery] = useState('')
  const [showBought, setShowBought] = useState(true)
  const [editing, setEditing] = useState(null)

  const { open, bought } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (data || []).filter((g) => !q || g.name.toLowerCase().includes(q))
    return { open: list.filter((g) => !g.checked), bought: list.filter((g) => g.checked) }
  }, [data, query])

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const dup = (data || []).find((g) => !g.checked && g.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (dup) {
      toast.info(`${dup.name} is already on the list`)
      setName('')
      setQty('')
      return
    }
    add.mutate({ name, quantity: qty })
    setName('')
    setQty('')
  }

  async function clearBought() {
    if (await confirm({ title: `Clear ${bought.length} bought ${bought.length === 1 ? 'item' : 'items'}?`, body: 'They will be removed from the list for everyone.', confirmLabel: 'Clear' })) remove.mutate(bought.map((g) => g.id))
  }

  const Row = (g) => (
    <m.div key={g.id} layout="position" className={`list-row ${g.checked ? 'is-done' : ''}`} {...listItem}>
      <CheckCircle checked={g.checked} onChange={(v) => toggle.mutate({ id: g.id, checked: v })} label={`${g.checked ? 'Unmark' : 'Mark'} ${g.name}`} disabled={g.pending} />
      <div className="list-row-main">
        <span className="list-row-title">{g.name}</span>
        <span className="list-row-meta">
          {g.quantity && <span>{g.quantity}</span>}
          {!space.isPersonal && g.added_by && g.added_by !== userId && <span>Added by {shortName(nameOf(g.added_by))}</span>}
        </span>
      </div>
      <div className="list-row-actions reveal">
        <Menu
          label={`Actions for ${g.name}`}
          items={[
            { label: 'Edit', icon: Pencil, onClick: () => setEditing(g) },
            { label: 'Remove', icon: Trash2, tone: 'danger', onClick: () => remove.mutate([g.id]) },
          ]}
        />
      </div>
    </m.div>
  )

  return (
    <Page className="page-narrow">
      <PageHeader eyebrow={space.name} title={title('groceries')} description={space.isPersonal ? 'Things to pick up.' : 'One list everyone can add to and tick off.'} actions={open.length ? <Badge tone="accent">{open.length} to buy</Badge> : null} />

      <Reveal>
        <Card className="grocery-add">
          <form onSubmit={submit} className="grocery-form">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item…" aria-label="Item name" maxLength={150} />
            <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" aria-label="Quantity" maxLength={60} className="grocery-qty" />
            <Button type="submit" icon={Plus} disabled={!name.trim()}>
              Add
            </Button>
          </form>
        </Card>
      </Reveal>

      {(data || []).length > 8 && (
        <Reveal className="toolbar" style={{ marginTop: 14 }}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search the list" />
        </Reveal>
      )}

      <Reveal>
        <Card className="card-list" style={{ marginTop: 14 }}>
          {isLoading ? (
            <SkeletonRows rows={6} />
          ) : open.length === 0 && bought.length === 0 ? (
            <EmptyState icon={ShoppingBasket} title={query ? 'Nothing matches' : 'The list is empty'} body={query ? 'Try another search.' : 'Add the first thing you need above.'} />
          ) : (
            <>
              {open.length === 0 ? <p className="all-done">Everything's in the basket 🎉</p> : <div className="list">{<AnimatePresence initial={false}>{open.map(Row)}</AnimatePresence>}</div>}
              {bought.length > 0 && (
                <div className="bought">
                  <div className="bought-head">
                    <button type="button" className="bought-toggle" onClick={() => setShowBought((s) => !s)} aria-expanded={showBought}>
                      <ChevronDown size={16} style={{ transform: showBought ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }} />
                      Bought · {bought.length}
                    </button>
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={clearBought}>
                      Clear bought
                    </Button>
                  </div>
                  {showBought && (
                    <div className="list">
                      <AnimatePresence initial={false}>{bought.map(Row)}</AnimatePresence>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      </Reveal>

      <EditGrocery item={editing} onClose={() => setEditing(null)} onSave={(values) => update.mutate({ id: editing.id, values }, { onSuccess: () => setEditing(null) })} saving={update.isPending} />
    </Page>
  )
}

function EditGrocery({ item, onClose, onSave, saving }) {
  const [form, setForm] = useState({ name: '', quantity: '' })
  const [lastId, setLastId] = useState(null)
  if (item && item.id !== lastId) {
    setLastId(item.id)
    setForm({ name: item.name, quantity: item.quantity || '' })
  }
  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title="Edit item"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="grocery-edit" loading={saving} disabled={!form.name.trim()}>
            Save
          </Button>
        </>
      }
    >
      <form
        id="grocery-edit"
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (form.name.trim()) onSave(form)
        }}
      >
        <Field label="Item">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={150} />
        </Field>
        <Field label="Quantity" optional>
          <Input value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} maxLength={60} />
        </Field>
      </form>
    </Sheet>
  )
}
