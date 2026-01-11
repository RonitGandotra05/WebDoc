import { useState, useCallback } from 'react';

function SearchPanel({ onClose, editorRef }) {
    const [searchText, setSearchText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [activeTab, setActiveTab] = useState('find');

    const highlightText = useCallback((text) => {
        if (!editorRef.current || !text) return;

        // Remove existing highlights
        const content = editorRef.current.innerHTML;
        const cleanContent = content.replace(/<mark class="search-highlight">(.*?)<\/mark>/g, '$1');

        // Add new highlights
        const regex = new RegExp(`(${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const highlightedContent = cleanContent.replace(regex, '<mark class="search-highlight" style="background: yellow;">$1</mark>');

        editorRef.current.innerHTML = highlightedContent;
    }, [editorRef]);

    const handleFind = () => {
        highlightText(searchText);
    };

    const handleFindNext = () => {
        if (!searchText) return;

        const selection = window.getSelection();
        const searchContent = editorRef.current?.innerText || '';
        const currentPos = selection.anchorOffset || 0;

        const nextIndex = searchContent.toLowerCase().indexOf(searchText.toLowerCase(), currentPos + 1);

        if (nextIndex !== -1) {
            // Find and select the text node containing this position
            const walker = document.createTreeWalker(
                editorRef.current,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let charCount = 0;
            let node;
            while (node = walker.nextNode()) {
                const nodeLength = node.textContent.length;
                if (charCount + nodeLength > nextIndex) {
                    const range = document.createRange();
                    range.setStart(node, nextIndex - charCount);
                    range.setEnd(node, nextIndex - charCount + searchText.length);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // Scroll into view
                    const rect = range.getBoundingClientRect();
                    if (rect.top < 0 || rect.bottom > window.innerHeight) {
                        node.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    break;
                }
                charCount += nodeLength;
            }
        } else {
            // Wrap to beginning
            alert('Reached end of document. Starting from beginning.');
        }
    };

    const handleReplace = () => {
        if (!searchText) return;

        const selection = window.getSelection();
        if (selection.toString().toLowerCase() === searchText.toLowerCase()) {
            document.execCommand('insertText', false, replaceText);
        } else {
            handleFindNext();
        }
    };

    const handleReplaceAll = () => {
        if (!editorRef.current || !searchText) return;

        const content = editorRef.current.innerHTML;
        const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = content.match(regex);
        const count = matches ? matches.length : 0;

        if (count > 0) {
            editorRef.current.innerHTML = content.replace(regex, replaceText);
            alert(`Replaced ${count} occurrence(s).`);
        } else {
            alert('No matches found.');
        }
    };

    const clearHighlights = () => {
        if (!editorRef.current) return;
        const content = editorRef.current.innerHTML;
        editorRef.current.innerHTML = content.replace(/<mark class="search-highlight"[^>]*>(.*?)<\/mark>/g, '$1');
    };

    const handleClose = () => {
        clearHighlights();
        onClose();
    };

    return (
        <div className="search-panel">
            <div className="search-panel-header">
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: activeTab === 'find' ? 'bold' : 'normal',
                            color: activeTab === 'find' ? '#0078d4' : '#666'
                        }}
                        onClick={() => setActiveTab('find')}
                    >
                        Find
                    </button>
                    <button
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: activeTab === 'replace' ? 'bold' : 'normal',
                            color: activeTab === 'replace' ? '#0078d4' : '#666'
                        }}
                        onClick={() => setActiveTab('replace')}
                    >
                        Replace
                    </button>
                </div>
                <button className="search-close-btn" onClick={handleClose}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div className="search-panel-content">
                <div className="search-input-group">
                    <label>Find what:</label>
                    <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                        placeholder="Enter search text..."
                        autoFocus
                    />
                </div>
                {activeTab === 'replace' && (
                    <div className="search-input-group">
                        <label>Replace with:</label>
                        <input
                            type="text"
                            value={replaceText}
                            onChange={(e) => setReplaceText(e.target.value)}
                            placeholder="Enter replacement text..."
                        />
                    </div>
                )}
                <div className="search-actions">
                    {activeTab === 'find' ? (
                        <>
                            <button className="search-btn primary" onClick={handleFind}>
                                Find All
                            </button>
                            <button className="search-btn secondary" onClick={handleFindNext}>
                                Find Next
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="search-btn secondary" onClick={handleReplace}>
                                Replace
                            </button>
                            <button className="search-btn primary" onClick={handleReplaceAll}>
                                Replace All
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SearchPanel;
