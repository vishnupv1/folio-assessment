export type ImportKind = 'txt' | 'md' | 'docx'

export function importExtension(filename: string): ImportKind | null {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md'
  if (lower.endsWith('.txt')) return 'txt'
  return null
}

export function titleFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || 'Imported document'
  const stripped = base.replace(/\.(txt|md|markdown|docx)$/i, '')
  const cleaned = stripped.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return (cleaned || 'Imported document').slice(0, 180)
}

export function downloadName(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'document'}.md`
}
