import { useState } from 'react';

const FONTS = [
    'Calibri', 'Arial', 'Times New Roman', 'Georgia', 'Verdana',
    'Courier New', 'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Palatino'
];

const SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

const COLORS = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
    '#FF0000', '#FF6600', '#FFCC00', '#FFFF00', '#99FF00', '#00FF00',
    '#00FFCC', '#00CCFF', '#0066FF', '#0000FF', '#6600FF', '#CC00FF',
    '#FF00CC', '#FF0066', '#990000', '#996600', '#999900', '#009900',
    '#009999', '#000099', '#660099', '#990066', '#331100', '#663300'
];

const HIGHLIGHT_COLORS = [
    'transparent', '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF',
    '#0000FF', '#FF0000', '#000080', '#008080', '#008000'
];

function Ribbon({
    activeTab,
    formatState,
    setFormatState,
    executeFormat,
    applyStyle,
    onInsertTable,
    onInsertImage,
    onSearch,
    zoom,
    setZoom
}) {
    const [showFontColorPicker, setShowFontColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);

    const handleFontChange = (e) => {
        setFormatState(prev => ({ ...prev, fontFamily: e.target.value }));
        executeFormat('fontName', e.target.value);
    };

    const handleSizeChange = (e) => {
        setFormatState(prev => ({ ...prev, fontSize: e.target.value }));
        executeFormat('fontSize', Math.min(7, Math.max(1, Math.round(parseInt(e.target.value) / 6))));
    };

    const handleColorChange = (color) => {
        setFormatState(prev => ({ ...prev, fontColor: color }));
        executeFormat('foreColor', color);
        setShowFontColorPicker(false);
    };

    const handleHighlightChange = (color) => {
        setFormatState(prev => ({ ...prev, highlightColor: color }));
        executeFormat('hiliteColor', color);
        setShowHighlightPicker(false);
    };

    const renderHomeTab = () => (
        <>
            {/* Clipboard Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn" onClick={() => executeFormat('paste')}>
                        <i className="fa-solid fa-paste"></i>
                        <span>Paste</span>
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button className="ribbon-btn-small format-btn" onClick={() => executeFormat('cut')}>
                            <i className="fa-solid fa-scissors"></i>
                        </button>
                        <button className="ribbon-btn-small format-btn" onClick={() => executeFormat('copy')}>
                            <i className="fa-solid fa-copy"></i>
                        </button>
                    </div>
                </div>
                <div className="ribbon-group-label">Clipboard</div>
            </div>

            {/* Font Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content" style={{ flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <select
                            className="font-dropdown"
                            value={formatState.fontFamily}
                            onChange={handleFontChange}
                        >
                            {FONTS.map(font => (
                                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                            ))}
                        </select>
                        <select
                            className="size-dropdown"
                            value={formatState.fontSize}
                            onChange={handleSizeChange}
                        >
                            {SIZES.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                            className={`format-btn ${formatState.bold ? 'active' : ''}`}
                            onClick={() => executeFormat('bold')}
                            title="Bold (Ctrl+B)"
                        >
                            <i className="fa-solid fa-bold"></i>
                        </button>
                        <button
                            className={`format-btn ${formatState.italic ? 'active' : ''}`}
                            onClick={() => executeFormat('italic')}
                            title="Italic (Ctrl+I)"
                        >
                            <i className="fa-solid fa-italic"></i>
                        </button>
                        <button
                            className={`format-btn ${formatState.underline ? 'active' : ''}`}
                            onClick={() => executeFormat('underline')}
                            title="Underline (Ctrl+U)"
                        >
                            <i className="fa-solid fa-underline"></i>
                        </button>
                        <button
                            className={`format-btn ${formatState.strikethrough ? 'active' : ''}`}
                            onClick={() => executeFormat('strikeThrough')}
                            title="Strikethrough"
                        >
                            <i className="fa-solid fa-strikethrough"></i>
                        </button>
                        <button className="format-btn" onClick={() => executeFormat('subscript')} title="Subscript">
                            <i className="fa-solid fa-subscript"></i>
                        </button>
                        <button className="format-btn" onClick={() => executeFormat('superscript')} title="Superscript">
                            <i className="fa-solid fa-superscript"></i>
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button
                                className="format-btn"
                                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                                title="Highlight Color"
                            >
                                <i className="fa-solid fa-highlighter" style={{ color: formatState.highlightColor !== 'transparent' ? formatState.highlightColor : undefined }}></i>
                            </button>
                            {showHighlightPicker && (
                                <div className="color-picker-popup">
                                    <div className="color-grid">
                                        {HIGHLIGHT_COLORS.map(color => (
                                            <div
                                                key={color}
                                                className="color-cell"
                                                style={{ background: color === 'transparent' ? 'linear-gradient(45deg, #fff 50%, #ccc 50%)' : color }}
                                                onClick={() => handleHighlightChange(color)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button
                                className="format-btn"
                                onClick={() => setShowFontColorPicker(!showFontColorPicker)}
                                title="Font Color"
                            >
                                <i className="fa-solid fa-font" style={{ borderBottom: `3px solid ${formatState.fontColor}` }}></i>
                            </button>
                            {showFontColorPicker && (
                                <div className="color-picker-popup">
                                    <div className="color-grid">
                                        {COLORS.map(color => (
                                            <div
                                                key={color}
                                                className="color-cell"
                                                style={{ background: color }}
                                                onClick={() => handleColorChange(color)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="ribbon-group-label">Font</div>
            </div>

            {/* Paragraph Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content" style={{ flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button className="format-btn" onClick={() => executeFormat('insertUnorderedList')} title="Bullets">
                            <i className="fa-solid fa-list-ul"></i>
                        </button>
                        <button className="format-btn" onClick={() => executeFormat('insertOrderedList')} title="Numbering">
                            <i className="fa-solid fa-list-ol"></i>
                        </button>
                        <button className="format-btn" onClick={() => executeFormat('outdent')} title="Decrease Indent">
                            <i className="fa-solid fa-outdent"></i>
                        </button>
                        <button className="format-btn" onClick={() => executeFormat('indent')} title="Increase Indent">
                            <i className="fa-solid fa-indent"></i>
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                            className={`format-btn ${formatState.alignment === 'left' ? 'active' : ''}`}
                            onClick={() => { executeFormat('justifyLeft'); setFormatState(prev => ({ ...prev, alignment: 'left' })); }}
                            title="Align Left"
                        >
                            <i className="fa-solid fa-align-left"></i>
                        </button>
                        <button
                            className={`format-btn ${formatState.alignment === 'center' ? 'active' : ''}`}
                            onClick={() => { executeFormat('justifyCenter'); setFormatState(prev => ({ ...prev, alignment: 'center' })); }}
                            title="Center"
                        >
                            <i className="fa-solid fa-align-center"></i>
                        </button>
                        <button
                            className={`format-btn ${formatState.alignment === 'right' ? 'active' : ''}`}
                            onClick={() => { executeFormat('justifyRight'); setFormatState(prev => ({ ...prev, alignment: 'right' })); }}
                            title="Align Right"
                        >
                            <i className="fa-solid fa-align-right"></i>
                        </button>
                        <button
                            className={`format-btn ${formatState.alignment === 'justify' ? 'active' : ''}`}
                            onClick={() => { executeFormat('justifyFull'); setFormatState(prev => ({ ...prev, alignment: 'justify' })); }}
                            title="Justify"
                        >
                            <i className="fa-solid fa-align-justify"></i>
                        </button>
                    </div>
                </div>
                <div className="ribbon-group-label">Paragraph</div>
            </div>

            {/* Styles Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <div className="styles-gallery">
                        <div className="style-item" onClick={() => applyStyle('normal')}>
                            <span className="style-preview" style={{ fontFamily: 'Calibri', fontSize: '11px' }}>AaBbCc</span>
                            <span className="style-name">Normal</span>
                        </div>
                        <div className="style-item" onClick={() => applyStyle('heading1')}>
                            <span className="style-preview" style={{ fontFamily: 'Calibri', fontSize: '16px', color: '#2e74b5', fontWeight: 'bold' }}>AaBb</span>
                            <span className="style-name">Heading 1</span>
                        </div>
                        <div className="style-item" onClick={() => applyStyle('heading2')}>
                            <span className="style-preview" style={{ fontFamily: 'Calibri', fontSize: '14px', color: '#2e74b5' }}>AaBbCc</span>
                            <span className="style-name">Heading 2</span>
                        </div>
                        <div className="style-item" onClick={() => applyStyle('title')}>
                            <span className="style-preview" style={{ fontFamily: 'Calibri', fontSize: '18px' }}>AaBb</span>
                            <span className="style-name">Title</span>
                        </div>
                    </div>
                </div>
                <div className="ribbon-group-label">Styles</div>
            </div>

            {/* Editing Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn" onClick={onSearch}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <span>Find</span>
                    </button>
                    <button className="ribbon-btn" onClick={onSearch}>
                        <i className="fa-solid fa-arrows-rotate"></i>
                        <span>Replace</span>
                    </button>
                </div>
                <div className="ribbon-group-label">Editing</div>
            </div>
        </>
    );

    const renderInsertTab = () => (
        <>
            {/* Pages Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn" onClick={() => executeFormat('insertHTML', '<div style="page-break-after: always;"></div>')}>
                        <i className="fa-solid fa-file-lines"></i>
                        <span>Page Break</span>
                    </button>
                </div>
                <div className="ribbon-group-label">Pages</div>
            </div>

            {/* Tables Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn" onClick={onInsertTable}>
                        <i className="fa-solid fa-table"></i>
                        <span>Table</span>
                    </button>
                </div>
                <div className="ribbon-group-label">Tables</div>
            </div>

            {/* Illustrations Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn" onClick={onInsertImage}>
                        <i className="fa-solid fa-image"></i>
                        <span>Pictures</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => executeFormat('insertHTML', '<div style="width: 100px; height: 100px; background: #2e74b5; margin: 10px 0;"></div>')}>
                        <i className="fa-solid fa-shapes"></i>
                        <span>Shapes</span>
                    </button>
                </div>
                <div className="ribbon-group-label">Illustrations</div>
            </div>

            {/* Links Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn" onClick={() => {
                        const url = prompt('Enter URL:');
                        if (url) executeFormat('createLink', url);
                    }}>
                        <i className="fa-solid fa-link"></i>
                        <span>Link</span>
                    </button>
                </div>
                <div className="ribbon-group-label">Links</div>
            </div>

            {/* Text Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn" onClick={() => executeFormat('insertHTML', '<hr style="border: 1px solid #ccc; margin: 12px 0;" />')}>
                        <i className="fa-solid fa-minus"></i>
                        <span>Horizontal Line</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => {
                        const now = new Date();
                        executeFormat('insertText', now.toLocaleDateString());
                    }}>
                        <i className="fa-solid fa-calendar"></i>
                        <span>Date</span>
                    </button>
                </div>
                <div className="ribbon-group-label">Text</div>
            </div>
        </>
    );

    const renderLayoutTab = () => (
        <>
            {/* Page Setup Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn">
                        <i className="fa-solid fa-expand"></i>
                        <span>Margins</span>
                    </button>
                    <button className="ribbon-btn">
                        <i className="fa-solid fa-arrows-left-right-to-line"></i>
                        <span>Orientation</span>
                    </button>
                    <button className="ribbon-btn">
                        <i className="fa-solid fa-file"></i>
                        <span>Size</span>
                    </button>
                </div>
                <div className="ribbon-group-label">Page Setup</div>
            </div>

            {/* Paragraph Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content" style={{ flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px' }}>Indent:</label>
                        <button className="format-btn" onClick={() => executeFormat('outdent')}>
                            <i className="fa-solid fa-caret-left"></i>
                        </button>
                        <button className="format-btn" onClick={() => executeFormat('indent')}>
                            <i className="fa-solid fa-caret-right"></i>
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px' }}>Spacing:</label>
                        <select className="size-dropdown" style={{ width: '80px' }}>
                            <option value="1">Single</option>
                            <option value="1.15">1.15</option>
                            <option value="1.5">1.5</option>
                            <option value="2">Double</option>
                        </select>
                    </div>
                </div>
                <div className="ribbon-group-label">Paragraph</div>
            </div>
        </>
    );

    const renderViewTab = () => (
        <>
            {/* Views Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn active">
                        <i className="fa-solid fa-file-lines"></i>
                        <span>Print Layout</span>
                    </button>
                    <button className="ribbon-btn">
                        <i className="fa-solid fa-book-open"></i>
                        <span>Read Mode</span>
                    </button>
                    <button className="ribbon-btn">
                        <i className="fa-solid fa-globe"></i>
                        <span>Web Layout</span>
                    </button>
                </div>
                <div className="ribbon-group-label">Views</div>
            </div>

            {/* Zoom Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content">
                    <button className="ribbon-btn" onClick={() => setZoom(100)}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <span>100%</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => setZoom(75)}>
                        <i className="fa-solid fa-file"></i>
                        <span>One Page</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => setZoom(50)}>
                        <i className="fa-solid fa-files-o fa-copy"></i>
                        <span>Two Pages</span>
                    </button>
                </div>
                <div className="ribbon-group-label">Zoom</div>
            </div>

            {/* Show Group */}
            <div className="ribbon-group">
                <div className="ribbon-group-content" style={{ flexDirection: 'column', gap: '4px', alignItems: 'flex-start', paddingTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <input type="checkbox" defaultChecked /> Ruler
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <input type="checkbox" /> Gridlines
                    </label>
                </div>
                <div className="ribbon-group-label">Show</div>
            </div>
        </>
    );

    return (
        <div className="ribbon">
            {activeTab === 'home' && renderHomeTab()}
            {activeTab === 'insert' && renderInsertTab()}
            {activeTab === 'layout' && renderLayoutTab()}
            {activeTab === 'view' && renderViewTab()}
        </div>
    );
}

export default Ribbon;
