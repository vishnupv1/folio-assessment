import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { ALEX } from '@/lib/accounts'
import type { Db } from '@/lib/db'
import { convertHtml } from '@/lib/convert-html'
import { assertEditorDocument } from '@/lib/editor-extensions'
import { downloadName, importExtension, titleFromFilename } from '@/lib/files'
import { htmlToDocument, textToHtml } from '@/lib/import-content'
import { importUploadedFile } from '@/lib/import-file'
import { isHttpError } from '@/lib/errors'
import { documentToMarkdown } from '@/lib/markdown-export'
import { countWords, formatUpdated } from '@/lib/text'
import type { PMNode } from '@/lib/types'
import { getUserByEmail } from '@/lib/users'
import { MAX_UPLOAD_BYTES } from '@/lib/constants'
import { getAccessibleDocument } from '@/lib/documents'
import { stopMemoryServer, testDatabase } from './memory'

const open: Db[] = []

async function db() {
  const database = await testDatabase(false)
  open.push(database)
  return database
}

afterEach(async () => {
  for (const database of open) await database.close()
  open.length = 0
})

afterAll(async () => {
  await stopMemoryServer()
})

function typesOf(node: PMNode, acc = new Set<string>()): Set<string> {
  if (node.type) acc.add(node.type)
  node.content?.forEach((child) => typesOf(child, acc))
  return acc
}

function hasMark(node: PMNode, mark: string): boolean {
  if (node.marks?.some((item) => item.type === mark)) return true
  return (node.content ?? []).some((child) => hasMark(child, mark))
}

describe('import', () => {
  it('recognizes the supported filenames', () => {
    expect(importExtension('Notes.MD')).toBe('md')
    expect(importExtension('file.markdown')).toBe('md')
    expect(importExtension('file.docx')).toBe('docx')
    expect(importExtension('file.txt')).toBe('txt')
    expect(importExtension('file.pdf')).toBeNull()
    expect(titleFromFilename('weekly-update.md')).toBe('weekly update')
    expect(titleFromFilename('.md')).toBe('Imported document')
    expect(downloadName('Q3 planning')).toBe('q3-planning.md')
  })

  it('turns plain text into paragraphs and does not treat tags as HTML', () => {
    expect(textToHtml('one\n\ntwo')).toBe('<p>one</p><p>two</p>')
    const doc = htmlToDocument(textToHtml('<script>alert(1)</script>\n\nHello'))
    expect(typesOf(doc).has('script')).toBe(false)
    expect(JSON.stringify(doc)).toContain('Hello')
    assertEditorDocument(doc)
  })

  it('keeps headings, lists, and marks from Markdown', async () => {
    const database = await db()
    const alex = (await getUserByEmail(database, ALEX.email))!
    const bytes = Buffer.from('# Weekly\n\nA **bold** and *italic* line.\n\n- one\n- two\n')
    const created = await importUploadedFile(database, alex.id, { name: 'weekly-update.md', bytes })
    const doc = await getAccessibleDocument(database, created.id, alex.id)
    expect(doc.title).toBe('weekly update')
    expect(typesOf(doc.content).has('heading')).toBe(true)
    expect(typesOf(doc.content).has('bulletList')).toBe(true)
    expect(hasMark(doc.content, 'bold')).toBe(true)
    expect(hasMark(doc.content, 'italic')).toBe(true)
    expect(documentToMarkdown(doc.content)).toContain('# Weekly')
    expect(documentToMarkdown(doc.content)).toContain('**bold**')
    expect(documentToMarkdown(doc.content)).toContain('- one')
  })

  it('imports the sample files', async () => {
    const database = await db()
    const alex = (await getUserByEmail(database, ALEX.email))!
    const markdown = readFileSync(path.join(process.cwd(), 'samples/weekly-update.md'))
    const fromMarkdown = await importUploadedFile(database, alex.id, {
      name: 'weekly-update.md',
      bytes: markdown,
    })
    const mdDoc = await getAccessibleDocument(database, fromMarkdown.id, alex.id)
    expect(mdDoc.preview).toContain('sharing')
    expect(hasMark(mdDoc.content, 'underline')).toBe(true)

    const docx = readFileSync(path.join(process.cwd(), 'samples/weekly-update.docx'))
    const fromDocx = await importUploadedFile(database, alex.id, {
      name: 'weekly-update.docx',
      bytes: docx,
    })
    const wordDoc = await getAccessibleDocument(database, fromDocx.id, alex.id)
    expect(wordDoc.preview).toContain('Weekly update from Word')
    expect(hasMark(wordDoc.content, 'bold')).toBe(true)
  })

  it('rejects an unsupported or oversized file', async () => {
    const database = await db()
    const alex = (await getUserByEmail(database, ALEX.email))!
    await expect(
      importUploadedFile(database, alex.id, { name: 'notes.pdf', bytes: Buffer.from('hello') }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      importUploadedFile(database, alex.id, {
        name: 'big.txt',
        bytes: Buffer.alloc(MAX_UPLOAD_BYTES + 1, 65),
      }),
    ).rejects.toSatisfy((err: unknown) => isHttpError(err) && err.status === 413)
  })
})

describe('editor json', () => {
  it('builds a document TipTap can open', () => {
    const doc = convertHtml('<p>keep <u>this</u> and <strong>that</strong></p><ul><li>Item</li></ul>')
    assertEditorDocument(doc)
    expect(hasMark(doc, 'underline')).toBe(true)
    expect(hasMark(doc, 'bold')).toBe(true)
    expect(typesOf(doc).has('bulletList')).toBe(true)
  })

  it('exports headings, marks, and lists', () => {
    const markdown = documentToMarkdown({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hello' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Be ' },
            { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }] }],
        },
      ],
    })
    expect(markdown).toContain('## Hello')
    expect(markdown).toContain('**bold**')
    expect(markdown).toContain('- One')
  })
})

describe('labels', () => {
  const now = Date.parse('2026-11-17T12:00:00.000Z')

  it('formats recent edits', () => {
    expect(formatUpdated('2026-11-17T11:59:30.000Z', now)).toBe('Just now')
    expect(formatUpdated('2026-11-17T11:50:00.000Z', now)).toBe('10m ago')
    expect(formatUpdated('2026-11-17T11:00:00.000Z', now)).toBe('1h ago')
    expect(formatUpdated('2026-11-14T12:00:00.000Z', now)).toBe('3d ago')
    expect(formatUpdated('2026-11-01T12:00:00.000Z', now)).toBe('Nov 1')
    expect(countWords('one two  three')).toBe(3)
    expect(countWords('   ')).toBe(0)
  })
})
