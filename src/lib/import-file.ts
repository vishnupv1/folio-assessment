import { MAX_UPLOAD_BYTES } from './constants'
import type { Db } from './db'
import { createDocument } from './documents'
import { HttpError } from './errors'
import { importExtension, titleFromFilename } from './files'
import { docxToHtml, htmlToDocument, markdownToHtml, textToHtml } from './import-content'
import { parseTitle } from './validators'

export async function importUploadedFile(
  db: Db,
  userId: string,
  file: { name: string; bytes: Buffer },
): Promise<{ id: string }> {
  if (!file.name) throw new HttpError(400, 'Choose a file to import')
  if (file.bytes.length === 0) throw new HttpError(400, 'That file is empty')
  if (file.bytes.length > MAX_UPLOAD_BYTES) throw new HttpError(413, 'That file is larger than 2 MB.')
  const ext = importExtension(file.name)
  if (!ext) throw new HttpError(400, 'Import a .txt, .md, or .docx file.')

  let html: string
  if (ext === 'docx') {
    html = await docxToHtml(file.bytes)
  } else {
    if (file.bytes.includes(0)) throw new HttpError(400, 'That file does not look like plain text.')
    const text = file.bytes.toString('utf8')
    html = ext === 'md' ? markdownToHtml(text) : textToHtml(text)
  }

  const content = htmlToDocument(html)
  const title = parseTitle(titleFromFilename(file.name))
  return createDocument(db, userId, { title, content })
}
