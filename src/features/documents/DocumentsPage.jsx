import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Database, Download, FileImage, FileText, FolderLock, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { keys, useAction, useDocsAvailable, useDocuments } from '../../hooks/data'
import { useToday } from '../../hooks/useToday'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Badge, Card, EmptyState, Skeleton } from '../../ui/Display'
import { ChipGroup, Field, Input, SearchInput, Select, Textarea } from '../../ui/Form'
import { Menu } from '../../ui/Menu'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { useConfirm } from '../../ui/Confirm'
import { bytes, shortName } from '../../lib/format'
import { dateLabel, diffDays } from '../../lib/dates'
import { ACCEPT, DOC_CATEGORIES, MAX_BYTES, deleteDocument, documentUrl, updateDocument, uploadDocument } from '../../services/documents'
import { ease } from '../../motion'

export default function DocumentsPage() {
  const { space, title, userId, nameOf } = useSpace()
  const today = useToday()
  const ok = useDocsAvailable(space)
  const docs = useDocuments(space, ok.data === true)
  const toast = useToast()
  const confirm = useConfirm()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')
  const [editing, setEditing] = useState(null)
  const key = keys.documents(space.id)
  const upload = useAction(({ file, meta }) => uploadDocument(space.id, userId, file, meta), { invalidate: [key], success: 'Document uploaded', onSuccess: () => setEditing(null) })
  const update = useAction(({ id, meta }) => updateDocument(space.id, id, meta), { invalidate: [key], success: 'Details saved', onSuccess: () => setEditing(null) })
  const remove = useAction((doc) => deleteDocument(space.id, doc), { invalidate: [key], success: 'Document deleted' })

  const list = useMemo(() => docs.data || [], [docs.data])
  const cats = ['All', ...new Set(list.map((d) => d.category))]
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter((d) => (cat === 'All' || d.category === cat) && (!q || d.title.toLowerCase().includes(q) || d.file_name.toLowerCase().includes(q) || (d.notes || '').toLowerCase().includes(q)))
  }, [list, query, cat])

  async function open(doc) {
    // Open the tab synchronously (mobile popup blockers), then point it at a 60-second signed URL.
    const win = window.open('', '_blank')
    try {
      const url = await documentUrl(doc.storage_path)
      if (win) win.location.href = url
      else window.location.href = url
    } catch (err) {
      win?.close()
      toast.error(err.message)
    }
  }

  if (ok.isLoading) {
    return (
      <Page>
        <Skeleton height={300} radius={22} />
      </Page>
    )
  }

  if (ok.data === false) {
    return (
      <Page className="page-narrow">
        <PageHeader eyebrow={space.name} title={title('documents')} />
        <Card>
          <EmptyState
            icon={Database}
            title="One database step to go"
            body="Documents need private file storage. The owner of the Supabase project runs supabase/migrations/002_documents.sql once, then this page works for every space."
          />
        </Card>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        eyebrow={space.name}
        title={title('documents')}
        description={space.isPersonal ? 'IDs, policies and records — only you can open them.' : `Stored privately. Only members of ${space.name} can open these files.`}
        actions={
          <Button icon={Upload} onClick={() => setEditing({})}>
            Upload
          </Button>
        }
      />
      {list.length > 0 && (
        <Reveal className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search documents" />
          <ChipGroup size="sm" label="Category" value={cat} onChange={setCat} options={cats} />
        </Reveal>
      )}
      {docs.isLoading ? (
        <div className="doc-grid">
          {[1, 2, 3].map((i) => (
            <Card key={i} style={{ height: 150 }}>
              <Skeleton width="60%" />
            </Card>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderLock}
            title={list.length ? 'No matching documents' : 'Your vault is empty'}
            body={list.length ? 'Try another search or category.' : 'Upload IDs, insurance policies, warranties or school records. Up to 20 MB each.'}
            action={!list.length && <Button icon={Plus} onClick={() => setEditing({})}>Upload a document</Button>}
          />
        </Card>
      ) : (
        <div className="doc-grid">
          <AnimatePresence initial={false}>
            {shown.map((d, i) => {
              const expiringIn = d.expires_on ? diffDays(today, d.expires_on) : null
              const Icon = d.mime_type?.startsWith('image/') ? FileImage : FileText
              return (
                <m.article key={d.id} layout className="doc-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease, delay: Math.min(i * 0.03, 0.2) } }} exit={{ opacity: 0, scale: 0.96 }}>
                  <button type="button" className="doc-open" onClick={() => open(d)} aria-label={`Open ${d.title}`}>
                    <span className="doc-icon">
                      <Icon size={22} />
                    </span>
                    <span className="doc-text">
                      <strong className="truncate">{d.title}</strong>
                      <small className="truncate">
                        {d.file_name} · {bytes(d.size_bytes)}
                      </small>
                    </span>
                  </button>
                  <div className="doc-foot">
                    <Badge>{d.category}</Badge>
                    {expiringIn != null && expiringIn <= 30 && <Badge tone={expiringIn < 0 ? 'danger' : 'warning'}>{expiringIn < 0 ? 'Expired' : `Expires ${dateLabel(d.expires_on)}`}</Badge>}
                    <span className="spacer" />
                    {!space.isPersonal && <span className="subtle doc-by">{d.uploaded_by === userId ? 'You' : shortName(nameOf(d.uploaded_by))}</span>}
                    <Menu
                      label={`Actions for ${d.title}`}
                      items={[
                        { label: 'Open', icon: Download, onClick: () => open(d) },
                        { label: 'Edit details', icon: Pencil, onClick: () => setEditing(d) },
                        {
                          label: 'Delete',
                          icon: Trash2,
                          tone: 'danger',
                          onClick: async () => {
                            if (await confirm({ title: 'Delete document?', body: `“${d.title}” will be permanently deleted${space.isPersonal ? '' : ' for everyone'}.`, confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(d)
                          },
                        },
                      ]}
                    />
                  </div>
                </m.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}
      <DocumentForm
        open={!!editing}
        doc={editing?.id ? editing : null}
        onClose={() => setEditing(null)}
        saving={upload.isPending || update.isPending}
        onSave={({ file, meta }) => (editing?.id ? update.mutate({ id: editing.id, meta }) : upload.mutate({ file, meta }))}
      />
    </Page>
  )
}

function DocumentForm({ open, doc, onClose, onSave, saving }) {
  const [file, setFile] = useState(null)
  const [meta, setMeta] = useState({})
  const [error, setError] = useState('')
  const [lastKey, setLastKey] = useState(null)
  const input = useRef(null)
  const k = open ? doc?.id || 'new' : null
  if (k !== lastKey) {
    setLastKey(k)
    setError('')
    setFile(null)
    setMeta(doc ? { title: doc.title, category: doc.category, expires_on: doc.expires_on || '', notes: doc.notes || '' } : { title: '', category: 'Other', expires_on: '', notes: '' })
  }
  function pick(f) {
    if (!f) return
    if (f.size > MAX_BYTES) return setError('That file is larger than 20 MB.')
    setError('')
    setFile(f)
    if (!meta.title) setMeta((m2) => ({ ...m2, title: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 160) }))
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={doc ? 'Document details' : 'Upload a document'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              if (!doc && !file) return setError('Choose a file')
              if (!meta.title?.trim()) return setError('Give it a title')
              onSave({ file, meta })
            }}
          >
            {doc ? 'Save' : 'Upload'}
          </Button>
        </>
      }
    >
      <div className="form">
        {!doc && (
          <label
            className={`dropzone ${file ? 'has-file' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              pick(e.dataTransfer.files?.[0])
            }}
          >
            <input ref={input} type="file" accept={ACCEPT} onChange={(e) => pick(e.target.files?.[0])} className="sr-only" />
            <Upload size={22} />
            <strong>{file ? file.name : 'Choose a file or drop it here'}</strong>
            <small>{file ? bytes(file.size) : 'PDF, images, Word or Excel · up to 20 MB'}</small>
          </label>
        )}
        <Field label="Title">
          <Input value={meta.title || ''} onChange={(e) => setMeta((x) => ({ ...x, title: e.target.value }))} maxLength={160} />
        </Field>
        <div className="form-row">
          <Field label="Category">
            <Select value={meta.category || 'Other'} onChange={(e) => setMeta((x) => ({ ...x, category: e.target.value }))}>
              {[...new Set([...DOC_CATEGORIES, meta.category || 'Other'])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Expires" optional hint="We'll remind you 30 days before.">
            <Input type="date" value={meta.expires_on || ''} onChange={(e) => setMeta((x) => ({ ...x, expires_on: e.target.value }))} />
          </Field>
        </div>
        <Field label="Notes" optional>
          <Textarea rows={2} maxLength={1000} value={meta.notes || ''} onChange={(e) => setMeta((x) => ({ ...x, notes: e.target.value }))} />
        </Field>
        {error && <p className="field-error">{error}</p>}
      </div>
    </Sheet>
  )
}
