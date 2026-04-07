// ===== TIPTAP EDITOR SETUP =====
let editor = null;
let useTiptap = false;

function initTiptap() {
  try {
    // Check if Tiptap libraries are loaded
    if (!window.tiptapCore || !window.tiptapStarterKit) {
      console.warn('Tiptap libraries not loaded, using fallback contenteditable');
      useTiptap = false;
      initFallbackEditor();
      return null;
    }

    const { Editor } = window.tiptapCore;
    const { StarterKit } = window.tiptapStarterKit;
    const { Table } = window.tiptapTable || {};
    const { TableRow } = window.tiptapTableRow || {};
    const { TableCell } = window.tiptapTableCell || {};
    const { TableHeader } = window.tiptapTableHeader || {};
    const { TaskList } = window.tiptapTaskList || {};
    const { TaskItem } = window.tiptapTaskItem || {};
    const { Placeholder } = window.tiptapPlaceholder || {};

    const extensions = [
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
    ];

    // Add optional extensions if available
    if (Table && TableRow && TableCell && TableHeader) {
      extensions.push(
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'tiptap-table',
          },
        }),
        TableRow,
        TableHeader,
        TableCell
      );
    }

    if (TaskList && TaskItem) {
      extensions.push(
        TaskList,
        TaskItem.configure({
          nested: true,
        })
      );
    }

    if (Placeholder) {
      extensions.push(
        Placeholder.configure({
          placeholder: 'Mulai menulis...',
        })
      );
    }

    editor = new Editor({
      element: document.getElementById('editor'),
      extensions: extensions,
      content: '',
      editorProps: {
        attributes: {
          class: 'tiptap',
        },
      },
      onUpdate: ({ editor }) => {
        // Trigger auto-save and word count update
        if (typeof scheduleAutoSave === 'function') scheduleAutoSave();
        if (typeof updateWordCount === 'function') updateWordCount();
        if (typeof updateStatusBar === 'function') updateStatusBar();
        
        // Update TOC if active
        if (window.ST && ST.rsTab === 'toc' && typeof updateTOC === 'function') {
          clearTimeout(window._tocTimer);
          window._tocTimer = setTimeout(updateTOC, 1000);
        }
      },
    });

    useTiptap = true;
    console.log('Tiptap initialized successfully');
    return editor;
  } catch (error) {
    console.error('Failed to initialize Tiptap:', error);
    useTiptap = false;
    initFallbackEditor();
    return null;
  }
}

// Fallback to contenteditable if Tiptap fails
function initFallbackEditor() {
  const editorEl = document.getElementById('editor');
  if (editorEl) {
    editorEl.contentEditable = 'true';
    editorEl.innerHTML = '<p>Mulai menulis...</p>';
    
    // Add input listener for fallback
    editorEl.addEventListener('input', () => {
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave();
      if (typeof updateWordCount === 'function') updateWordCount();
      if (typeof updateStatusBar === 'function') updateStatusBar();
    });
    
    console.log('Using fallback contenteditable editor');
  }
}

// Get editor content as HTML
function getEditorHTML() {
  if (useTiptap && editor) {
    return editor.getHTML();
  } else {
    const editorEl = document.getElementById('editor');
    return editorEl ? editorEl.innerHTML : '';
  }
}

// Get editor content as plain text
function getEditorText() {
  if (useTiptap && editor) {
    return editor.getText();
  } else {
    const editorEl = document.getElementById('editor');
    return editorEl ? editorEl.textContent || editorEl.innerText : '';
  }
}

// Set editor content from HTML
function setEditorHTML(html) {
  if (useTiptap && editor) {
    editor.commands.setContent(html || '');
  } else {
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      editorEl.innerHTML = html || '<p>Mulai menulis...</p>';
    }
  }
}

// Clear editor content
function clearEditor() {
  if (useTiptap && editor) {
    editor.commands.clearContent();
  } else {
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      editorEl.innerHTML = '<p>Mulai menulis...</p>';
    }
  }
}

// Focus editor
function focusEditor() {
  if (useTiptap && editor) {
    editor.commands.focus();
  } else {
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      editorEl.focus();
    }
  }
}

// Destroy editor instance
function destroyEditor() {
  if (useTiptap && editor) {
    editor.destroy();
    editor = null;
  }
  useTiptap = false;
}

// ===== TOOLBAR COMMANDS =====

// Text formatting
function tiptapBold() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleBold().run();
  } else {
    document.execCommand('bold', false, null);
  }
}

