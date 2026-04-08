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
    const { Underline } = window.tiptapUnderline || {};
    const { TextAlign } = window.tiptapTextAlign || {};
    const { TextStyle } = window.tiptapTextStyle || {};
    const { Color } = window.tiptapColor || {};
    const { Highlight } = window.tiptapHighlight || {};
    const { Link } = window.tiptapLink || {};
    const { Image } = window.tiptapImage || {};

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
    if (Underline) extensions.push(Underline);
    if (TextStyle) extensions.push(TextStyle);
    if (Color) extensions.push(Color);
    if (Highlight) extensions.push(Highlight.configure({ multicolor: true }));
    
    if (TextAlign) {
      extensions.push(
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        })
      );
    }
    
    if (Link) {
      extensions.push(
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'editor-link',
          },
        })
      );
    }
    
    if (Image) {
      extensions.push(
        Image.configure({
          HTMLAttributes: {
            class: 'editor-image',
          },
        })
      );
    }

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

function tiptapParagraph() {
  if (useTiptap && editor) {
    editor.chain().focus().setParagraph().run();
  } else {
    document.execCommand('formatBlock', false, '<p>');
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


// ===== TEXT ALIGNMENT =====
function tiptapAlign(alignment) {
  if (useTiptap && editor) {
    editor.chain().focus().setTextAlign(alignment).run();
  } else {
    // Fallback for contenteditable
    if (alignment === 'left') document.execCommand('justifyLeft', false, null);
    else if (alignment === 'center') document.execCommand('justifyCenter', false, null);
    else if (alignment === 'right') document.execCommand('justifyRight', false, null);
    else if (alignment === 'justify') document.execCommand('justifyFull', false, null);
  }
}

// ===== TEXT COLOR & HIGHLIGHT =====
let currentColorMode = 'text'; // 'text' or 'highlight'

function openColorPicker(mode) {
  currentColorMode = mode;
  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
    '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
    '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
    '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
    '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
  ];
  
  const picker = document.createElement('div');
  picker.className = 'color-picker-popup';
  picker.innerHTML = `
    <div class="color-picker-header">
      <span>${mode === 'text' ? 'Text Color' : 'Highlight Color'}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;">✕</button>
    </div>
    <div class="color-picker-grid">
      ${colors.map(c => `<button class="color-swatch" style="background:${c}" onclick="applyColor('${c}', '${mode}'); this.parentElement.parentElement.remove();" title="${c}"></button>`).join('')}
    </div>
    <div class="color-picker-footer">
      <button onclick="applyColor('', '${mode}'); this.parentElement.parentElement.remove();" style="padding:6px 12px;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;color:var(--text2);cursor:pointer;font-size:11px;width:100%;">Remove ${mode === 'text' ? 'Color' : 'Highlight'}</button>
    </div>
  `;
  
  document.body.appendChild(picker);
  
  // Position near the toolbar
  const toolbar = document.getElementById('toolbar');
  const rect = toolbar.getBoundingClientRect();
  picker.style.top = (rect.bottom + 8) + 'px';
  picker.style.left = Math.min(rect.left + 200, window.innerWidth - 320) + 'px';
  
  // Close on outside click
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 10);
}

