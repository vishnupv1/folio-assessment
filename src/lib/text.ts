import type { PMNode } from './types'

export function emptyDocument(): PMNode {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

export function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function walk(node: PMNode | undefined, visit: (node: PMNode) => void) {
  if (!node || typeof node !== 'object') return
  visit(node)
  if (Array.isArray(node.content)) {
    for (const child of node.content) walk(child, visit)
  }
}

export function documentText(content: PMNode): string {
  const parts: string[] = []
  walk(content, (node) => {
    if (typeof node.text === 'string') parts.push(node.text)
  })
  return parts.join(' ')
}

export function previewText(content: PMNode, max = 180): string {
  const text = documentText(content).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function formatUpdated(iso: string, now = Date.now()): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return 'Unknown time'
  const sec = Math.round((now - then) / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(then))
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return letters || '?'
}

const AVATAR_COLORS = ['#1f6f64', '#a33b24', '#2c4e7d', '#6b4c7a']

export function avatarColor(id: string): string {
  let n = 0
  for (const char of id) n = (n + char.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[n] ?? AVATAR_COLORS[0]
}
