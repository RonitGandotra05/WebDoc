# Word Editor - React DOCX Editor

A fully functional, frontend-only Microsoft Word-like document editor built with React. This application provides a seamless DOCX editing experience directly in the browser without any backend dependencies.

![Word Editor](https://img.shields.io/badge/React-18-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### Document Editing
- **Rich Text Formatting** - Bold, italic, underline, strikethrough, subscript, superscript
- **Font Controls** - Font family selection, font size, text color, highlight color
- **Paragraph Formatting** - Alignment (left, center, right, justify), line spacing
- **Lists** - Bullet points and numbered lists
- **Styles** - Normal, Heading 1-3, Title styles

### DOCX Support
- **Import** - Open and view DOCX files with full formatting preservation
- **Export** - Save documents as valid DOCX files
- **Styling Fidelity** - Maintains fonts, colors, spacing, and layout from original documents

### Advanced Features
- **Tables** - Insert and edit tables with visual grid picker
- **Images** - Insert images from local files
- **Search & Replace** - Find and replace text across the document
- **Zoom Controls** - Zoom in/out for comfortable viewing
- **Virtual Pagination** - Multi-page display with proper page breaks
- **Auto-Save** - Documents persist across browser refreshes

### Word-like UI
- **Ribbon Interface** - Familiar tabbed toolbar (Home, Insert, Layout, View)
- **File Menu** - New, Open, Save, Print operations
- **Quick Access Toolbar** - Fast access to common actions
- **Status Bar** - Page count, word count, zoom slider

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **docx-preview** | DOCX → HTML rendering |
| **docx** | HTML → DOCX generation |
| **file-saver** | File download handling |
| **jszip** | ZIP file operations |

## 📦 Installation

```bash
# Clone or navigate to the project
cd "docx project"

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173/`

## 🚀 Usage

### Creating a New Document
1. Start typing in the editor
2. Use the ribbon toolbar to format text
3. Auto-save keeps your work safe

### Importing a DOCX File
1. Click **File → Open** or use `Ctrl+O`
2. Select a `.docx` file from your computer
3. The document will render with full formatting

### Exporting to DOCX
1. Click **File → Save as DOCX** or use `Ctrl+S`
2. Enter a filename
3. The file will download to your computer

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New document |
| `Ctrl+O` | Open DOCX file |
| `Ctrl+S` | Save as DOCX |
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+F` | Find & Replace |

## 📁 Project Structure

```
docx-project/
├── src/
│   ├── components/
│   │   ├── DocxViewer.jsx    # Main document renderer with pagination
│   │   ├── Ribbon.jsx        # Toolbar with formatting controls
│   │   ├── StatusBar.jsx     # Page/word count, zoom
│   │   ├── FileMenu.jsx      # File operations menu
│   │   ├── SearchPanel.jsx   # Find and replace
│   │   └── TableDialog.jsx   # Table insertion dialog
│   ├── utils/
│   │   └── docxHandler.js    # DOCX import/export utilities
│   ├── App.jsx               # Main application component
│   ├── main.jsx              # React entry point
│   └── index.css             # All styling (Word-like UI)
├── index.html
├── package.json
└── vite.config.js
```

## 🔧 How It Works

### DOCX Import Flow
```
User uploads .docx file
        ↓
docx-preview parses DOCX XML
        ↓
Renders to HTML with inline styles
        ↓
Virtual pagination splits into pages
        ↓
Display in React components
```

### DOCX Export Flow
```
Get HTML content from editor
        ↓
Parse HTML structure
        ↓
Convert to docx.js elements
        ↓
Generate valid DOCX XML
        ↓
Download via file-saver
```

### Data Persistence
- Documents auto-save to localStorage every 2 seconds
- Both HTML content and CSS styles are preserved
- Survives page refreshes and browser restarts

## 📄 Page Dimensions

The editor uses US Letter paper size by default:

| Property | Value |
|----------|-------|
| Width | 816px (8.5" at 96 DPI) |
| Height | 1056px (11" at 96 DPI) |
| Margins | 96px (1" all sides) |

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Full header/footer support
- Comments and track changes
- More export format options
- Collaborative editing

## 📝 License

MIT License - Feel free to use this project for any purpose.

---

**Built with ❤️ using React and docx-preview**
