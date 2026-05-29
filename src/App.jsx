import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [view, setView] = useState('profile');
  
  // Shelf Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [originalShelf, setOriginalShelf] = useState([]);
  
  // Shelf Modal States
  const [isShelfModalOpen, setIsShelfModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [selectedShelfAlbum, setSelectedShelfAlbum] = useState(null);
  const [shelfComment, setShelfComment] = useState('');
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Library / Box States
  const [selectedLibraryAlbum, setSelectedLibraryAlbum] = useState(null);
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [availableBoxes, setAvailableBoxes] = useState(['Favorites', 'Listened', 'Want to Listen']);
  
  // Library State
  const [library, setLibrary] = useState([]);
  const [activeSprawlBox, setActiveSprawlBox] = useState(null);
  
  // Full Box View States
  const [activeFullBox, setActiveFullBox] = useState(null);
  const [boxPage, setBoxPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  
  const [shelf, setShelf] = useState(Array(8).fill(null));

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState('');

  const switchView = (newView) => {
    if (isEditing && newView !== view) {
      if (!window.confirm("Are you sure you want to leave? Your shelf changes won't be saved.")) return;
      setShelf([...originalShelf]);
      setIsEditing(false);
    }
    setView(newView);
    resetLibrarySearch();
    if (newView !== 'boxFull') {
      setActiveFullBox(null);
      setBoxPage(1);
    }
  };

  const resetLibrarySearch = () => {
    setSearchTerm('');
    setResults([]);
    setSelectedLibraryAlbum(null);
    setSelectedBoxes([]);
    setRating(0);
    setReview('');
  };

  const closeShelfModal = () => {
    setIsShelfModalOpen(false);
    setSearchTerm('');
    setShelfComment('');
    setSelectedShelfAlbum(null);
    setActiveSlot(null);
  };

  const toggleEditMode = () => {
    if (!isEditing) {
      setOriginalShelf([...shelf]);
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  };

  const revertChanges = () => {
    setShelf([...originalShelf]);
    setIsEditing(false);
  };

  useEffect(() => {
    if (!searchTerm.trim()) { setResults([]); return; }
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://www.theaudiodb.com/api/v1/json/2/searchalbum.php?s=${encodeURIComponent(searchTerm)}`
        );
        const data = await response.json();
        setResults(data.album || []);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (selectedLibraryAlbum) setSelectedLibraryAlbum(null);
    if (selectedShelfAlbum) setSelectedShelfAlbum(null);
  };

  const openShelfSearch = (index) => {
    setActiveSlot(index);
    setIsShelfModalOpen(true);
  };

  const handleConfirmShelfPin = () => {
    const newShelf = [...shelf];
    newShelf[activeSlot] = { ...selectedShelfAlbum, customComment: shelfComment };
    setShelf(newShelf);
    closeShelfModal();
  };

  const removeFromShelf = (index) => {
    const newShelf = [...shelf];
    newShelf[index] = null;
    setShelf(newShelf);
  };

  const toggleBox = (boxName) => {
    if (selectedBoxes.includes(boxName)) {
      setSelectedBoxes(selectedBoxes.filter(b => b !== boxName));
    } else {
      setSelectedBoxes([...selectedBoxes, boxName]);
    }
  };

  const handleConfirmNewBox = () => {
    if (newBoxName && newBoxName.trim()) {
      const trimmedName = newBoxName.trim();
      if (!availableBoxes.includes(trimmedName)) {
        setAvailableBoxes([...availableBoxes, trimmedName]);
        setSelectedBoxes([...selectedBoxes, trimmedName]); 
      }
    }
    setIsAddBoxModalOpen(false);
    setNewBoxName('');
  };

  // Pre-fill data if album already exists in library
  const handleSelectLibraryAlbum = (album) => {
    const existingEntry = library.find(item => item.album.idAlbum === album.idAlbum);
    if (existingEntry) {
      setSelectedBoxes(existingEntry.boxes);
      setRating(existingEntry.rating);
      setReview(existingEntry.review);
    } else {
      setSelectedBoxes([]);
      setRating(0);
      setReview('');
    }
    setSelectedLibraryAlbum(album);
  };

  const handleSaveToBox = () => {
    if (selectedBoxes.length === 0 && rating === 0 && !review.trim()) {
      return alert("Please select a box, leave a rating, or write a comment before saving!");
    }
    
    const existingIndex = library.findIndex(item => item.album.idAlbum === selectedLibraryAlbum.idAlbum);
    const targetBoxes = selectedBoxes.length > 0 ? selectedBoxes : ['Uncategorized'];
    let updatedLibrary = [...library];

    if (existingIndex >= 0) {
      updatedLibrary[existingIndex] = {
        ...updatedLibrary[existingIndex],
        boxes: targetBoxes,
        rating: rating,
        review: review
      };
    } else {
      updatedLibrary.push({
        id: Date.now(),
        album: selectedLibraryAlbum,
        boxes: targetBoxes,
        rating: rating,
        review: review
      });
    }
    
    setLibrary(updatedLibrary);

    if (selectedBoxes.length === 0 && !availableBoxes.includes('Uncategorized')) {
       setAvailableBoxes([...availableBoxes, 'Uncategorized']);
    }

    // Show toast and keep user on the page to add more
    setToastMessage(`Added "${selectedLibraryAlbum.strAlbum}" to ${targetBoxes.join(', ')}`);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const expandToFullBox = (boxName) => {
    setActiveFullBox(boxName);
    setBoxPage(1);
    switchView('boxFull');
  };

  // Pagination Logic for Full Box View
  const fullBoxItems = activeFullBox ? library.filter(item => item.boxes.includes(activeFullBox)) : [];
  const startIndex = (boxPage - 1) * ITEMS_PER_PAGE;
  const visibleItems = fullBoxItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(fullBoxItems.length / ITEMS_PER_PAGE);

  return (
    <div className="app-container">
      <nav className="top-nav">
        <div className="nav-logo" onClick={() => switchView('profile')}>
          VINYL<span>VAULT</span>
        </div>
        <button className="nav-add-btn" onClick={() => switchView('search')}>
          + Add Music
        </button>
      </nav>

      {view === 'profile' && (
        <main className="profile-page">
          <section className="shelf-section">
            <div className="section-header">
              <h2>The Top 8</h2>
              <div className="edit-controls">
                {isEditing && (
                  <button className="revert-btn" onClick={revertChanges}>Revert</button>
                )}
                <button 
                  className={`edit-btn ${isEditing ? 'active' : ''}`}
                  onClick={toggleEditMode}
                >
                  {isEditing ? 'Save Changes' : 'Edit Shelf'}
                </button>
              </div>
            </div>

            <div className="shelf-display">
              {shelf.map((album, i) => (
                <div key={i} className="shelf-slot">
                  {album ? (
                    <div className="album-card">
                      <img src={album.strAlbumThumb} alt="" className="shelf-album-img" />
                      <div className="nameplate">
                        <p className="np-title">{album.strAlbum}</p>
                        <p className="np-artist">{album.strArtist}</p>
                        {album.customComment && (
                          <p className="np-comment">"{album.customComment}"</p>
                        )}
                      </div>
                      {isEditing && (
                        <button className="status-icon-btn" onClick={() => removeFromShelf(i)}>×</button>
                      )}
                    </div>
                  ) : (
                    isEditing && (
                      <div className="empty-slot-filler" onClick={() => openShelfSearch(i)}>
                        <span>+</span>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="boxes-section">
            <div className="section-header">
              <h2>My Boxes</h2>
            </div>
            
            <div className="boxes-grid">
              {availableBoxes.map(boxName => {
                const boxAlbums = library.filter(item => item.boxes.includes(boxName));
                const firstAlbum = boxAlbums.length > 0 ? boxAlbums[0].album.strAlbumThumb : null;
                
                return (
                  <div key={boxName} className="box-item" onClick={() => setActiveSprawlBox(activeSprawlBox === boxName ? null : boxName)}>
                    <div className="box-cover">
                      {firstAlbum ? <img src={firstAlbum} alt="box cover" /> : <div className="empty-box-placeholder">Empty</div>}
                    </div>
                    <h4>{boxName}</h4>
                    <span>{boxAlbums.length} records</span>
                  </div>
                );
              })}
              
              <div className="box-item" onClick={() => setIsAddBoxModalOpen(true)}>
                <div className="box-cover add-new-box-cover">
                  <span style={{ fontSize: '2rem', color: '#776a5f' }}>+</span>
                </div>
                <h4>New Box</h4>
              </div>
            </div>

            {activeSprawlBox && (
              <div className="sprawl-container">
                <div className="sprawl-header">
                  <h3>Box: {activeSprawlBox}</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="edit-btn" onClick={() => expandToFullBox(activeSprawlBox)}>Expand Box</button>
                    <button className="status-icon-btn close-sprawl" onClick={() => setActiveSprawlBox(null)}>×</button>
                  </div>
                </div>
                
                <div className="sprawl-scroll-area">
                  {library.filter(item => item.boxes.includes(activeSprawlBox)).length === 0 ? (
                    <p style={{ color: '#776a5f' }}>You haven't added any records to this box yet.</p>
                  ) : (
                    library.filter(item => item.boxes.includes(activeSprawlBox)).map(item => (
                      <div key={item.id} className="sprawl-card">
                        <img src={item.album.strAlbumThumb} alt="" />
                        <div className="sprawl-info">
                          <strong>{item.album.strAlbum}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      )}

      {view === 'boxFull' && (
        <main className="box-full-page">
           <div className="search-header-row">
            <button className="back-link" onClick={() => switchView('profile')}>← Back to Profile</button>
            <h2>Box: {activeFullBox}</h2>
          </div>

          <div className="box-full-list">
            {visibleItems.length === 0 ? (
              <p>This box is empty.</p>
            ) : (
              visibleItems.map(item => (
                <div key={item.id} className="box-full-item">
                  <img src={item.album.strAlbumThumb} alt={item.album.strAlbum} />
                  <div className="box-full-details">
                    <h3>{item.album.strAlbum}</h3>
                    <p className="bf-artist">{item.album.strArtist}</p>
                    
                    <div className="bf-rating-review">
                      {item.rating > 0 && <div className="sprawl-rating">{"★".repeat(item.rating)}</div>}
                      {item.review && <p className="sprawl-review">"{item.review}"</p>}
                      {item.rating === 0 && !item.review && <span style={{color: '#aaa', fontStyle: 'italic', fontSize: '0.85rem'}}>No rating or review yet.</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button 
                disabled={boxPage === 1} 
                onClick={() => setBoxPage(prev => prev - 1)}
                className="edit-btn"
              >
                Previous
              </button>
              <span>Page {boxPage} of {totalPages}</span>
              <button 
                disabled={boxPage === totalPages} 
                onClick={() => setBoxPage(prev => prev + 1)}
                className="edit-btn"
              >
                Next
              </button>
            </div>
          )}
        </main>
      )}

      {view === 'search' && (
        <main className="search-page">
          <div className="search-header-row">
            <button className="back-link" onClick={() => switchView('profile')}>← Back</button>
            <h2>Add to Library</h2>
          </div>
          
          <div className="search-input-wrapper">
            <input 
              type="text" 
              placeholder="Search for an artist..." 
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {selectedLibraryAlbum ? (
            <div className="staging-area">
              <img className="staging-img" src={selectedLibraryAlbum.strAlbumThumb} alt="" />
              <div className="staging-details">
                <h3>{selectedLibraryAlbum.strAlbum}</h3>
                <p>{selectedLibraryAlbum.strArtist}</p>
              </div>

              <div className="staging-controls">
                <div className="box-toggles">
                  {availableBoxes.map(box => (
                    <label key={box} className={`box-pill ${selectedBoxes.includes(box) ? 'active' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedBoxes.includes(box)} 
                        onChange={() => toggleBox(box)}
                        style={{ display: 'none' }} 
                      />
                      {box}
                    </label>
                  ))}
                  <button className="add-box-btn" onClick={() => setIsAddBoxModalOpen(true)} title="Add New Box">+</button>
                </div>

                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star} 
                      className={`star ${rating >= star ? 'filled' : ''}`}
                      onClick={() => setRating(rating === star ? 0 : star)}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <textarea 
                  className="review-input" 
                  placeholder="Add a comment or review (optional)..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows="3"
                ></textarea>

                <button className="save-btn" onClick={handleSaveToBox}>Save to Library</button>
                <button className="back-link" onClick={() => setSelectedLibraryAlbum(null)} style={{ border: 'none', marginTop: '-5px' }}>Cancel</button>
              </div>
            </div>
          ) : (
            searchTerm.trim().length > 0 && (
              <div className="search-results-scrollbox">
                {loading && <p className="loading-text">Flipping through records...</p>}
                {!loading && results.length === 0 && <p className="loading-text">No records found.</p>}
                {!loading && results.map((album) => (
                  <div key={album.idAlbum} className="search-row" onClick={() => handleSelectLibraryAlbum(album)}>
                    <img src={album.strAlbumThumb} alt="" />
                    <div className="row-info">
                      <strong>{album.strAlbum}</strong>
                      <span>{album.strArtist}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </main>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}

      {/* ADD BOX MODAL */}
      {isAddBoxModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '300px' }}>
            <div className="modal-header">
              <h3>Create New Box</h3>
              <button className="status-icon-btn close-modal" onClick={() => { setIsAddBoxModalOpen(false); setNewBoxName(''); }}>×</button>
            </div>
            <div className="modal-inputs">
              <input 
                type="text" 
                placeholder="Box name..." 
                value={newBoxName}
                onChange={(e) => setNewBoxName(e.target.value)}
                autoFocus
              />
              <button className="save-btn" onClick={handleConfirmNewBox} style={{ marginTop: '10px' }}>Create Box</button>
            </div>
          </div>
        </div>
      )}

      {/* SHELF MODAL */}
      {isShelfModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add to Shelf</h3>
              <button className="status-icon-btn close-modal" onClick={closeShelfModal}>×</button>
            </div>
            
            {selectedShelfAlbum ? (
              <div className="modal-staging">
                <div className="modal-staging-info">
                  <img src={selectedShelfAlbum.strAlbumThumb} alt="" />
                  <div>
                    <h4>{selectedShelfAlbum.strAlbum}</h4>
                    <p>{selectedShelfAlbum.strArtist}</p>
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Add a comment to display (optional)..." 
                  value={shelfComment}
                  onChange={(e) => setShelfComment(e.target.value)}
                  className="modal-comment-input"
                />
                <div className="modal-staging-actions">
                  <button className="back-link" onClick={() => setSelectedShelfAlbum(null)}>← Back to search</button>
                  <button className="save-btn small-save" onClick={handleConfirmShelfPin}>Confirm Pin</button>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-inputs">
                  <input 
                    type="text" 
                    placeholder="Search artist..." 
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </div>
                <div className="modal-results">
                  {results.map(album => (
                    <div key={album.idAlbum} className="modal-result-item" onClick={() => setSelectedShelfAlbum(album)}>
                      <img src={album.strAlbumThumb} alt="" />
                      <div className="modal-text">
                        <strong>{album.strAlbum}</strong>
                        <span>{album.strArtist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;