function applyColor(color, mode) {
  if (useTiptap && editor) {
    if (mode === 'text') {
      if (color) {
        editor.chain().focus().setColor(color).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
    } else {
      if (color) {
        editor.chain().focus().setHighlight({ color }).run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
    }
  } else {
    // Fallback
    if (mode === 'text') {
      document.execCommand('foreColor', false, color || '#000000');
    } else {
      document.execCommand('backColor', false, color || 'transparent');
    }
  }
}

// ===== LINK =====
function openLinkDialog() {
  const url = prompt('Enter URL:', 'https://');
  if (url && url !== 'https://') {
    if (useTiptap && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      document.execCommand('createLink', false, url);
    }
  }
}

function tiptapUnlink() {
  if (useTiptap && editor) {
    editor.chain().focus().unsetLink().run();
  } else {
    document.execCommand('unlink', false, null);
  }
}

// ===== IMAGE =====
function openImageDialog() {
  const url = prompt('Enter image URL:', 'https://');
  if (url && url !== 'https://') {
    if (useTiptap && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    } else {
      document.execCommand('insertImage', false, url);
    }
  }
}

// ===== CLEAR FORMATTING =====
function tiptapClearFormat() {
  if (useTiptap && editor) {
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  } else {
    document.execCommand('removeFormat', false, null);
  }
}

// ===== CLEAN EDITOR CONTENT =====
function cleanEditorFormatting() {
  if (!ST.activeId) {
    showToast('Buka note dulu', 'error');
    return;
  }
  
  if (!confirm('Bersihkan formatting berlebihan dari konten editor? (Struktur konten tetap dipertahankan)')) {
    return;
  }
  
  // Get current HTML
  const currentHTML = getEditorHTML();
  
  // Create temp div to clean
  const temp = document.createElement('div');
  temp.innerHTML = currentHTML;
  
  // Remove excessive whitespace from all text nodes
  const walker = document.createTreeWalker(
    temp,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    // Clean excessive whitespace
    node.textContent = node.textContent.replace(/\s+/g, ' ');
  }
  
  // Clean all elements
  temp.querySelectorAll('*').forEach(el => {
    // Remove excessive whitespace in innerHTML
    if (el.children.length === 0) {
      el.innerHTML = el.innerHTML.trim();
    }
  });
  
  // Remove empty paragraphs
  temp.querySelectorAll('p').forEach(p => {
    if (!p.textContent.trim() && !p.querySelector('img, br, code')) {
      p.remove();
    }
  });
  
  // Clean list items
  temp.querySelectorAll('li').forEach(li => {
    li.innerHTML = li.innerHTML.replace(/\s+/g, ' ').trim();
  });
  
  // Clean headings
  temp.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
    h.innerHTML = h.innerHTML.replace(/\s+/g, ' ').trim();
  });
  
  // Get cleaned HTML
  let cleaned = temp.innerHTML;
  
  // Additional cleaning
  cleaned = cleaned.replace(/>\s+</g, '><');  // Remove whitespace between tags
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');  // Remove multiple br
  cleaned = cleaned.replace(/(<\/p>)\s*(<p>)/gi, '$1$2');  // Clean paragraph spacing
  
  // Set cleaned content back
  setEditorHTML(cleaned);
  
  // Save
  scheduleAutoSave();
  
  showToast('Formatting dibersihkan ✓', 'success');
}


