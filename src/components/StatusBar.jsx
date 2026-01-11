function StatusBar({ pageCount, currentPage, wordCount, zoom, setZoom }) {
    const handleZoomChange = (e) => {
        setZoom(parseInt(e.target.value));
    };

    return (
        <div className="status-bar">
            <div className="status-left">
                <span className="status-item">
                    Page {currentPage} of {pageCount}
                </span>
                <span className="status-item">
                    {wordCount} words
                </span>
            </div>
            <div className="status-right">
                <div className="zoom-controls">
                    <button
                        className="zoom-btn"
                        onClick={() => setZoom(Math.max(25, zoom - 10))}
                    >
                        <i className="fa-solid fa-minus"></i>
                    </button>
                    <input
                        type="range"
                        className="zoom-slider"
                        min="25"
                        max="200"
                        value={zoom}
                        onChange={handleZoomChange}
                    />
                    <button
                        className="zoom-btn"
                        onClick={() => setZoom(Math.min(200, zoom + 10))}
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>
                    <span style={{ minWidth: '40px', textAlign: 'center' }}>{zoom}%</span>
                </div>
            </div>
        </div>
    );
}

export default StatusBar;
