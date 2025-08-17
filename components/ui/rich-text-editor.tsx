'use client'

import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { cn } from '@/lib/utils'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Link as LinkIcon,
  List,
  ListOrdered,
  Type,
  Palette,
  Undo,
  Redo,
  Code
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = 'テキストを入力してください...',
  className 
}: RichTextEditorProps) {
  console.log('[RichTextEditor] Initial content prop:', content);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        // StarterKitに含まれる機能を明示的に無効化（必要に応じて）
        // LinkとUnderlineは含まれていないので問題なし
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800'
        }
      }),
      Underline,
      TextStyle,
      Color
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      console.log('[RichTextEditor] Content updated:', html);
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-3 py-2 min-h-[150px] focus:outline-none',
        // ブラウザ拡張機能との競合を避けるため、データ属性を追加
        'data-editor': 'rich-text',
      }
    },
    // エディターを即座に作成
    immediatelyRender: false
  })

  // contentプロパティが変更された時にエディターの内容を更新
  // 初回レンダリング時のみcontentを設定
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // エディターの内容が空で、contentが提供されている場合のみ設定
      const currentContent = editor.getHTML()
      console.log('[RichTextEditor.useEffect] Current editor content:', currentContent);
      console.log('[RichTextEditor.useEffect] Content prop:', content);
      
      if (currentContent === '<p></p>' && content && content !== '<p></p>') {
        console.log('[RichTextEditor.useEffect] Setting content to editor:', content);
        editor.commands.setContent(content)
      }
    }
  }, [editor]) // contentを依存配列から除外して、初回のみ実行

  // エディターのクリーンアップ
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy()
      }
    }
  }, [editor])

  if (!editor) {
    return null
  }

  const setLink = () => {
    const url = window.prompt('URLを入力してください:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    disabled = false,
    children,
    title 
  }: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
    title?: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded hover:bg-gray-100 transition-colors',
        active && 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      type="button"
    >
      {children}
    </button>
  )

  const ColorButton = ({ color, title }: { color: string; title: string }) => (
    <button
      onClick={() => editor.chain().focus().setColor(color).run()}
      title={title}
      className="p-1 rounded hover:bg-gray-100 transition-colors"
      type="button"
    >
      <div 
        className="w-6 h-6 rounded border border-gray-300" 
        style={{ backgroundColor: color }}
      />
    </button>
  )

  const FontSizeButton = ({ size, label }: { size: string; label: string }) => (
    <button
      onClick={() => {
        editor.chain().focus().setMark('textStyle', { fontSize: size }).run()
      }}
      className={cn(
        'px-3 py-1 rounded hover:bg-gray-100 transition-colors text-sm',
        editor.isActive('textStyle', { fontSize: size }) && 'bg-gray-200'
      )}
      type="button"
    >
      {label}
    </button>
  )

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* ツールバー */}
      <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1 items-center">
        {/* テキストフォーマット */}
        <div className="flex gap-1 items-center pr-2 border-r">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="太字 (Ctrl+B)"
          >
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="斜体 (Ctrl+I)"
          >
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="下線 (Ctrl+U)"
          >
            <UnderlineIcon size={18} />
          </ToolbarButton>
        </div>

        {/* リンク */}
        <div className="flex gap-1 items-center px-2 border-r">
          <ToolbarButton
            onClick={setLink}
            active={editor.isActive('link')}
            title="リンクを挿入"
          >
            <LinkIcon size={18} />
          </ToolbarButton>
        </div>

        {/* リスト */}
        <div className="flex gap-1 items-center px-2 border-r">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="箇条書き"
          >
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="番号付きリスト"
          >
            <ListOrdered size={18} />
          </ToolbarButton>
        </div>

        {/* フォントサイズ */}
        <div className="flex gap-1 items-center px-2 border-r">
          <Type size={18} className="text-gray-500" />
          <FontSizeButton size="12px" label="小" />
          <FontSizeButton size="14px" label="標準" />
          <FontSizeButton size="16px" label="大" />
          <FontSizeButton size="20px" label="特大" />
        </div>

        {/* カラー */}
        <div className="flex gap-1 items-center px-2 border-r">
          <Palette size={18} className="text-gray-500" />
          <ColorButton color="#000000" title="黒" />
          <ColorButton color="#dc2626" title="赤" />
          <ColorButton color="#2563eb" title="青" />
          <ColorButton color="#16a34a" title="緑" />
          <ColorButton color="#eab308" title="黄" />
          <button
            onClick={() => editor.chain().focus().unsetColor().run()}
            title="色をリセット"
            className="px-2 py-1 text-sm rounded hover:bg-gray-100"
            type="button"
          >
            リセット
          </button>
        </div>

        {/* 元に戻す・やり直し */}
        <div className="flex gap-1 items-center px-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="元に戻す (Ctrl+Z)"
          >
            <Undo size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="やり直し (Ctrl+Y)"
          >
            <Redo size={18} />
          </ToolbarButton>
        </div>
      </div>

      {/* エディター本体 */}
      <div className="bg-white">
        <EditorContent 
          editor={editor} 
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}