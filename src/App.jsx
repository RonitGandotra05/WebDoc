import { useState, useRef, useCallback, useEffect } from 'react';
import Ribbon from './components/Ribbon';
import DocxViewer from './components/DocxViewer';
import StatusBar from './components/StatusBar';
import FileMenu from './components/FileMenu';
import SearchPanel from './components/SearchPanel';
import TableDialog from './components/TableDialog';
import { exportDocx } from './utils/docxHandler';

// LocalStorage keys for persistence
const STORAGE_KEYS = {
  DOCUMENT_CONTENT: 'wordEditor_documentContent',
  DOCUMENT_STYLES: 'wordEditor_documentStyles',  // CSS styles from docx-preview
  DOCUMENT_NAME: 'wordEditor_documentName',
  LAST_SAVED: 'wordEditor_lastSaved',
};

function App() {
  // Load saved document name from localStorage or use default
  const [documentName, setDocumentName] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.DOCUMENT_NAME) || 'Document1';
  });
  const [activeTab, setActiveTab] = useState('home');
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [zoom, setZoom] = useState(100);
  const [pageCount, setPageCount] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Format states
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    fontFamily: 'Calibri',
    fontSize: '11',
    fontColor: '#000000',
    highlightColor: 'transparent',
    alignment: 'left',
    lineSpacing: '1.15',
  });

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Save document to localStorage (including styles for DOCX)
  const saveToLocalStorage = useCallback(() => {
    try {
      const content = editorRef.current?.getContent() || '';
      const styles = editorRef.current?.getStyles() || '';
      if (content) {
        localStorage.setItem(STORAGE_KEYS.DOCUMENT_CONTENT, content);
        localStorage.setItem(STORAGE_KEYS.DOCUMENT_STYLES, styles);
        localStorage.setItem(STORAGE_KEYS.DOCUMENT_NAME, documentName);
        localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString());
        setHasUnsavedChanges(false);
        console.log('Document auto-saved (with styles)');
      }
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [documentName]);

  // Load document from localStorage on mount
  useEffect(() => {
    const savedContent = localStorage.getItem(STORAGE_KEYS.DOCUMENT_CONTENT);
    const savedStyles = localStorage.getItem(STORAGE_KEYS.DOCUMENT_STYLES);
    if (savedContent) {
      // Wait for component to mount, then restore content with styles
      const restoreContent = () => {
        if (editorRef.current && editorRef.current.setContent) {
          editorRef.current.setContent(savedContent, savedStyles);
          console.log('Document restored from localStorage (with styles)');
        } else {
          // Retry if editor not ready yet
          setTimeout(restoreContent, 100);
        }
      };
      setTimeout(restoreContent, 200);
    }
  }, []);

  // Auto-save on content change (debounced)
  const triggerAutoSave = useCallback(() => {
    setHasUnsavedChanges(true);

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (save after 2 seconds of inactivity)
    autoSaveTimerRef.current = setTimeout(() => {
      saveToLocalStorage();
    }, 2000);
  }, [saveToLocalStorage]);

  // Save document name when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DOCUMENT_NAME, documentName);
  }, [documentName]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        // Force save before leaving
        saveToLocalStorage();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saveToLocalStorage]);

  // Track format state from selection
  const updateFormatFromSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!range) return;

    let element = range.commonAncestorContainer;
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement;
    }

    if (element) {
      const style = window.getComputedStyle(element);
      setFormatState(prev => ({
        ...prev,
        bold: style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700,
        italic: style.fontStyle === 'italic',
        underline: style.textDecoration.includes('underline'),
        strikethrough: style.textDecoration.includes('line-through'),
      }));
    }
  }, []);

  // Format commands
  const executeFormat = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    updateFormatFromSelection();
    editorRef.current?.focus();
  }, [updateFormatFromSelection]);

  // Handle file import - now using DocxViewer's importFile method
  const handleImport = useCallback(async (file) => {
    setIsLoading(true);
    setLoadingMessage('Importing document...');
    try {
      await editorRef.current?.importFile(file);
      setDocumentName(file.name.replace('.docx', ''));
      // Trigger auto-save after import
      triggerAutoSave();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import document: ' + error.message);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [triggerAutoSave]);

  // Handle file export
  const handleExport = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Exporting document...');
    try {
      const content = editorRef.current?.getContent() || '';
      await exportDocx(content, documentName);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export document: ' + error.message);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [documentName]);

  // Create new document
  const handleNew = useCallback(() => {
    editorRef.current?.clear();
    setDocumentName('Document1');
    setWordCount(0);
    setPageCount(1);
    setShowFileMenu(false);
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.DOCUMENT_CONTENT);
    localStorage.removeItem(STORAGE_KEYS.DOCUMENT_STYLES);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);
    setHasUnsavedChanges(false);
  }, []);

  // Update word count and trigger auto-save
  const updateWordCount = useCallback(() => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
    // Trigger auto-save on content change
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Insert table
  const handleInsertTable = useCallback((rows, cols) => {
    let tableHtml = '<table>';
    for (let i = 0; i < rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHtml += '<td>&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table><p></p>';
    document.execCommand('insertHTML', false, tableHtml);
    setShowTableDialog(false);
    editorRef.current?.focus();
  }, []);

  // Insert image
  const handleInsertImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = `<img src="${event.target.result}" style="max-width: 100%;" />`;
          document.execCommand('insertHTML', false, img);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, []);

  // Apply style
  const applyStyle = useCallback((styleName) => {
    const styles = {
      'normal': { tag: 'p', fontSize: '11pt', fontWeight: 'normal', color: '#000' },
      'heading1': { tag: 'h1', fontSize: '26pt', fontWeight: 'bold', color: '#2e74b5' },
      'heading2': { tag: 'h2', fontSize: '18pt', fontWeight: '600', color: '#2e74b5' },
      'heading3': { tag: 'h3', fontSize: '14pt', fontWeight: '600', color: '#1f4d78' },
      'title': { tag: 'h1', fontSize: '28pt', fontWeight: 'normal', color: '#000' },
    };

    const style = styles[styleName];
    if (style) {
      document.execCommand('formatBlock', false, style.tag);
    }
    editorRef.current?.focus();
  }, []);

  // File input change handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImport(file);
    }
    e.target.value = '';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleExport();
            break;
          case 'o':
            e.preventDefault();
            fileInputRef.current?.click();
            break;
          case 'b':
            e.preventDefault();
            executeFormat('bold');
            break;
          case 'i':
            e.preventDefault();
            executeFormat('italic');
            break;
          case 'u':
            e.preventDefault();
            executeFormat('underline');
            break;
          case 'f':
            e.preventDefault();
            setShowSearchPanel(true);
            break;
          case 'n':
            e.preventDefault();
            handleNew();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeFormat, handleExport, handleNew]);

  return (
    <div className="app-container">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Title Bar */}
      <div className="title-bar">
        <div className="title-bar-left">
          <i className="fa-solid fa-file-word app-icon"></i>
          <div className="quick-access-toolbar">
            <button className="quick-access-btn" onClick={handleNew} title="New">
              <i className="fa-solid fa-file"></i>
            </button>
            <button className="quick-access-btn" onClick={() => fileInputRef.current?.click()} title="Open">
              <i className="fa-solid fa-folder-open"></i>
            </button>
            <button className="quick-access-btn" onClick={handleExport} title="Save">
              <i className="fa-solid fa-floppy-disk"></i>
            </button>
          </div>
        </div>
        <span className="document-title">{documentName} - Word Editor</span>
        <div className="title-bar-right"></div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className="tab-item file-tab"
          onClick={() => setShowFileMenu(true)}
        >
          File
        </button>
        <button
          className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button
          className={`tab-item ${activeTab === 'insert' ? 'active' : ''}`}
          onClick={() => setActiveTab('insert')}
        >
          Insert
        </button>
        <button
          className={`tab-item ${activeTab === 'layout' ? 'active' : ''}`}
          onClick={() => setActiveTab('layout')}
        >
          Layout
        </button>
        <button
          className={`tab-item ${activeTab === 'view' ? 'active' : ''}`}
          onClick={() => setActiveTab('view')}
        >
          View
        </button>
      </div>

      {/* Ribbon */}
      <Ribbon
        activeTab={activeTab}
        formatState={formatState}
        setFormatState={setFormatState}
        executeFormat={executeFormat}
        applyStyle={applyStyle}
        onInsertTable={() => setShowTableDialog(true)}
        onInsertImage={handleInsertImage}
        onSearch={() => setShowSearchPanel(true)}
        zoom={zoom}
        setZoom={setZoom}
      />

      {/* Document Viewer/Editor */}
      <DocxViewer
        ref={editorRef}
        zoom={zoom}
        onContentChange={updateWordCount}
        onPageCountChange={setPageCount}
        onWordCountChange={setWordCount}
      />

      {/* Status Bar */}
      <StatusBar
        pageCount={pageCount}
        currentPage={currentPage}
        wordCount={wordCount}
        zoom={zoom}
        setZoom={setZoom}
      />

      {/* File Menu */}
      {showFileMenu && (
        <FileMenu
          onClose={() => setShowFileMenu(false)}
          onNew={handleNew}
          onOpen={() => {
            fileInputRef.current?.click();
            setShowFileMenu(false);
          }}
          onSave={handleExport}
          documentName={documentName}
          setDocumentName={setDocumentName}
        />
      )}

      {/* Search Panel */}
      {showSearchPanel && (
        <SearchPanel
          onClose={() => setShowSearchPanel(false)}
          editorRef={editorRef}
        />
      )}

      {/* Table Dialog */}
      {showTableDialog && (
        <TableDialog
          onClose={() => setShowTableDialog(false)}
          onInsert={handleInsertTable}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">{loadingMessage}</div>
        </div>
      )}
    </div>
  );
}

export default App;
