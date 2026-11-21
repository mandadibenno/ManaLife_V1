import { useState } from 'react'
import { ArrowRight, Database, Sparkles } from 'lucide-react'
import { Showcase } from './Showcase'
import { Logo } from '../../ui/Logo'
import { Button } from '../../ui/Button'
import { useAuth } from '../../hooks/auth'
import { demoAllowed } from '../../lib/supabase'

/** Shown when the build has no Supabase settings. Offers the local demo in development. */
export default function NotConfigured() {
  const { enterDemo } = useAuth()
  const [busy, setBusy] = useState(false)
  return (
    <div className="auth">
      <Showcase />
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-logo">
            <Logo size={38} tagline />
          </div>
          <h2 className="auth-title">Almost there</h2>
          <p className="auth-sub">This copy of ManaLife isn't connected to a database yet.</p>
          <div className="notice">
            <Database size={18} />
            <span>
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then restart. See README.md.
            </span>
          </div>
          {demoAllowed && (
            <>
              <Button
                size="lg"
                full
                icon={Sparkles}
                iconRight={ArrowRight}
                loading={busy}
                onClick={async () => {
                  setBusy(true)
                  await enterDemo()
                }}
                style={{ marginTop: 18 }}
              >
                Explore the demo
              </Button>
              <p className="auth-foot">The demo uses sample data stored only in this browser.</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
