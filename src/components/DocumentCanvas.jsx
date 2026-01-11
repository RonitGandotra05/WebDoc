import { forwardRef, useEffect, useRef, useCallback } from 'react';

const PAGE_HEIGHT = 1056; // 11 inches at 96 DPI
const PAGE_WIDTH = 816; // 8.5 inches at 96 DPI
const CONTENT_HEIGHT = PAGE_HEIGHT - 192; // Minus 2 inches for margins

const DocumentCanvas = forwardRef(({
    zoom,
    onContentChange,
    onSelectionChange,
    onPageCountChange,
    onCurrentPageChange
}, ref) => {
    const containerRef = useRef(null);
    const pagesContainerRef = useRef(null);

    // Handle content changes
    const handleInput = useCallback(() => {
        if (onContentChange) {
            onContentChange();
        }
        // Check for page overflow and pagination
        checkPagination();
    }, [onContentChange]);

    // Check and handle pagination
    const checkPagination = useCallback(() => {
        if (!ref.current || !pagesContainerRef.current) return;

        const pages = pagesContainerRef.current.querySelectorAll('.page');
        let totalPages = pages.length;

        // Check if last page needs more pages
        const lastPage = pages[pages.length - 1];
        if (lastPage) {
            const content = lastPage.querySelector('.page-content');
            if (content && content.scrollHeight > CONTENT_HEIGHT) {
                // Content overflows, we'd need to split - for now just track it
                // Full pagination is complex and would require content splitting
            }
        }

        if (onPageCountChange) {
            onPageCountChange(totalPages);
        }
    }, [onPageCountChange]);

    // Handle selection change
    const handleSelectionChange = useCallback(() => {
        if (onSelectionChange) {
            onSelectionChange();
        }
    }, [onSelectionChange]);

    // Track scroll for current page
    const handleScroll = useCallback(() => {
        if (!containerRef.current || !pagesContainerRef.current) return;

        const scrollTop = containerRef.current.scrollTop;
        const pageHeight = (PAGE_HEIGHT * zoom / 100) + 20; // Including gap
        const currentPage = Math.floor(scrollTop / pageHeight) + 1;

        if (onCurrentPageChange) {
            onCurrentPageChange(currentPage);
        }
    }, [zoom, onCurrentPageChange]);

    useEffect(() => {
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [handleSelectionChange]);

    // Handle keyboard events for pagination
    const handleKeyDown = useCallback((e) => {
        // Handle page break with Ctrl+Enter
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertHTML', false, '<div style="page-break-after: always;"></div><p></p>');
        }
    }, []);

    // Handle paste to strip formatting if needed
    const handlePaste = useCallback((e) => {
        // Allow normal paste with formatting
        // Could add option to paste as plain text
    }, []);

    return (
        <div
            ref={containerRef}
            className="document-canvas"
            onScroll={handleScroll}
        >
            <div
                ref={pagesContainerRef}
                style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s ease'
                }}
            >
                {/* Main editable page */}
                <div className="page">
                    <div
                        ref={ref}
                        className="page-content"
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        spellCheck="true"
                    />
                </div>
            </div>
        </div>
    );
});

DocumentCanvas.displayName = 'DocumentCanvas';

export default DocumentCanvas;
