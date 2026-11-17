'use client'

import type { Editor } from '@tiptap/react'

function ToolButton({
  label,
  className,
  active,
  disabled,
  onClick,
}: {
  label: string
  className?: string
  active?: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={active ? `tool is-active ${className ?? ''}` : `tool ${className ?? ''}`}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function Toolbar({ editor }: { editor: Editor | null }) {
  const disabled = !editor?.isEditable
  const run = (action: (ed: Editor) => void) => {
    if (!editor) return
    action(editor)
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton label="Undo" disabled={disabled} onClick={() => run((ed) => ed.chain().focus().undo().run())} />
      <ToolButton label="Redo" disabled={disabled} onClick={() => run((ed) => ed.chain().focus().redo().run())} />
      <span className="tool-sep" />
      <ToolButton
        label="H1"
        active={editor?.isActive('heading', { level: 1 })}
        disabled={disabled}
        onClick={() => run((ed) => ed.chain().focus().toggleHeading({ level: 1 }).run())}
      />
      <ToolButton
        label="H2"
        active={editor?.isActive('heading', { level: 2 })}
        disabled={disabled}
        onClick={() => run((ed) => ed.chain().focus().toggleHeading({ level: 2 }).run())}
      />
      <ToolButton
        label="H3"
        active={editor?.isActive('heading', { level: 3 })}
        disabled={disabled}
        onClick={() => run((ed) => ed.chain().focus().toggleHeading({ level: 3 }).run())}
      />
      <span className="tool-sep" />
      <ToolButton
        label="Bold"
        className="bold"
        active={editor?.isActive('bold')}
        disabled={disabled}
        onClick={() => run((ed) => ed.chain().focus().toggleBold().run())}
      />
      <ToolButton
        label="Italic"
        className="italic"
        active={editor?.isActive('italic')}
        disabled={disabled}
        onClick={() => run((ed) => ed.chain().focus().toggleItalic().run())}
      />
      <ToolButton
        label="Underline"
        className="underline"
        active={editor?.isActive('underline')}
        disabled={disabled}
        onClick={() => run((ed) => ed.chain().focus().toggleUnderline().run())}
      />
      <span className="tool-sep" />
      <ToolButton
        label="Bullets"
        active={editor?.isActive('bulletList')}
        disabled={disabled}
        onClick={() => run((ed) => ed.chain().focus().toggleBulletList().run())}
      />
      <ToolButton
        label="Numbered"
        active={editor?.isActive('orderedList')}
        disabled={disabled}
        onClick={() => run((ed) => ed.chain().focus().toggleOrderedList().run())}
      />
    </div>
  )
}
