'use client'

import { useState } from 'react'
import { ACCOUNTS, DEMO_PASSWORD } from '@/lib/accounts'
import { Mark } from './Mark'

export function LoginForm() {
  const [email, setEmail] = useState(ACCOUNTS[0]?.email ?? '')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Could not sign in')
      setPending(false)
      return
    }
    window.location.href = '/docs'
  }

  return (
    <div className="login">
      <aside className="login-aside">
        <div>
          <div className="login-brand">
            <Mark tone="cream" />
            Folio
          </div>
          <h1>Shared documents for the team.</h1>
          <ul>
            <li>Create a document and format it.</li>
            <li>Import Markdown, text, or Word.</li>
            <li>Share it as an editor or a viewer.</li>
          </ul>
        </div>
        <p className="aside-note">Access stays with people, not with a public link.</p>
      </aside>
      <main id="main" className="login-panel">
        <form className="login-card" onSubmit={(event) => void onSubmit(event)}>
          <p className="eyebrow">Ajaia internal</p>
          <h2>Sign in</h2>
          <p className="password-hint">
            Demo password for every account: <strong>{DEMO_PASSWORD}</strong>
          </p>
          <div className="accounts">
            {ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                className={email === account.email ? 'account is-selected' : 'account'}
                aria-pressed={email === account.email}
                onClick={() => setEmail(account.email)}
              >
                <strong>{account.name}</strong>
                <span>{account.email}</span>
                <small>{account.hint}</small>
              </button>
            ))}
          </div>
          <label className="stack">
            Email
            <input
              className="field"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="stack">
            Password
            <input
              className="field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </main>
    </div>
  )
}
