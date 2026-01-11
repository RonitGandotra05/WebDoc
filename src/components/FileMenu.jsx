function FileMenu({ onClose, onNew, onOpen, onSave, documentName, setDocumentName }) {
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="file-menu-overlay" onClick={handleBackdropClick}>
            <div className="file-menu">
                <div className="file-menu-header">
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            marginRight: '16px'
                        }}
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    File
                </div>
                <div className="file-menu-items">
                    <div className="file-menu-item" onClick={onNew}>
                        <i className="fa-solid fa-file"></i>
                        <span>New</span>
                    </div>
                    <div className="file-menu-item" onClick={onOpen}>
                        <i className="fa-solid fa-folder-open"></i>
                        <span>Open</span>
                    </div>
                    <div className="file-menu-item" onClick={() => { onSave(); onClose(); }}>
                        <i className="fa-solid fa-floppy-disk"></i>
                        <span>Save as DOCX</span>
                    </div>
                    <div className="file-menu-item" onClick={() => window.print()}>
                        <i className="fa-solid fa-print"></i>
                        <span>Print</span>
                    </div>
                    <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                    <div style={{ padding: '16px 24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                            Document Name
                        </label>
                        <input
                            type="text"
                            value={documentName}
                            onChange={(e) => setDocumentName(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FileMenu;
