import { useState, useCallback } from 'react';

function TableDialog({ onClose, onInsert }) {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const [hoverRows, setHoverRows] = useState(0);
    const [hoverCols, setHoverCols] = useState(0);

    const handleCellHover = useCallback((r, c) => {
        setHoverRows(r);
        setHoverCols(c);
    }, []);

    const handleCellClick = useCallback((r, c) => {
        onInsert(r, c);
    }, [onInsert]);

    const handleInsert = () => {
        onInsert(rows, cols);
    };

    return (
        <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="dialog">
                <div className="dialog-header">Insert Table</div>
                <div className="dialog-content">
                    <div className="table-grid-picker">
                        {Array.from({ length: 8 }).map((_, rowIndex) =>
                            Array.from({ length: 10 }).map((_, colIndex) => (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={`table-grid-cell ${rowIndex < hoverRows && colIndex < hoverCols ? 'selected' : ''
                                        }`}
                                    onMouseEnter={() => handleCellHover(rowIndex + 1, colIndex + 1)}
                                    onMouseLeave={() => { setHoverRows(0); setHoverCols(0); }}
                                    onClick={() => handleCellClick(rowIndex + 1, colIndex + 1)}
                                />
                            ))
                        )}
                    </div>
                    <div className="table-size-label">
                        {hoverRows > 0 && hoverCols > 0
                            ? `${hoverRows} × ${hoverCols} Table`
                            : 'Select table size'}
                    </div>
                    <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Rows:</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={rows}
                                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                                style={{
                                    width: '60px',
                                    padding: '4px 8px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Columns:</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={cols}
                                onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                                style={{
                                    width: '60px',
                                    padding: '4px 8px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px'
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div className="dialog-footer">
                    <button className="search-btn secondary" onClick={onClose}>Cancel</button>
                    <button className="search-btn primary" onClick={handleInsert}>Insert</button>
                </div>
            </div>
        </div>
    );
}

export default TableDialog;
