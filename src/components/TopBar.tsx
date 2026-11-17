'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { avatarColor, initials } from '@/lib/text'
import type { PublicUser } from '@/lib/types'
import { LogoutButton } from './LogoutButton'
import { Mark } from './Mark'

export function TopBar({ user, center }: { user: PublicUser; center?: ReactNode }) {
  return (
    <header className="topbar">
      <Link href="/docs" className="brand">
        <Mark />
        Folio
      </Link>
      <div className="topbar-center">{center}</div>
      <div className="who">
        <span className="avatar" style={{ background: avatarColor(user.id) }}>
          {initials(user.name)}
        </span>
        <span className="who-name">{user.name}</span>
        <LogoutButton />
      </div>
    </header>
  )
}
