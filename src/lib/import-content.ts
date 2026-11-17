import mammoth from 'mammoth'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { convertHtml } from './convert-html'
import { assertEditorDocument } from './editor-extensions'
import { HttpError } from './errors'
import { escapeHtml } from './html'
import type { PMNode } from './types'

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'del',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
    'hr',
    'div',
    'span',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
}

export function sanitizeImportedHtml(html: string): string {
  const withoutActive = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
  return sanitizeHtml(withoutActive, SANITIZE)
}

export function textToHtml(text: string): string {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) return '<p></p>'
  return normalized
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function markdownToHtml(markdown: string): string {
  const parsed = marked.parse(markdown, { async: false })
  if (typeof parsed !== 'string') {
    throw new HttpError(400, 'Could not read that Markdown file.')
  }
  return parsed
}

export async function docxToHtml(bytes: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer: bytes })
    return result.value || '<p></p>'
  } catch (err) {
    console.error(err)
    throw new HttpError(400, 'Could not read that Word file. Try re-saving it as .docx.')
  }
}

export function htmlToDocument(html: string): PMNode {
  const content = convertHtml(sanitizeImportedHtml(html))
  try {
    assertEditorDocument(content)
  } catch (err) {
    console.error(err)
    throw new HttpError(400, 'Could not read the formatting in that file.')
  }
  return content
}
