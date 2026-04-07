// ===== TIPTAP EDITOR SETUP =====
let editor = null;

function initTiptap() {
  const { Editor } = window.tiptapCore;
  const { StarterKit } = window.tiptapStarterKit;
  const { Table } = window.tiptapTable;
  const { TableRow } = window.tiptapTableRow;
  const { TableCell } = window.tiptapTableCell;
  const { TableHeader } = window.tiptapTableHeader;
  const { TaskList } = window.tiptapTaskList;
  const { TaskItem } = window.tiptapTaskItem;
  const { Placeholder } = window.tiptapPlaceholder;

  editor = new Editor({
    element: document.getElementById('editor'),
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block',
          },
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Mulai menulis...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    onUpdate: ({ editor }) => {
      // Trigger auto-save and word count update
      scheduleAutoSave();
      updateWordCount();
      updateStatusBar();
      
      // Update TOC if active
      if (ST.rsTab === 'toc') {
        clearTimeout(window._tocTimer);
        window._tocTimer = setTimeout(updateTOC, 1000);
      }
    },
  });

  return editor;
}

// Get editor content as HTML
function getEditorHTML() {
  return editor ? editor.getHTML() : '';
}

// Get editor content as plain text
function getEditorText() {
  return editor ? editor.getText() : '';
}

// Set editor content from HTML
function setEditorHTML(html) {
  if (editor) {
    editor.commands.setContent(html || '');
  }
}

// Clear editor content
function clearEditor() {
  if (editor) {
    editor.commands.clearContent();
  }
}

// Focus editor
function focusEditor() {
  if (editor) {
    editor.commands.focus();
  }
}

// Destroy editor instance
function destroyEditor() {
  if (editor) {
    editor.destroy();
    editor = null;
  }
}

// ===== TOOLBAR COMMANDS =====

// Text formatting
function tiptapBold() {
  editor?.chain().focus().toggleBold().run();
}

function tiptapItalic() {
  editor?.chain().focus().toggleItalic().run();
}

function tiptapUnderline() {
  editor?.chain().focus().toggleUnderline().run();
}

function tiptapStrike() {
  editor?.chain().focus().toggleStrike().run();
}

// Headings
function tiptapHeading(level) {
  editor?.chain().focus().toggleHeading({ level }).run();
}

// Lists
function tiptapBulletList() {
  editor?.chain().focus().toggleBulletList().run();
}

function tiptapOrderedList() {
  editor?.chain().focus().toggleOrderedList().run();
}

function tiptapTaskList() {
  editor?.chain().focus().toggleTaskList().run();
}

// Blockquote
function tiptapBlockquote() {
  editor?.chain().focus().toggleBlockquote().run();
}

// Code
function tiptapCode() {
  editor?.chain().focus().toggleCode().run();
}

function tiptapCodeBlock() {
  editor?.chain().focus().toggleCodeBlock().run();
}

// Horizontal rule
function tiptapHR() {
  editor?.chain().focus().setHorizontalRule().run();
}

// Table
function tiptapInsertTable() {
  editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
}

function tiptapAddColumnBefore() {
  editor?.chain().focus().addColumnBefore().run();
}

function tiptapAddColumnAfter() {
  editor?.chain().focus().addColumnAfter().run();
}

function tiptapDeleteColumn() {
  editor?.chain().focus().deleteColumn().run();
}

function tiptapAddRowBefore() {
  editor?.chain().focus().addRowBefore().run();
}

function tiptapAddRowAfter() {
  editor?.chain().focus().addRowAfter().run();
}

function tiptapDeleteRow() {
  editor?.chain().focus().deleteRow().run();
}

function tiptapDeleteTable() {
  editor?.chain().focus().deleteTable().run();
}

// Undo/Redo
function tiptapUndo() {
  editor?.chain().focus().undo().run();
}

function tiptapRedo() {
  editor?.chain().focus().redo().run();
}

// ===== AI INTEGRATION =====

// Insert AI generated content
function insertAIContent(html) {
  if (!editor) return;
  
  // Clear editor for replace actions (write, summarize, etc)
  // Or append for continue/expand actions
  editor.chain().focus().insertContent(html).run();
}

// Replace all content with AI generated
function replaceWithAIContent(html) {
  if (!editor) return;
  
  editor.chain()
    .clearContent()
    .insertContent(html)
    .run();
}

// Append AI content
function appendAIContent(html) {
  if (!editor) return;
  
  editor.chain()
    .focus('end')
    .insertContent('<p></p>')
    .insertContent(html)
    .run();
}
