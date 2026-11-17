import type { PMNode } from './types'

function text(value: string, marks?: PMNode['marks']): PMNode {
  return marks?.length ? { type: 'text', text: value, marks } : { type: 'text', text: value }
}

function paragraph(...nodes: PMNode[]): PMNode {
  return { type: 'paragraph', content: nodes }
}

function heading(level: number, value: string): PMNode {
  return { type: 'heading', attrs: { level }, content: [text(value)] }
}

function item(value: string): PMNode {
  return { type: 'listItem', content: [paragraph(text(value))] }
}

export function planningDocument(): PMNode {
  return {
    type: 'doc',
    content: [
      heading(1, 'Q3 planning'),
      paragraph(
        text('Internal notes for the Folio pilot. '),
        text('Jordan', [{ type: 'bold' }]),
        text(' can edit. '),
        text('Sam', [{ type: 'italic' }]),
        text(' can view. The phrase '),
        text('last save wins', [{ type: 'underline' }]),
        text(' is the concurrency rule.'),
      ),
      heading(2, 'What we are shipping'),
      {
        type: 'bulletList',
        content: [
          item('Rich text that survives a refresh'),
          item('Import from Markdown, text, and Word'),
          item('Sharing with editor and viewer access'),
        ],
      },
      heading(2, 'What we are leaving out'),
      {
        type: 'orderedList',
        attrs: { start: 1 },
        content: [item('Live cursors'), item('Comments'), item('Full version history')],
      },
    ],
  }
}

export function interviewDocument(): PMNode {
  return {
    type: 'doc',
    content: [
      heading(1, 'Interview notes'),
      paragraph(text('Private to Jordan. This note is not shared.')),
      {
        type: 'bulletList',
        content: [item('Role fit'), item('Timeline'), item('Open questions')],
      },
    ],
  }
}
