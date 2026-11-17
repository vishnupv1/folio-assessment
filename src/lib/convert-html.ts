import { parseHTML } from 'linkedom'
import type { PMNode } from './types'

const ELEMENT = 1
const TEXT = 3

const BLOCKS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'thead',
  'tr',
  'ul',
])

type DomNode = {
  nodeType: number
  tagName?: string
  textContent: string | null
  childNodes: ArrayLike<DomNode>
}

type Mark = { type: string }

function nodesOf(list: ArrayLike<DomNode> | undefined): DomNode[] {
  return list ? Array.from(list) : []
}

function tagName(node: DomNode): string {
  return node.tagName?.toLowerCase() ?? ''
}

function sameMarks(a: PMNode['marks'], b: Mark[]): boolean {
  const left = a ?? []
  if (left.length !== b.length) return false
  return left.every((mark, index) => mark.type === b[index]?.type)
}

function pushText(out: PMNode[], text: string, marks: Mark[]) {
  if (!text) return
  const prev = out[out.length - 1]
  if (prev?.type === 'text' && sameMarks(prev.marks, marks)) {
    prev.text = `${prev.text ?? ''}${text}`
    return
  }
  const node: PMNode = { type: 'text', text }
  if (marks.length) node.marks = marks.map((mark) => ({ type: mark.type }))
  out.push(node)
}

function withMark(marks: Mark[], type: string): Mark[] {
  if (marks.some((mark) => mark.type === type)) return marks
  return [...marks, { type }]
}

function meaningful(content: PMNode[]): boolean {
  return content.some((node) => {
    if (node.type === 'text') return Boolean(node.text && node.text.trim().length > 0)
    return true
  })
}

function inline(nodes: DomNode[], marks: Mark[] = []): PMNode[] {
  const out: PMNode[] = []
  for (const node of nodes) {
    if (node.nodeType === TEXT) {
      const text = (node.textContent ?? '').replace(/\s+/g, ' ')
      if (!text) continue
      pushText(out, text, marks)
      continue
    }
    if (node.nodeType !== ELEMENT || !node.tagName) continue
    const tag = tagName(node)
    if (tag === 'br') {
      out.push({ type: 'hardBreak' })
      continue
    }
    if (tag === 'img' || tag === 'script' || tag === 'style') continue
    let next = marks
    if (tag === 'strong' || tag === 'b') next = withMark(marks, 'bold')
    else if (tag === 'em' || tag === 'i') next = withMark(marks, 'italic')
    else if (tag === 'u') next = withMark(marks, 'underline')
    else if (tag === 's' || tag === 'strike' || tag === 'del') next = withMark(marks, 'strike')
    else if (tag === 'code') next = withMark(marks, 'code')
    out.push(...inline(nodesOf(node.childNodes), next))
  }
  return out
}

function paragraph(el: DomNode): PMNode {
  const content = inline(nodesOf(el.childNodes))
  if (!meaningful(content)) return { type: 'paragraph' }
  return { type: 'paragraph', content }
}

function heading(el: DomNode, tag: string): PMNode | null {
  const level = Math.min(Number(tag.slice(1)) || 1, 3)
  const content = inline(nodesOf(el.childNodes))
  if (!meaningful(content)) return null
  return { type: 'heading', attrs: { level }, content }
}

function listItem(el: DomNode): PMNode {
  let content = blocksFrom(nodesOf(el.childNodes))
  if (!content.length) content = [{ type: 'paragraph' }]
  if (content[0]?.type !== 'paragraph') content = [{ type: 'paragraph' }, ...content]
  return { type: 'listItem', content }
}

function list(el: DomNode, type: 'bulletList' | 'orderedList'): PMNode | null {
  const items = nodesOf(el.childNodes)
    .filter((node) => tagName(node) === 'li')
    .map(listItem)
  if (!items.length) return null
  if (type === 'orderedList') return { type, attrs: { start: 1 }, content: items }
  return { type, content: items }
}

function codeBlock(el: DomNode): PMNode | null {
  const text = el.textContent ?? ''
  if (!text.trim()) return null
  return { type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text }] }
}

function elementsNamed(node: DomNode, names: Set<string>, acc: DomNode[] = []): DomNode[] {
  for (const child of nodesOf(node.childNodes)) {
    if (names.has(tagName(child))) acc.push(child)
    elementsNamed(child, names, acc)
  }
  return acc
}

function tableToBlocks(table: DomNode): PMNode[] {
  const rows = elementsNamed(table, new Set(['tr']))
  const blocks: PMNode[] = []
  for (const row of rows) {
    const cells = elementsNamed(row, new Set(['td', 'th']))
    const content: PMNode[] = []
    cells.forEach((cell) => {
      const cellContent = inline(nodesOf(cell.childNodes))
      if (!meaningful(cellContent)) return
      if (content.length) pushText(content, ' | ', [])
      content.push(...cellContent)
    })
    if (meaningful(content)) blocks.push({ type: 'paragraph', content })
  }
  return blocks
}

function block(el: DomNode): PMNode | PMNode[] | null {
  const tag = tagName(el)
  if (tag === 'p') return paragraph(el)
  if (/^h[1-6]$/.test(tag)) return heading(el, tag)
  if (tag === 'ul') return list(el, 'bulletList')
  if (tag === 'ol') return list(el, 'orderedList')
  if (tag === 'blockquote') {
    const content = blocksFrom(nodesOf(el.childNodes))
    if (!content.length) return null
    return { type: 'blockquote', content }
  }
  if (tag === 'pre') return codeBlock(el)
  if (tag === 'hr') return { type: 'horizontalRule' }
  if (tag === 'table') return tableToBlocks(el)
  if (tag === 'li') return listItem(el)
  return blocksFrom(nodesOf(el.childNodes))
}

function blocksFrom(nodes: DomNode[]): PMNode[] {
  const result: PMNode[] = []
  let inlineRun: DomNode[] = []
  const flush = () => {
    if (!inlineRun.length) return
    const content = inline(inlineRun)
    inlineRun = []
    if (meaningful(content)) result.push({ type: 'paragraph', content })
  }

  for (const node of nodes) {
    if (node.nodeType === TEXT) {
      if ((node.textContent ?? '').trim()) inlineRun.push(node)
      continue
    }
    if (node.nodeType !== ELEMENT || !node.tagName) continue
    const tag = tagName(node)
    if (BLOCKS.has(tag)) {
      flush()
      const next = block(node)
      if (!next) continue
      if (Array.isArray(next)) result.push(...next)
      else result.push(next)
      continue
    }
    inlineRun.push(node)
  }
  flush()
  return result
}

export function convertHtml(html: string): PMNode {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`)
  const body = document.body as unknown as DomNode
  const content = blocksFrom(nodesOf(body?.childNodes))
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}
