export type ShareRole = 'editor' | 'viewer'
export type AccessRole = 'owner' | ShareRole

export type PublicUser = {
  id: string
  email: string
  name: string
}

export type PMMark = {
  type: string
  attrs?: Record<string, unknown>
}

export type PMNode = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: PMMark[]
  content?: PMNode[]
}

export type Roster = {
  owner: PublicUser
  shares: { user: PublicUser; role: ShareRole }[]
}

export type OwnedListItem = {
  id: string
  title: string
  preview: string
  updatedAt: string
  updatedLabel: string
}

export type SharedListItem = OwnedListItem & {
  role: ShareRole
  ownerName: string
}

export type DocumentLists = {
  owned: OwnedListItem[]
  shared: SharedListItem[]
}

export type EditorPayload = {
  id: string
  title: string
  content: PMNode
  preview: string
  updatedAt: string
  updatedLabel: string
  access: AccessRole
  owner: PublicUser
  updatedBy: PublicUser
  roster: Roster
}

export type SavedDocument = {
  id: string
  title: string
  updatedAt: string
  updatedBy: PublicUser
  preview: string
}
