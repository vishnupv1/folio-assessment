import { getSchema } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'

const starter = StarterKit.configure({
  heading: { levels: [1, 2, 3] },
})

export const schemaExtensions = [starter, Underline]

export function editorExtensions(placeholder = 'Start writing…') {
  return [
    ...schemaExtensions,
    Placeholder.configure({ placeholder }),
  ]
}

let schema: ReturnType<typeof getSchema> | null = null

function editorSchema() {
  if (!schema) schema = getSchema(schemaExtensions)
  return schema
}

export function assertEditorDocument(content: unknown) {
  editorSchema().nodeFromJSON(content)
}
