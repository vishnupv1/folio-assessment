import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const require = createRequire('/tmp/folio-record/package.json')
const { chromium } = require('playwright')

const root = '/Users/vishnupv/Desktop/Assignment'
const audioDir = path.join(root, '.walkthrough-audio')
const lines = [
  'This is Folio, a small shared document editor. You can create a document, format it, import a file, and share it with someone else. Live cursors, comments, and version history are not in this build. If two people save at once, the last save wins, and the other person reloads.',
  'Signing in as Alex Rivera, the owner. The demo password is folio demo.',
  'Q3 planning is under Your documents. Shared with you is empty, because Alex owns this note.',
  'The heading, the lists, and the bold, italic, and underline text were loaded from the database. I will add a sentence and wait until it says Saved.',
  'Share shows Jordan can edit and Sam can view. Only the owner can change sharing, or delete the document.',
  'Now Sam. Q3 planning is under Shared with you, marked view only. Your documents is empty.',
  'The formatting toolbar is gone. Sam can read the note. The banner says to ask Alex for edit access.',
  'Jordan can edit the shared note. I will add a few words and wait for Saved.',
  'Interview notes belongs to Jordan. It is private, so it does not appear for Sam.',
  'Importing a Markdown file creates a new editable document. Text, Markdown, and Word files are supported, up to 2 megabytes. Images in Word files are dropped.',
  'Realtime editing was left out on purpose. Sharing is people and roles, not a public link. The coding agent wrote much of the implementation. The permission split, and the automated tests, were deliberate.',
]

async function sayToFile(text, file) {
  try {
    await exec('say', ['-v', 'Samantha', '-r', '152', '-o', file, text])
  } catch {
    await exec('say', ['-r', '152', '-o', file, text])
  }
}

async function saved(page) {
  await page
    .locator('[data-state="unsaved"], [data-state="saving"]')
    .first()
    .waitFor({ timeout: 4000 })
    .catch(() => {})
  await page.locator('[data-state="saved"]').waitFor({ timeout: 10000 })
}

const files = []
await mkdir(audioDir, { recursive: true })
for (let i = 0; i < lines.length; i += 1) {
  const file = path.join(audioDir, `${i}.aiff`)
  await sayToFile(lines[i], file)
  files.push(file)
  console.log(`narration ${i + 1}/${lines.length}`)
}

const browser = await chromium.launch({ headless: false, slowMo: 180 })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: audioDir, size: { width: 1440, height: 900 } },
})
const page = await context.newPage()
const parts = []
let cursor = Date.now()
let line = 0

async function narrate() {
  const gap = Date.now() - cursor
  if (gap > 40) parts.push({ ms: gap })
  const file = files[line]
  line += 1
  parts.push({ file })
  await exec('afplay', [file])
  cursor = Date.now()
}

async function hold(page, ms) {
  await page.waitForTimeout(ms)
}

let finished = false
try {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Continue' }).waitFor()
  await narrate()
  await hold(page, 4000)
  await narrate()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('heading', { name: 'Documents', exact: true }).waitFor()
  await narrate()
  await hold(page, 12000)
  await page.getByRole('link', { name: /Q3 planning/ }).click()
  await page.getByRole('button', { name: 'Bold' }).waitFor()
  await narrate()
  await page.locator('.ProseMirror p').first().click({ position: { x: 8, y: 6 } })
  await page.keyboard.press('Home')
  await page.keyboard.type('Added during the walkthrough. ')
  await saved(page)
  await hold(page, 6000)
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await page.getByRole('dialog', { name: 'Share' }).waitFor()
  await page.getByText('Jordan Hale').waitFor()
  await narrate()
  await hold(page, 10000)
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByRole('button', { name: /Sam Okonkwo/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('heading', { name: 'Documents', exact: true }).waitFor()
  await page.getByText('View only').first().waitFor()
  await narrate()
  await hold(page, 11000)
  await page.getByRole('link', { name: /Q3 planning/ }).click()
  await page.getByText('Ask Alex Rivera').waitFor()
  await narrate()
  await page.locator('.ProseMirror').click()
  await hold(page, 9000)
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByRole('button', { name: /Jordan Hale/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('heading', { name: 'Documents', exact: true }).waitFor()
  await page.getByRole('link', { name: /Q3 planning/ }).click()
  await page.getByRole('button', { name: 'Bold' }).waitFor()
  await narrate()
  await page.locator('.ProseMirror p').first().click({ position: { x: 8, y: 6 } })
  await page.keyboard.press('Home')
  await page.keyboard.type('Jordan edited this shared note. ')
  await saved(page)
  await hold(page, 6000)
  await page.getByRole('link', { name: 'Folio', exact: true }).click()
  await page.getByRole('link', { name: /Interview notes/ }).click()
  await page.getByRole('heading', { name: 'Interview notes', exact: true }).waitFor()
  await narrate()
  await hold(page, 11000)
  await page.getByRole('link', { name: 'Folio', exact: true }).click()
  await page.getByRole('heading', { name: 'Documents', exact: true }).waitFor()
  await hold(page, 3000)
  await page.locator('input[type="file"]').setInputFiles(path.join(root, 'samples/weekly-update.md'))
  await page.getByRole('heading', { name: 'Weekly update', exact: true }).waitFor({ timeout: 15000 })
  await narrate()
  await page.mouse.wheel(0, 280)
  await hold(page, 11000)
  await narrate()
  await hold(page, 8000)
  finished = true
} finally {
  if (!finished) {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
    throw new Error('Walkthrough did not finish. Left the previous walkthrough.mp4 in place.')
  }
  const gap = Date.now() - cursor
  if (gap > 40) parts.push({ ms: gap })
  const webmPath = await page.video().path()
  await context.close()
  await browser.close()
  console.log('video frames saved', webmPath)

  const list = []
  for (let i = 0; i < parts.length; i += 1) {
    const wav = path.join(audioDir, `part-${i}.wav`)
    const part = parts[i]
    if (part.file) {
      await exec('ffmpeg', ['-y', '-i', part.file, '-ar', '44100', '-ac', '1', wav])
    } else {
      const seconds = Math.max(part.ms / 1000, 0.05).toFixed(3)
      await exec('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', seconds, wav])
    }
    list.push(`file '${wav}'`)
  }
  const listPath = path.join(audioDir, 'list.txt')
  await writeFile(listPath, list.join('\n'))
  const narration = path.join(audioDir, 'narration.m4a')
  await exec('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:a', 'aac', narration])
  const mp4 = path.join(root, 'walkthrough.mp4')
  await exec('ffmpeg', [
    '-y',
    '-i',
    webmPath,
    '-i',
    narration,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    mp4,
  ])
  console.log('wrote', mp4)
}
