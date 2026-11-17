import type { PMNode } from './types'

function escapeMd(text: string): string {
  return text.replace(/[\\`*_]/g, (char) => `\\${char}`)
}

function applyMarks(text: string, marks: PMNode['marks']): string {
  let out = text
  const types = new Set((marks ?? []).map((mark) => mark.type))
  if (types.has('code')) out = `\`${out}\``
  if (types.has('italic')) out = `*${out}*`
  if (types.has('bold')) out = `**${out}**`
  if (types.has('strike')) out = `~~${out}~~`
  if (types.has('underline')) out = `<u>${out}</u>`
  return out
}

function inlineContent(node: PMNode): string {
  if (node.type === 'hardBreak') return '\n'
  if (typeof node.text === 'string') return applyMarks(escapeMd(node.text), node.marks)
  return (node.content ?? []).map(inlineContent).join('')
}

function rawText(node: PMNode): string {
  if (typeof node.text === 'string') return node.text
  return (node.content ?? []).map(rawText).join('')
}

function renderListItem(item: PMNode, marker: string): string {
  const parts: string[] = []
  const nested: string[] = []
  for (const child of item.content ?? []) {
    if (child.type === 'bulletList' || child.type === 'orderedList') {
      const rendered = renderBlock(child)
      if (rendered) nested.push(rendered)
      continue
    }
    const bit = child.type === 'paragraph' ? inlineContent(child) : renderBlock(child)
    if (bit) parts.push(bit)
  }
  const line = `${marker}${parts.join(' ')}`
  return nested.length ? `${line}\n${nested.join('\n')}` : line
}

function renderBlock(node: PMNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(renderBlock).filter(Boolean).join('\n\n')
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6)
      return `${'#'.repeat(level)} ${inlineContent(node)}`.trim()
    }
    case 'paragraph':
      return inlineContent(node)
    case 'bulletList':
      return (node.content ?? []).map((item) => renderListItem(item, '- ')).join('\n')
    case 'orderedList':
      return (node.content ?? [])
        .map((item, index) => renderListItem(item, `${index + 1}. `))
        .join('\n')
    case 'blockquote': {
      const inner = (node.content ?? []).map(renderBlock).filter(Boolean).join('\n\n')
      return inner
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    }
    case 'codeBlock': {
      const text = rawText(node).replace(/```/g, "'''")
      return `\`\`\`\n${text}\n\`\`\``
    }
    case 'horizontalRule':
      return '---'
    default:
      return (node.content ?? []).map(renderBlock).filter(Boolean).join('\n\n')
  }
}

export function documentToMarkdown(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const body = renderBlock(content as PMNode).trim()
  return body ? `${body}\n` : ''
}