function tiptapItalic() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleItalic().run();
  } else {
    document.execCommand('italic', false, null);
  }
}

function tiptapUnderline() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleUnderline().run();
  } else {
    document.execCommand('underline', false, null);
  }
}

function tiptapStrike() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleStrike().run();
  } else {
    document.execCommand('strikeThrough', false, null);
  }
}

// Headings
function tiptapHeading(level) {
  if (useTiptap && editor) {
    editor.chain().focus().toggleHeading({ level }).run();
  } else {
    document.execCommand('formatBlock', false, `<h${level}>`);
  }
}

// Lists
function tiptapBulletList() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleBulletList().run();
  } else {
    document.execCommand('insertUnorderedList', false, null);
  }
}

function tiptapOrderedList() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleOrderedList().run();
  } else {
    document.execCommand('insertOrderedList', false, null);
  }
}

function tiptapTaskList() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleTaskList().run();
  } else {
    // Fallback: insert a simple checkbox list item
    const html = '<ul><li><input type="checkbox"> Task item</li></ul>';
    document.execCommand('insertHTML', false, html);
  }
}

// Blockquote
function tiptapBlockquote() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleBlockquote().run();
  } else {
    document.execCommand('formatBlock', false, '<blockquote>');
  }
}

// Code
function tiptapCode() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleCode().run();
  } else {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const code = document.createElement('code');
      range.surroundContents(code);
    }
  }
}

function tiptapCodeBlock() {
  if (useTiptap && editor) {
    editor.chain().focus().toggleCodeBlock().run();
  } else {
    document.execCommand('formatBlock', false, '<pre>');
  }
}

// Horizontal rule
function tiptapHR() {
  if (useTiptap && editor) {
    editor.chain().focus().setHorizontalRule().run();
  } else {
    document.execCommand('insertHorizontalRule', false, null);
  }
}

// Table
function tiptapInsertTable() {
  if (useTiptap && editor) {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  } else {
    // Fallback: insert a simple HTML table
    const html = '<table><thead><tr><th>Header 1</th><th>Header 2</th><th>Header 3</th></tr></thead><tbody><tr><td>Cell 1</td><td>Cell 2</td><td>Cell 3</td></tr><tr><td>Cell 4</td><td>Cell 5</td><td>Cell 6</td></tr></tbody></table>';
    document.execCommand('insertHTML', false, html);
  }
}

function tiptapAddColumnBefore() {
  if (useTiptap && editor) {
    editor.chain().focus().addColumnBefore().run();
  }
}

function tiptapAddColumnAfter() {
  if (useTiptap && editor) {
    editor.chain().focus().addColumnAfter().run();
  }
}

function tiptapDeleteColumn() {
  if (useTiptap && editor) {
    editor.chain().focus().deleteColumn().run();
  }
}

function tiptapAddRowBefore() {
  if (useTiptap && editor) {
    editor.chain().focus().addRowBefore().run();
  }
}

function tiptapAddRowAfter() {
  if (useTiptap && editor) {
    editor.chain().focus().addRowAfter().run();
  }
}

function tiptapDeleteRow() {
  if (useTiptap && editor) {
    editor.chain().focus().deleteRow().run();
  }
}

function tiptapDeleteTable() {
  if (useTiptap && editor) {
    editor.chain().focus().deleteTable().run();
  }
}

// Undo/Redo
function tiptapUndo() {
  if (useTiptap && editor) {
    editor.chain().focus().undo().run();
  } else {
    document.execCommand('undo', false, null);
  }
}

function tiptapRedo() {
  if (useTiptap && editor) {
    editor.chain().focus().redo().run();
  } else {
    document.execCommand('redo', false, null);
  }
}

// ===== AI INTEGRATION =====

// Insert AI generated content
function insertAIContent(html) {
  if (useTiptap && editor) {
    editor.chain().focus().insertContent(html).run();
  } else {
    document.execCommand('insertHTML', false, html);
  }
}

// Replace all content with AI generated
function replaceWithAIContent(html) {
  if (useTiptap && editor) {
    editor.chain()
      .clearContent()
      .insertContent(html)
      .run();
  } else {
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      editorEl.innerHTML = html;
    }
  }
}

// Append AI content
function appendAIContent(html) {
  if (useTiptap && editor) {
    editor.chain()
      .focus('end')
      .insertContent('<p></p>')
      .insertContent(html)
      .run();
  } else {
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      editorEl.innerHTML += html;
    }
  }
}
