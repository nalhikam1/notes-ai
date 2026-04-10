// ===== TIPTAP EDITOR SETUP =====
let editor = null;
let useTiptap = false;

// ===== SLASH COMMAND EXTENSION =====
const SlashCommand = {
  name: 'slashCommand',
  
  addProseMirrorPlugins() {
    return [
      new window.tiptapPm.state.Plugin({
        key: new window.tiptapPm.state.PluginKey('slashCommand'),
        
        state: {
          init() {
            return { active: false, range: null, query: '' };
          },
          
          apply(tr, state) {
            const { selection } = tr;
            const { $from } = selection;
            
            // Check if we're at the start of a line or after whitespace
            const textBefore = $from.parent.textBetween(
              Math.max(0, $from.parentOffset - 20),
              $from.parentOffset,
              null,
              '\ufffc'
            );
            
            // Match "/" at start of line or after space
            const match = textBefore.match(/(?:^|\s)(\/[\w]*)$/);
            
            if (match) {
              const query = match[1].slice(1); // Remove the "/"
              const from = $from.pos - match[1].length;
              const to = $from.pos;
              
              return {
                active: true,
                range: { from, to },
                query: query.toLowerCase()
              };
            }
            
            return { active: false, range: null, query: '' };
          }
        },
        
        props: {
          handleKeyDown(view, event) {
            const state = this.getState(view.state);
            
            if (!state.active) return false;
            
            // Handle arrow keys and enter when menu is active
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Escape') {
              const menu = document.getElementById('slash-menu');
              if (menu && menu.style.display === 'block') {
                event.preventDefault();
                
                if (event.key === 'Escape') {
                  hideSlashMenu();
                  return true;
                }
                
                const items = menu.querySelectorAll('.slash-item');
                let currentIndex = -1;
                
                items.forEach((item, i) => {
                  if (item.classList.contains('selected')) {
                    currentIndex = i;
                  }
                });
                
                if (event.key === 'ArrowDown') {
                  currentIndex = (currentIndex + 1) % items.length;
                } else if (event.key === 'ArrowUp') {
                  currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                } else if (event.key === 'Enter') {
                  if (currentIndex >= 0 && items[currentIndex]) {
                    items[currentIndex].click();
                  }
                  return true;
                }
                
                items.forEach((item, i) => {
                  item.classList.toggle('selected', i === currentIndex);
                });
                
                return true;
              }
            }
            
            return false;
          }
        },
        
        view() {
          return {
            update: (view) => {
              const state = this.spec.state.apply(view.state.tr, this.getState(view.state));
              
              if (state.active) {
                showSlashMenu(view, state.range, state.query);
              } else {
                hideSlashMenu();
              }
            }
          };
        }
      })
    ];
  }
};

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
    const { Markdown } = window.tiptapMarkdown || {};

    const extensions = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        paragraph: {
          HTMLAttributes: {
            class: 'editor-paragraph',
          },
        },
        hardBreak: {
          keepMarks: true,
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block',
          },
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
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
          openOnClick: true,
          HTMLAttributes: {
            class: 'editor-link',
            target: '_blank',
            rel: 'noopener noreferrer',
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
          placeholder: '', // Empty placeholder - no text shown
        })
      );
    }

    // Note: tiptap-markdown extension removed from runtime - storage uses HTML.
    // Markdown INPUT rules (typing - [ ] etc.) work via TaskItem/StarterKit built-in rules.

    editor = new Editor({
      element: document.getElementById('editor'),
      extensions: extensions,
      content: '',
      editorProps: {
        attributes: {
          class: 'tiptap',
        },
        // Tab/Shift+Tab for list indent/outdent is handled natively by
        // ListItem (StarterKit) and TaskItem (nested:true) extensions.
        // Do NOT add a custom handleKeyDown for Tab — it blocks the
        // built-in Tiptap keyboard shortcuts.
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
    
    // Initialize lightbox for images
    initLightbox();
    
    return editor;
  } catch (error) {
    console.error('Failed to initialize Tiptap:', error);
    useTiptap = false;
    initFallbackEditor();
    return null;
  }
}

// ===== SLASH COMMAND MENU =====
const slashCommands = [
  { 
    title: 'Heading 1', 
    icon: 'H1', 
    description: 'Large heading',
    keywords: ['h1', 'heading', 'title'],
    action: () => tiptapHeading(1)
  },
  { 
    title: 'Heading 2', 
    icon: 'H2', 
    description: 'Medium heading',
    keywords: ['h2', 'heading', 'subtitle'],
    action: () => tiptapHeading(2)
  },
  { 
    title: 'Heading 3', 
    icon: 'H3', 
    description: 'Small heading',
    keywords: ['h3', 'heading'],
    action: () => tiptapHeading(3)
  },
  { 
    title: 'Bullet List', 
    icon: '•', 
    description: 'Unordered list',
    keywords: ['bullet', 'list', 'ul', 'unordered'],
    action: () => tiptapBulletList()
  },
  { 
    title: 'Numbered List', 
    icon: '1.', 
    description: 'Ordered list',
    keywords: ['number', 'numbered', 'list', 'ol', 'ordered'],
    action: () => tiptapOrderedList()
  },
  { 
    title: 'Task List', 
    icon: '☑', 
    description: 'Checklist',
    keywords: ['task', 'todo', 'check', 'checkbox'],
    action: () => tiptapTaskList()
  },
  { 
    title: 'Quote', 
    icon: '"', 
    description: 'Blockquote',
    keywords: ['quote', 'blockquote', 'citation'],
    action: () => tiptapBlockquote()
  },
  { 
    title: 'Code Block', 
    icon: '</>', 
    description: 'Code snippet',
    keywords: ['code', 'block', 'snippet', 'pre'],
    action: () => tiptapCodeBlock()
  },
  { 
    title: 'Divider', 
    icon: '—', 
    description: 'Horizontal line',
    keywords: ['divider', 'hr', 'line', 'separator'],
    action: () => tiptapHR()
  },
  { 
    title: 'Table', 
    icon: '⊞', 
    description: 'Insert table',
    keywords: ['table', 'grid'],
    action: () => tiptapInsertTable()
  }
];

function showSlashMenu(view, range, query) {
  let menu = document.getElementById('slash-menu');
  
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'slash-menu';
    menu.className = 'slash-menu';
    document.body.appendChild(menu);
  }
  
  // Filter commands based on query
  const filtered = query 
    ? slashCommands.filter(cmd => 
        cmd.title.toLowerCase().includes(query) ||
        cmd.keywords.some(k => k.includes(query))
      )
    : slashCommands;
  
  if (filtered.length === 0) {
    hideSlashMenu();
    return;
  }
  
  // Render menu items
  menu.innerHTML = filtered.map((cmd, index) => `
    <div class="slash-item ${index === 0 ? 'selected' : ''}" data-index="${index}">
      <div class="slash-icon">${cmd.icon}</div>
      <div class="slash-info">
        <div class="slash-title">${cmd.title}</div>
        <div class="slash-desc">${cmd.description}</div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  menu.querySelectorAll('.slash-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      executeSlashCommand(view, range, filtered[index]);
    });
    
    item.addEventListener('mouseenter', () => {
      menu.querySelectorAll('.slash-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });
  });
  
  // Position menu
  const coords = view.coordsAtPos(range.from);
  menu.style.display = 'block';
  menu.style.top = (coords.bottom + 8) + 'px';
  menu.style.left = coords.left + 'px';
  
  // Adjust if menu goes off screen
  setTimeout(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (window.innerWidth - rect.width - 20) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (coords.top - rect.height - 8) + 'px';
    }
  }, 0);
}

function hideSlashMenu() {
  const menu = document.getElementById('slash-menu');
  if (menu) {
    menu.style.display = 'none';
  }
}

function executeSlashCommand(view, range, command) {
  // Delete the "/" and query text
  view.dispatch(
    view.state.tr.deleteRange(range.from, range.to)
  );
  
  // Execute the command
  setTimeout(() => {
    command.action();
    hideSlashMenu();
  }, 0);
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
    
    // Add click listener for links
    editorEl.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    });
    
    console.log('Using fallback contenteditable editor');
  }
}

// Get editor content as Markdown
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

// Set editor content - handles both HTML and legacy Markdown string content
function setEditorHTML(content) {
  if (useTiptap && editor) {
    if (!content || content.trim() === '') {
      editor.commands.setContent('');
      return;
    }
    // Detect if stored content is HTML or legacy markdown text
    const isHTML = content.trim().startsWith('<');
    if (isHTML) {
      editor.commands.setContent(content);
    } else {
      // Legacy markdown format - convert to HTML via marked then set
      const html = (typeof marked !== 'undefined') ? marked.parse(content) : `<p>${content}</p>`;
      editor.commands.setContent(html);
    }
  } else {
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      editorEl.innerHTML = content || '<p>Mulai menulis...</p>';
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

// Helper function to preserve scroll position during formatting
function preserveScrollAndFocus(callback) {
  if (!useTiptap || !editor) {
    callback();
    return;
  }
  
  const editorWrap = document.getElementById('editor-wrap');
  const scrollTop = editorWrap ? editorWrap.scrollTop : 0;
  const { from } = editor.state.selection;
  
  callback();
  
  setTimeout(() => {
    if (editorWrap) {
      editorWrap.scrollTop = scrollTop;
    }
    editor.commands.focus();
    try {
      editor.commands.setTextSelection(from);
    } catch (e) {
      // Selection might be invalid after transformation, just focus
      editor.commands.focus();
    }
  }, 0);
}

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
    preserveScrollAndFocus(() => {
      editor.chain().focus().toggleHeading({ level }).run();
    });
  } else {
    document.execCommand('formatBlock', false, `<h${level}>`);
  }
}

function tiptapParagraph() {
  if (useTiptap && editor) {
    preserveScrollAndFocus(() => {
      editor.chain().focus().setParagraph().run();
    });
  } else {
    document.execCommand('formatBlock', false, '<p>');
  }
}

// Lists
function tiptapBulletList() {
  if (useTiptap && editor) {
    preserveScrollAndFocus(() => {
      editor.chain().focus().toggleBulletList().run();
    });
  } else {
    document.execCommand('insertUnorderedList', false, null);
  }
}

function tiptapOrderedList() {
  if (useTiptap && editor) {
    preserveScrollAndFocus(() => {
      editor.chain().focus().toggleOrderedList().run();
    });
  } else {
    document.execCommand('insertOrderedList', false, null);
  }
}

function tiptapTaskList() {
  if (useTiptap && editor) {
    preserveScrollAndFocus(() => {
      editor.chain().focus().toggleTaskList().run();
    });
  } else {
    // Fallback: insert proper HTML task list
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>Task item</div></li></ul>';
    document.execCommand('insertHTML', false, html);
  }
}

// Indent / Outdent for all list types (toolbar buttons)
function tiptapIndent() {
  if (!useTiptap || !editor) return;
  // Try taskItem first, then listItem — one will succeed
  if (!editor.commands.sinkListItem('taskItem')) {
    editor.commands.sinkListItem('listItem');
  }
}

function tiptapOutdent() {
  if (!useTiptap || !editor) return;
  if (!editor.commands.liftListItem('taskItem')) {
    editor.commands.liftListItem('listItem');
  }
}

// Blockquote
function tiptapBlockquote() {
  if (useTiptap && editor) {
    preserveScrollAndFocus(() => {
      editor.chain().focus().toggleBlockquote().run();
    });
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
    editor.chain()
      .focus()
      .insertContent('<pre><code></code></pre>')
      .insertContent('<p></p>') // Add empty paragraph after
      .focus()
      .run();
  } else {
    document.execCommand('formatBlock', false, '<pre>');
  }
}

// Horizontal rule
function tiptapHR() {
  if (useTiptap && editor) {
    editor.chain()
      .focus()
      .setHorizontalRule()
      .insertContent('<p></p>') // Add empty paragraph after
      .focus()
      .run();
  } else {
    document.execCommand('insertHorizontalRule', false, null);
  }
}

// Table
function tiptapInsertTable() {
  if (useTiptap && editor) {
    editor.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .insertContent('<p></p>') // Add empty paragraph after
      .focus()
      .run();
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
  let url = prompt('Enter URL:', 'https://');
  if (url && url !== 'https://') {
    // Add https:// if not present
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    if (useTiptap && editor) {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    } else {
      // For fallback editor
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
          // Create link with selected text
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = selectedText;
          
          range.deleteContents();
          range.insertNode(link);
        } else {
          // No selection, insert URL as text and link
          document.execCommand('createLink', false, url);
          // Set target and rel attributes
          const links = document.getElementById('editor').querySelectorAll('a[href="' + url + '"]');
          links.forEach(link => {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          });
        }
      }
    }
    
    if (typeof scheduleAutoSave === 'function') scheduleAutoSave();
  }
}

function tiptapUnlink() {
  if (useTiptap && editor) {
    editor.chain().focus().unsetLink().run();
  } else {
    document.execCommand('unlink', false, null);
  }
  
  if (typeof scheduleAutoSave === 'function') scheduleAutoSave();
}

// ===== IMAGE =====
// Cache for Cloudinary config fetched from server
let _cloudinaryConfig = null;

async function fetchCloudinaryConfig() {
  if (_cloudinaryConfig) return _cloudinaryConfig;
  try {
    const res = await fetch('/api/cloudinary-sign');
    if (!res.ok) return null;
    _cloudinaryConfig = await res.json();
    return _cloudinaryConfig;
  } catch (e) {
    console.warn('Cloudinary config not available:', e);
    return null;
  }
}

function openImageDialog() {
  document.getElementById('image-url-input').value = '';
  // Check cloudinary availability from server
  const btn = document.getElementById('btn-cloudinary-upload');
  if (btn) {
    btn.textContent = 'Checking...';
    btn.disabled = true;
    fetchCloudinaryConfig().then(cfg => {
      if (cfg && cfg.cloudName && cfg.apiKey) {
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Image';
        btn.disabled = false;
        btn.style.display = 'flex';
      } else {
        btn.style.display = 'none';
      }
    });
  }
  document.getElementById('image-upload-modal').style.display = 'flex';
}

function closeImageUploadModal() {
  document.getElementById('image-upload-modal').style.display = 'none';
}

function insertImageFromUrl() {
  const url = document.getElementById('image-url-input').value.trim();
  if (!url) { showToast('Masukkan URL gambar', 'error'); return; }
  if (useTiptap && editor) {
    editor.chain().focus().setImage({ src: url }).run();
  } else {
    document.execCommand('insertImage', false, url);
  }
  closeImageUploadModal();
}

async function uploadImageCloudinary() {
  if (typeof cloudinary === 'undefined' || !cloudinary.createUploadWidget) {
    showToast('Cloudinary widget belum loaded', 'error');
    return;
  }

  // Get signed params from server
  let signData;
  try {
    const res = await fetch('/api/cloudinary-sign', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || 'Server error', 'error');
      return;
    }
    signData = await res.json();
  } catch (e) {
    showToast('Gagal koneksi ke server', 'error');
    return;
  }

  const widget = cloudinary.createUploadWidget({
    cloudName: signData.cloudName,
    apiKey: signData.apiKey,
    uploadSignature: signData.signature,
    uploadSignatureTimestamp: signData.timestamp,
    folder: signData.folder,
    sources: ['local', 'url', 'camera'],
    multiple: true,
    maxFiles: 10,
    resourceType: 'image',
    clientAllowedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
    maxFileSize: 10000000, // 10MB
    styles: {
      palette: {
        window: '#1a1a1a',
        windowBorder: '#333',
        tabIcon: '#d4a853',
        menuIcons: '#999',
        textDark: '#000',
        textLight: '#fff',
        link: '#d4a853',
        action: '#d4a853',
        inactiveTabIcon: '#666',
        error: '#e74c3c',
        inProgress: '#d4a853',
        complete: '#27ae60',
        sourceBg: '#222'
      }
    }
  }, (error, result) => {
    if (error) {
      console.error('Upload error:', error);
      showToast('Upload gagal: ' + (error.message || 'Unknown error'), 'error');
      return;
    }
    if (result.event === 'success') {
      const url = result.info.secure_url;
      if (useTiptap && editor) {
        editor.chain().focus().setImage({ src: url, alt: result.info.original_filename || '' }).run();
      } else {
        document.execCommand('insertImage', false, url);
      }
      closeImageUploadModal();
    }
  });
  
  widget.open();
}

// ===== LIGHTBOX =====
let lightboxImages = [];
let lightboxIndex = 0;

function initLightbox() {
  // Delegate click on images inside editor
  const editorWrap = document.getElementById('editor-wrap');
  if (!editorWrap) return;
  
  editorWrap.addEventListener('click', (e) => {
    const img = e.target.closest('img');
    if (!img) return;
    
    // Collect all images in editor
    const editorEl = document.getElementById('editor');
    if (!editorEl) return;
    
    lightboxImages = Array.from(editorEl.querySelectorAll('img')).map(i => i.src);
    if (lightboxImages.length === 0) return;
    
    lightboxIndex = lightboxImages.indexOf(img.src);
    if (lightboxIndex === -1) lightboxIndex = 0;
    
    openLightbox();
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('image-lightbox');
    if (!lb || lb.style.display === 'none') return;
    
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') navigateLightbox(-1);
    else if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

function openLightbox() {
  const lb = document.getElementById('image-lightbox');
  if (!lb) return;
  
  updateLightboxImage();
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLightbox(e) {
  if (e && e.target !== e.currentTarget) return;
  const lb = document.getElementById('image-lightbox');
  if (lb) lb.style.display = 'none';
  document.body.style.overflow = '';
}

function navigateLightbox(dir) {
  if (lightboxImages.length <= 1) return;
  lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
  updateLightboxImage();
}

function updateLightboxImage() {
  const img = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  if (img) img.src = lightboxImages[lightboxIndex] || '';
  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
  
  // Show/hide nav buttons
  const prev = document.querySelector('.lightbox-prev');
  const next = document.querySelector('.lightbox-next');
  if (prev) prev.style.display = lightboxImages.length > 1 ? 'flex' : 'none';
  if (next) next.style.display = lightboxImages.length > 1 ? 'flex' : 'none';
}

function downloadLightboxImage() {
  if (!lightboxImages[lightboxIndex]) return;
  const url = lightboxImages[lightboxIndex];
  const a = document.createElement('a');
  a.href = url;
  a.download = 'image-' + (lightboxIndex + 1) + '.' + (url.split('.').pop().split('?')[0] || 'png');
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
  
  if (!confirm('Rapihkan konten editor?\n\nIni akan:\n✓ Menghapus whitespace berlebihan\n✓ Menghapus paragraf kosong\n✓ Merapikan spacing\n\n✗ TIDAK menghapus formatting (bold, heading, list, dll tetap dipertahankan)')) {
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
    // Clean excessive whitespace (but preserve single spaces)
    node.textContent = node.textContent.replace(/\s+/g, ' ');
  }
  
  // Clean all elements
  temp.querySelectorAll('*').forEach(el => {
    // Remove excessive whitespace in innerHTML
    if (el.children.length === 0) {
      el.innerHTML = el.innerHTML.trim();
    }
  });
  
  // Remove empty paragraphs (but keep ones with br or other content)
  temp.querySelectorAll('p').forEach(p => {
    if (!p.textContent.trim() && !p.querySelector('img, br, code, strong, em, a')) {
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
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');  // Max 2 consecutive br
  cleaned = cleaned.replace(/(<\/p>)\s*(<p>)/gi, '$1$2');  // Clean paragraph spacing
  
  // Set cleaned content back
  setEditorHTML(cleaned);
  
  // Save
  scheduleAutoSave();
  
  showToast('Konten berhasil dirapihkan ✓', 'success');
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
    // Position using fixed positioning to avoid overflow issues
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
