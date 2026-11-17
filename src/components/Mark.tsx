export function Mark({ tone = 'pine' }: { tone?: 'pine' | 'cream' }) {
  const page = tone === 'cream' ? '#143f3b' : '#f7f3ea'
  const fold = tone === 'cream' ? '#1f6f64' : '#e4d9c8'
  const ground = tone === 'cream' ? '#f4efe4' : '#1f6f64'
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={ground} />
      <path d="M10 8.5h7.5L22 13v11.2a1.8 1.8 0 0 1-1.8 1.8h-10.4a1.8 1.8 0 0 1-1.8-1.8V10.3a1.8 1.8 0 0 1 1.8-1.8z" fill={page} />
      <path d="M17.5 8.5V13H22" fill={fold} />
    </svg>
  )
}
