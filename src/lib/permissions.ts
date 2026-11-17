import type { AccessRole } from './types'

// Editors can change the document. Only the owner can share or delete it.

export function canEdit(role: AccessRole): boolean {
  return role === 'owner' || role === 'editor'
}

export function canRename(role: AccessRole): boolean {
  return canEdit(role)
}

export function canManageSharing(role: AccessRole): boolean {
  return role === 'owner'
}

export function canDelete(role: AccessRole): boolean {
  return role === 'owner'
}
