import { Link } from 'react-router-dom'
import { m } from 'motion/react'
import { ArrowRight, Link2, Plus } from 'lucide-react'
import { Page } from '../../ui/Page'
import { Logo } from '../../ui/Logo'
import { SpaceIcon } from '../../ui/Display'
import { useAuth, displayNameOf } from '../../hooks/auth'
import { SHARED_TYPE_KEYS, SPACE_TYPES } from '../../config/spaceTypes'
import { shortName } from '../../lib/format'
import { fadeUp, stagger } from '../../motion'
import { useWorkspace } from '../../hooks/workspace'

/** First run when there is no space yet (only before migration 001 creates My Space automatically). */
export default function Welcome() {
  const { user } = useAuth()
  const { v2 } = useWorkspace()
  return (
    <Page className="page-narrow welcome">
      <m.div variants={stagger(0.07)} initial="hidden" animate="show" className="welcome-inner">
        <m.div variants={fadeUp}>
          <Logo size={44} tagline />
        </m.div>
        <m.h1 variants={fadeUp} className="display welcome-title">
          Welcome, <em>{shortName(displayNameOf(user))}</em>.
        </m.h1>
        <m.p variants={fadeUp} className="muted welcome-sub">
          Create a space for the people you share life with, or join one with a link.
        </m.p>
        <m.div variants={fadeUp} className="welcome-types">
          {SHARED_TYPE_KEYS.filter((t) => v2 || t !== 'couple').map((t) => (
            <span key={t} className="welcome-type">
              <SpaceIcon icon={SPACE_TYPES[t].icon} accent={SPACE_TYPES[t].accent} size={30} />
              {SPACE_TYPES[t].label}
            </span>
          ))}
        </m.div>
        <m.div variants={fadeUp} className="welcome-actions">
          <Link to="/spaces/new" className="welcome-action is-primary">
            <Plus size={20} />
            <span>
              <strong>Create a space</strong>
              <small>Couple, family, friends, office or custom</small>
            </span>
            <ArrowRight size={18} />
          </Link>
          <Link to="/join" className="welcome-action">
            <Link2 size={20} />
            <span>
              <strong>Join with a link or code</strong>
              <small>The owner admits you</small>
            </span>
            <ArrowRight size={18} />
          </Link>
        </m.div>
      </m.div>
    </Page>
  )
}