// ===== TOOLBAR DROPDOWN =====
function toggleToolbarDropdown(e, menuId) {
  e.stopPropagation();
  
  // Close all other dropdowns first
  document.querySelectorAll('.tb-menu').forEach(m => {
    if (m.id !== menuId) m.classList.remove('show');
  });
  
  const menu = document.getElementById(menuId);
  const btn = e.currentTarget;
  
  if (!menu || !btn) return;
  
  const isShown = menu.classList.contains('show');
  
  if (isShown) {
    menu.classList.remove('show');
  } else {
    // Position the menu right below the button
    const rect = btn.getBoundingClientRect();
    menu.style.top = (rect.bottom + 6) + 'px';
    menu.style.left = rect.left + 'px';
    
    menu.classList.add('show');
    
    // Close on outside click
    setTimeout(() => {
      const closeHandler = (evt) => {
        if (!menu.contains(evt.target) && !btn.contains(evt.target)) {
          menu.classList.remove('show');
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 10);
  }
}

function closeToolbarDropdown() {
  document.querySelectorAll('.tb-menu').forEach(m => m.classList.remove('show'));
}


// ===== CLEAN AI HTML =====
function cleanAIHTML(html) {
  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Remove empty paragraphs and excessive whitespace
  temp.querySelectorAll('p').forEach(p => {
    // Trim whitespace inside paragraph
    const text = p.textContent.trim();
    if (!text && !p.querySelector('img, br, code')) {
      p.remove();
    } else if (text) {
      // Clean up excessive whitespace within text
      p.innerHTML = p.innerHTML.replace(/\s+/g, ' ').trim();
    }
  });
  
  // Clean up list items - remove nested p tags inside li
  temp.querySelectorAll('li > p').forEach(p => {
    const li = p.parentElement;
    if (li && li.children.length === 1) {
      // If li only has one p child, unwrap it and clean whitespace
      li.innerHTML = p.innerHTML.replace(/\s+/g, ' ').trim();
    }
  });
  
  // Clean up all list items for excessive whitespace
  temp.querySelectorAll('li').forEach(li => {
    li.innerHTML = li.innerHTML.replace(/\s+/g, ' ').trim();
  });
  
  // Ensure proper spacing between elements
  temp.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    // Remove empty headings
    if (!heading.textContent.trim()) {
      heading.remove();
    } else {
      // Clean whitespace in headings
      heading.innerHTML = heading.innerHTML.replace(/\s+/g, ' ').trim();
    }
  });
  
  // Clean up blockquotes
  temp.querySelectorAll('blockquote').forEach(bq => {
    // Remove nested blockquotes
    const nestedBq = bq.querySelector('blockquote');
    if (nestedBq) {
      bq.innerHTML = nestedBq.innerHTML;
    }
    // Clean whitespace
    bq.innerHTML = bq.innerHTML.replace(/\s+/g, ' ').trim();
  });
  
  // Clean up code blocks
  temp.querySelectorAll('pre code').forEach(code => {
    // Remove language class if present (marked.js adds it)
    code.className = '';
  });
  
  // Clean up tables
  temp.querySelectorAll('td, th').forEach(cell => {
    cell.innerHTML = cell.innerHTML.replace(/\s+/g, ' ').trim();
  });
  
  // Remove any script tags for security
  temp.querySelectorAll('script').forEach(s => s.remove());
  
  // Remove any style tags
  temp.querySelectorAll('style').forEach(s => s.remove());
  
  // Clean up excessive line breaks and whitespace
  let cleaned = temp.innerHTML;
  
  // Remove multiple consecutive br tags
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
  
  // Remove whitespace between closing and opening tags
  cleaned = cleaned.replace(/>\s+</g, '><');
  
  // Remove excessive spaces within text content
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // Clean up paragraph spacing
  cleaned = cleaned.replace(/(<\/p>)\s*(<p>)/gi, '$1$2');
  
  // Remove leading/trailing whitespace in paragraphs
  cleaned = cleaned.replace(/<p>\s+/gi, '<p>');
  cleaned = cleaned.replace(/\s+<\/p>/gi, '</p>');
  
  // Clean up list spacing
  cleaned = cleaned.replace(/<li>\s+/gi, '<li>');
  cleaned = cleaned.replace(/\s+<\/li>/gi, '</li>');
  
  // Clean up heading spacing
  cleaned = cleaned.replace(/<(h[1-6])>\s+/gi, '<$1>');
  cleaned = cleaned.replace(/\s+<\/(h[1-6])>/gi, '</$1>');
  
  return cleaned;
}

// Override the AI content insertion functions to use cleaned HTML
const originalReplaceWithAIContent = replaceWithAIContent;
const originalAppendAIContent = appendAIContent;
const originalInsertAIContent = insertAIContent;

replaceWithAIContent = function(html) {
  const cleaned = cleanAIHTML(html);
  originalReplaceWithAIContent(cleaned);
};

appendAIContent = function(html) {
  const cleaned = cleanAIHTML(html);
  originalAppendAIContent(cleaned);
};

insertAIContent = function(html) {
  const cleaned = cleanAIHTML(html);
  originalInsertAIContent(cleaned);
};
