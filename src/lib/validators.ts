import { MAX_CONTENT_CHARS } from './constants'
import { HttpError } from './errors'
import { normalizeTitle } from './text'
import type { PMNode, ShareRole } from './types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(input: unknown): string {
  if (typeof input !== 'string') throw new HttpError(400, 'Enter a valid email address')
  const email = input.trim().toLowerCase()
  if (email.length > 200 || !EMAIL.test(email)) {
    throw new HttpError(400, 'Enter a valid email address')
  }
  return email
}

export function parseTitle(input: unknown): string {
  if (typeof input !== 'string') throw new HttpError(400, 'Title must be text')
  const title = normalizeTitle(input)
  if (!title) throw new HttpError(400, "Title can't be empty")
  if (title.length > 180) throw new HttpError(400, 'Title must be 180 characters or fewer')
  return title
}

export function parseRole(input: unknown): ShareRole {
  if (input !== 'editor' && input !== 'viewer') {
    throw new HttpError(400, 'Role must be editor or viewer')
  }
  return input
}

export function parseContent(input: unknown): PMNode {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Content must be a document')
  }
  const node = input as PMNode
  if (node.type !== 'doc' || !Array.isArray(node.content)) {
    throw new HttpError(400, 'Content must be a document')
  }
  let raw = ''
  try {
    raw = JSON.stringify(node)
  } catch {
    throw new HttpError(400, 'Content must be a document')
  }
  if (raw.length > MAX_CONTENT_CHARS) {
    throw new HttpError(413, 'This document is too large to save')
  }
  return node
}
