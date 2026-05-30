import React, { useState, useEffect, useRef } from 'react';
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
  
  // Main Search View State
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Library / Staging States (Main View)
  const [selectedLibraryAlbum, setSelectedLibraryAlbum] = useState(null);
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [availableBoxes, setAvailableBoxes] = useState(['Favorites', 'Listened', 'Want to Listen']);
  
  // Library State
  const [library, setLibrary] = useState([]);
  
  // Box Shared Edit States (Sprawl & Full View)
  const [activeSprawlBox, setActiveSprawlBox] = useState(null);
  const [activeFullBox, setActiveFullBox] = useState(null);
  const [isBoxEditing, setIsBoxEditing] = useState(false);
  const [tempBoxName, setTempBoxName] = useState('');
  
  // Quick Edit / Bulk Add Modal States
  const [quickModal, setQuickModal] = useState({ isOpen: false, step: 'search', context: 'add' }); 
  const [quickSearchTerm, setQuickSearchTerm] = useState('');
  const [quickResults, setQuickResults] = useState([]);
  const [quickLoading, setQuickLoading] = useState(false);
  
  // Full Box View States
  const [boxPage, setBoxPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  
  const [shelf, setShelf] = useState(Array(8).fill(null));
  const [toastMessage, setToastMessage] = useState('');

  // Class Project States
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const fileInputRef = useRef(null);

  // -------------------------
  // VIEW SWITCHING & WARNINGS
  // -------------------------
  const switchView = (newView) => {
    if (isEditing && newView !== view) {
      if (!window.confirm("Are you sure you want to leave? Your shelf changes won't be saved.")) return;
      setShelf([...originalShelf]);
      setIsEditing(false);
    }
    if (isBoxEditing && newView !== view) {
      if (!window.confirm("Are you sure you want to leave? Your box edits won't be saved.")) return;
      setIsBoxEditing(false);
    }
    
    if (newView !== 'profile') {
      setActiveSprawlBox(null);
    }

    if (newView !== 'boxFull') {
      setActiveFullBox(null);
      setBoxPage(1);
    }

    setView(newView);
    resetLibrarySearch();
  };

  const closeSprawlBox = () => {
    if (isBoxEditing) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to close this?")) return;
    }
    setActiveSprawlBox(null);
    setIsBoxEditing(false);
  };

  const resetLibrarySearch = () => {
    setSearchTerm('');
    setResults([]);
    setSelectedLibraryAlbum(null);
    setSelectedBoxes([]);
    setRating(0);
    setReview('');
  };

  // -------------------------
  // SHELF LOGIC
  // -------------------------
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

  const closeShelfModal = () => {
    setIsShelfModalOpen(false);
    setSearchTerm('');
    setShelfComment('');
    setSelectedShelfAlbum(null);
    setActiveSlot(null);
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

  // -------------------------
  // MAIN SEARCH LOGIC
  // -------------------------
  useEffect(() => {
    if (!searchTerm.trim()) { setResults([]); return; }
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://www.theaudiodb.com/api/v1/json/2/searchalbum.php?s=${encodeURIComponent(searchTerm)}`);
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
    saveAlbumToLibrary(selectedLibraryAlbum, selectedBoxes, rating, review);
    setToastMessage(`Added "${selectedLibraryAlbum.strAlbum}" to library!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // -------------------------
  // CORE LIBRARY LOGIC
  // -------------------------
  const saveAlbumToLibrary = (albumData, targetBoxes, targetRating, targetReview) => {
    const existingIndex = library.findIndex(item => item.album.idAlbum === albumData.idAlbum);
    let updatedLibrary = [...library];

    if (existingIndex >= 0) {
      updatedLibrary[existingIndex] = {
        ...updatedLibrary[existingIndex],
        boxes: targetBoxes,
        rating: targetRating,
        review: targetReview
      };
    } else {
      updatedLibrary.push({
        id: Date.now(),
        album: albumData,
        boxes: targetBoxes,
        rating: targetRating,
        review: targetReview
      });
    }
    setLibrary(updatedLibrary);
  };

  const removeAlbumFromBox = (albumId, boxName) => {
    let updatedLibrary = library.map(item => {
      if (item.id === albumId) {
        return { ...item, boxes: item.boxes.filter(b => b !== boxName) };
      }
      return item;
    });
    setLibrary(updatedLibrary);
  };

  // -------------------------
  // BOX RENAMING & DELETING
  // -------------------------
  const startBoxEdit = () => {
    setIsBoxEditing(true);
    setTempBoxName(activeSprawlBox || activeFullBox);
  };

  const handleSaveBoxEdits = () => {
    const currentBox = activeSprawlBox || activeFullBox;
    const newName = tempBoxName.trim();
    
    if (newName && newName !== currentBox) {
      if (availableBoxes.includes(newName)) {
        alert("A box with this name already exists.");
        return;
      }
      
      setAvailableBoxes(prev => prev.map(b => b === currentBox ? newName : b));
      setLibrary(prev => prev.map(item => ({
        ...item,
        boxes: item.boxes.map(b => b === currentBox ? newName : b)
      })));
      
      if (activeSprawlBox) setActiveSprawlBox(newName);
      if (activeFullBox) setActiveFullBox(newName);
    }
    setIsBoxEditing(false);
  };

  const handleDeleteBox = () => {
    const currentBox = activeSprawlBox || activeFullBox;
    if (!window.confirm(`Are you sure you want to delete the "${currentBox}" box? Your albums won't be deleted, but they will be removed from this box.`)) return;
    
    setAvailableBoxes(prev => prev.filter(b => b !== currentBox));
    setLibrary(prev => prev.map(item => ({
      ...item,
      boxes: item.boxes.filter(b => b !== currentBox)
    })));
    
    setIsBoxEditing(false);
    setActiveSprawlBox(null);
    if (view === 'boxFull') switchView('profile');
  };

  // -------------------------
  // QUICK MODAL (POPUP) LOGIC
  // -------------------------
  useEffect(() => {
    if (!quickSearchTerm.trim()) { setQuickResults([]); return; }
    const delay = setTimeout(async () => {
      setQuickLoading(true);
      try {
        const response = await fetch(`https://www.theaudiodb.com/api/v1/json/2/searchalbum.php?s=${encodeURIComponent(quickSearchTerm)}`);
        const data = await response.json();
        setQuickResults(data.album || []);
      } catch (e) { console.error(e); } finally { setQuickLoading(false); }
    }, 500);
    return () => clearTimeout(delay);
  }, [quickSearchTerm]);

  const openQuickSearchModal = () => {
    const targetBox = activeSprawlBox || activeFullBox;
    setQuickSearchTerm('');
    setQuickResults([]);
    setSelectedLibraryAlbum(null);
    setSelectedBoxes([targetBox]);
    setRating(0);
    setReview('');
    setQuickModal({ isOpen: true, step: 'search', context: 'add' });
  };

  const openQuickEditModal = (libraryItem) => {
    setSelectedLibraryAlbum(libraryItem.album);
    setSelectedBoxes(libraryItem.boxes);
    setRating(libraryItem.rating);
    setReview(libraryItem.review);
    setQuickModal({ isOpen: true, step: 'edit', context: 'edit' });
  };

  const handleQuickModalSelect = (album) => {
    const targetBox = activeSprawlBox || activeFullBox;
    const existingEntry = library.find(item => item.album.idAlbum === album.idAlbum);
    if (existingEntry) {
      const mergedBoxes = Array.from(new Set([...existingEntry.boxes, targetBox]));
      setSelectedBoxes(mergedBoxes);
      setRating(existingEntry.rating);
      setReview(existingEntry.review);
    } else {
      setSelectedBoxes([targetBox]);
      setRating(0);
      setReview('');
    }
    setSelectedLibraryAlbum(album);
    setQuickModal(prev => ({ ...prev, step: 'edit' }));
  };

  const handleQuickModalSave = () => {
    saveAlbumToLibrary(selectedLibraryAlbum, selectedBoxes, rating, review);
    setToastMessage(`Saved "${selectedLibraryAlbum.strAlbum}"!`);
    setTimeout(() => setToastMessage(''), 3000);

    if (quickModal.context === 'add') {
      setQuickModal(prev => ({ ...prev, step: 'search' }));
      setSelectedLibraryAlbum(null);
    } else {
      closeQuickModal();
    }
  };

  const closeQuickModal = () => {
    setQuickModal({ isOpen: false, step: 'search', context: 'add' });
    setQuickSearchTerm('');
  };

  // -------------------------
  // UI HELPERS & CLASS FEATURES
  // -------------------------
  const toggleBox = (boxName) => {
    setSelectedBoxes(prev => prev.includes(boxName) ? prev.filter(b => b !== boxName) : [...prev, boxName]);
  };

  const handleConfirmNewBox = () => {
    if (newBoxName && newBoxName.trim()) {
      const trimmedName = newBoxName.trim();
      if (!availableBoxes.includes(trimmedName)) {
        setAvailableBoxes([...availableBoxes, trimmedName]);
        if (selectedLibraryAlbum) setSelectedBoxes([...selectedBoxes, trimmedName]); 
      }
    }
    setIsAddBoxModalOpen(false);
    setNewBoxName('');
  };

  const expandToFullBox = (boxName) => {
    if (isBoxEditing) {
      if (!window.confirm("You have unsaved changes. Discard and expand?")) return;
      setIsBoxEditing(false);
    }
    setActiveFullBox(boxName);
    setBoxPage(1);
    switchView('boxFull');
  };

  // Save & Load Functions
  const handleSaveData = () => {
    const data = JSON.stringify({ library, shelf, availableBoxes });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'boogiedown-save.json';
    link.click();
    URL.revokeObjectURL(url);
    setToastMessage("Save file downloaded!");
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleLoadData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loadedData = JSON.parse(event.target.result);
        if (loadedData.library && loadedData.shelf && loadedData.availableBoxes) {
          setLibrary(loadedData.library);
          setShelf(loadedData.shelf);
          setAvailableBoxes(loadedData.availableBoxes);
          setToastMessage("Data successfully loaded!");
          setTimeout(() => setToastMessage(''), 3000);
          setView('profile');
        } else {
          alert("Invalid save file structure.");
        }
      } catch (err) {
        alert("Error reading file. Make sure it is a valid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  const handleResetApp = () => {
    if (window.confirm("CRITICAL WARNING: This will permanently erase your entire library, all your boxes, and clear your shelf. Are you absolutely sure?")) {
      setLibrary([]);
      setShelf(Array(8).fill(null));
      setAvailableBoxes(['Favorites', 'Listened', 'Want to Listen']);
      setView('profile');
      setToastMessage("Board has been reset.");
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const fullBoxItems = activeFullBox ? library.filter(item => item.boxes.includes(activeFullBox)) : [];
  const startIndex = (boxPage - 1) * ITEMS_PER_PAGE;
  const visibleItems = fullBoxItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(fullBoxItems.length / ITEMS_PER_PAGE);

  return (
    <div className="app-container">
      <nav className="top-nav">
        <div className="nav-logo" onClick={() => switchView('profile')}>
          BOOGIE<span>DOWN</span>
        </div>
        
        <div className="nav-actions">
          <button className="edit-btn" onClick={handleSaveData}>Save Data</button>
          <button className="edit-btn" onClick={() => fileInputRef.current.click()}>Load Data</button>
          <input type="file" accept=".json" style={{ display: 'none' }} ref={fileInputRef} onChange={handleLoadData} />
          
          <button className="nav-add-btn" onClick={() => switchView('search')}>
            + Add Music
          </button>
          <button className="status-icon-btn help-btn" onClick={() => setIsHelpOpen(true)}>?</button>
        </div>
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
                        <button className="status-icon-btn corner-btn" onClick={() => removeFromShelf(i)}>×</button>
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
            
            {!activeSprawlBox ? (
              <div className="boxes-grid">
                {availableBoxes.map(boxName => {
                  const boxAlbums = library.filter(item => item.boxes.includes(boxName));
                  const firstAlbum = boxAlbums.length > 0 ? boxAlbums[0].album.strAlbumThumb : null;
                  
                  return (
                    <div key={boxName} className="box-item" onClick={() => { setActiveSprawlBox(boxName); setIsBoxEditing(false); }}>
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
            ) : (
              <div className="sprawl-container">
                <div className="sprawl-header">
                  {isBoxEditing ? (
                    <input type="text" className="box-rename-input" value={tempBoxName} onChange={e => setTempBoxName(e.target.value)} autoFocus />
                  ) : (
                    <h3>{activeSprawlBox}</h3>
                  )}
                  <div className="sprawl-actions">
                    {isBoxEditing && <button className="revert-btn" onClick={handleDeleteBox}>Delete Box</button>}
                    <button 
                      className={`edit-btn ${isBoxEditing ? 'active' : ''}`} 
                      onClick={() => isBoxEditing ? handleSaveBoxEdits() : startBoxEdit()}
                    >
                      {isBoxEditing ? 'Save Changes' : 'Edit Box'}
                    </button>
                    {!isBoxEditing && <button className="edit-btn" onClick={() => expandToFullBox(activeSprawlBox)}>Expand Box</button>}
                    <button className="status-icon-btn close-modal" onClick={closeSprawlBox}>×</button>
                  </div>
                </div>
                
                <div className="sprawl-scroll-area">
                  {isBoxEditing && (
                    <div className="sprawl-card add-card" onClick={openQuickSearchModal}>
                      <div className="empty-slot-filler" style={{ height: '160px', border: '2px dashed var(--accent-green)' }}>
                        <span style={{ color: 'var(--accent-green)' }}>+</span>
                      </div>
                      <div className="sprawl-info" style={{ textAlign: 'center' }}>
                        <strong style={{ color: 'var(--accent-green)' }}>Add Album</strong>
                      </div>
                    </div>
                  )}

                  {library.filter(item => item.boxes.includes(activeSprawlBox)).length === 0 && !isBoxEditing ? (
                    <p style={{ color: '#776a5f' }}>You haven't added any records to this box yet.</p>
                  ) : (
                    library.filter(item => item.boxes.includes(activeSprawlBox)).map(item => (
                      <div 
                        key={item.id} 
                        className={`sprawl-card ${isBoxEditing ? 'editable-card' : ''}`}
                        onClick={() => isBoxEditing ? openQuickEditModal(item) : null}
                      >
                        {isBoxEditing && (
                          <button 
                            className="status-icon-btn corner-btn" 
                            style={{ zIndex: 10 }}
                            onClick={(e) => { e.stopPropagation(); removeAlbumFromBox(item.id, activeSprawlBox); }}
                          >×</button>
                        )}
                        <img src={item.album.strAlbumThumb} alt="" />
                        <div className="sprawl-info">
                          <strong>{item.album.strAlbum}</strong>
                          <span className="sprawl-artist">{item.album.strArtist}</span>
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
           <div className="search-header-row" style={{justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '20px', flexGrow: 1}}>
              <button className="back-link" onClick={() => switchView('profile')}>← Back</button>
              {isBoxEditing ? (
                <input type="text" className="box-rename-input" style={{ fontSize: '2rem' }} value={tempBoxName} onChange={e => setTempBoxName(e.target.value)} autoFocus />
              ) : (
                <h1 className="expanded-box-title">{activeFullBox}</h1>
              )}
            </div>
            
            <div className="sprawl-actions">
              {isBoxEditing && <button className="revert-btn" onClick={handleDeleteBox}>Delete Box</button>}
              <button 
                className={`edit-btn ${isBoxEditing ? 'active' : ''}`} 
                onClick={() => isBoxEditing ? handleSaveBoxEdits() : startBoxEdit()}
              >
                {isBoxEditing ? 'Save Changes' : 'Edit Box'}
              </button>
            </div>
          </div>

          <div className="box-full-list">
            {isBoxEditing && (
               <div className="box-full-item add-card" onClick={openQuickSearchModal} style={{cursor: 'pointer', justifyContent: 'center', border: '2px dashed var(--accent-green)', padding: '30px'}}>
                  <span style={{ color: 'var(--accent-green)', fontSize: '1.2rem', fontWeight: 'bold' }}>+ Add Album to {activeFullBox}</span>
               </div>
            )}

            {visibleItems.length === 0 && !isBoxEditing ? (
              <p>This box is empty.</p>
            ) : (
              visibleItems.map(item => (
                <div 
                  key={item.id} 
                  className={`box-full-item ${isBoxEditing ? 'editable-card' : ''}`}
                  onClick={() => isBoxEditing ? openQuickEditModal(item) : null}
                  style={{ position: 'relative' }}
                >
                  {isBoxEditing && (
                    <button 
                      className="status-icon-btn corner-btn" 
                      onClick={(e) => { e.stopPropagation(); removeAlbumFromBox(item.id, activeFullBox); }}
                    >×</button>
                  )}
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

          {totalPages > 1 && !isBoxEditing && (
            <div className="pagination-controls">
              <button disabled={boxPage === 1} onClick={() => setBoxPage(prev => prev - 1)} className="edit-btn">Previous</button>
              <span>Page {boxPage} of {totalPages}</span>
              <button disabled={boxPage === totalPages} onClick={() => setBoxPage(prev => prev + 1)} className="edit-btn">Next</button>
            </div>
          )}
        </main>
      )}

      {/* SEARCH / STAGING VIEW */}
      {view === 'search' && (
        <main className="search-page">
          <div className="search-header-row">
            <button className="back-link" onClick={() => switchView('profile')}>← Back</button>
            <h2>Add to Library</h2>
          </div>
          
          <div className="search-input-wrapper">
            <input type="text" placeholder="Search for an artist..." value={searchTerm} onChange={handleSearchChange} />
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
                      <input type="checkbox" checked={selectedBoxes.includes(box)} onChange={() => toggleBox(box)} style={{ display: 'none' }} />
                      {box}
                    </label>
                  ))}
                  <button className="add-box-btn" onClick={() => setIsAddBoxModalOpen(true)} title="Add New Box">+</button>
                </div>

                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`star ${rating >= star ? 'filled' : ''}`} onClick={() => setRating(rating === star ? 0 : star)}>★</span>
                  ))}
                </div>

                <textarea className="review-input" placeholder="Add a comment or review (optional)..." value={review} onChange={(e) => setReview(e.target.value)} rows="3"></textarea>
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

      {/* QUICK ADD/EDIT POPUP MODAL */}
      {quickModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-header">
              <h3>{quickModal.step === 'search' ? `Add to ${activeSprawlBox || activeFullBox}` : 'Edit Album'}</h3>
              <button className="status-icon-btn close-modal" onClick={closeQuickModal}>×</button>
            </div>

            {quickModal.step === 'search' ? (
              <>
                <div className="modal-inputs">
                  <input type="text" placeholder="Search artist..." value={quickSearchTerm} onChange={(e) => setQuickSearchTerm(e.target.value)} autoFocus />
                </div>
                <div className="modal-results">
                  {quickLoading && <p className="loading-text">Loading...</p>}
                  {!quickLoading && quickResults.map(album => (
                    <div key={album.idAlbum} className="modal-result-item" onClick={() => handleQuickModalSelect(album)}>
                      <img src={album.strAlbumThumb} alt="" />
                      <div className="modal-text">
                        <strong>{album.strAlbum}</strong>
                        <span>{album.strArtist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="modal-staging" style={{ alignItems: 'center' }}>
                <img src={selectedLibraryAlbum?.strAlbumThumb} alt="" style={{ width: '120px', height: '120px', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }} />
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>{selectedLibraryAlbum?.strAlbum}</h4>
                  <p style={{ margin: '0', color: '#776a5f' }}>{selectedLibraryAlbum?.strArtist}</p>
                </div>

                <div className="box-toggles" style={{ marginTop: '10px' }}>
                  {availableBoxes.map(box => (
                    <label key={box} className={`box-pill ${selectedBoxes.includes(box) ? 'active' : ''}`}>
                      <input type="checkbox" checked={selectedBoxes.includes(box)} onChange={() => toggleBox(box)} style={{ display: 'none' }} />
                      {box}
                    </label>
                  ))}
                </div>

                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`star ${rating >= star ? 'filled' : ''}`} onClick={() => setRating(rating === star ? 0 : star)}>★</span>
                  ))}
                </div>

                <textarea className="review-input" placeholder="Review or comment..." value={review} onChange={(e) => setReview(e.target.value)} rows="2"></textarea>

                <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
                  {quickModal.context === 'add' && (
                    <button className="back-link" onClick={() => setQuickModal(prev => ({ ...prev, step: 'search' }))} style={{ flex: 1 }}>← Back</button>
                  )}
                  <button className="save-btn" onClick={handleQuickModalSave} style={{ flex: 2 }}>
                    {quickModal.context === 'add' ? 'Save & Add Another' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HELP MODAL */}
      {isHelpOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.5rem' }}>How to Use This App</h3>
              <button className="status-icon-btn close-modal" onClick={() => setIsHelpOpen(false)}>×</button>
            </div>
            <div className="help-content" style={{ lineHeight: '1.6', marginTop: '10px' }}>
              <p><strong>1. Build Your Library:</strong> Click <em>+ Add Music</em> at the top to search for albums. Write reviews, leave star ratings, and assign them to your Boxes.</p>
              <p><strong>2. Organize in Boxes:</strong> Group your records! Click on a Box in your profile to expand it, or click <em>Edit Box</em> to rename it, delete it, or quickly add new albums directly to it.</p>
              <p><strong>3. Pin to Your Shelf:</strong> Curate your "Top 8" at the top of your profile. Click <em>Edit Shelf</em> to add your absolute favorite albums and write custom captions for them.</p>
              <p><strong>4. Save & Load (Data Persistence):</strong> Don't lose your work! Use the <em>Save Data</em> button to download your .json file. Later, use <em>Load Data</em> to upload that file and instantly resume your setup.</p>
            </div>
            <button className="save-btn" onClick={() => setIsHelpOpen(false)} style={{ marginTop: '20px' }}>Got it!</button>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}

      {/* ADD NEW BOX MODAL */}
      {isAddBoxModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '300px' }}>
            <div className="modal-header">
              <h3>Create New Box</h3>
              <button className="status-icon-btn close-modal" onClick={() => { setIsAddBoxModalOpen(false); setNewBoxName(''); }}>×</button>
            </div>
            <div className="modal-inputs">
              <input type="text" placeholder="Box name..." value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} autoFocus />
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
                <input type="text" placeholder="Add a comment to display (optional)..." value={shelfComment} onChange={(e) => setShelfComment(e.target.value)} className="modal-comment-input" />
                <div className="modal-staging-actions">
                  <button className="back-link" onClick={() => setSelectedShelfAlbum(null)}>← Back to search</button>
                  <button className="save-btn small-save" onClick={handleConfirmShelfPin}>Confirm Pin</button>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-inputs">
                  <input type="text" placeholder="Search artist..." value={searchTerm} onChange={handleSearchChange} />
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

      {/* ERASER FOOTER */}
      {view === 'profile' && (
        <footer style={{ marginTop: '100px', textAlign: 'center', paddingBottom: '30px' }}>
          <button 
            onClick={handleResetApp} 
            style={{ background: 'transparent', border: 'none', color: '#c0392b', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Erase All Data (Reset Board)
          </button>
        </footer>
      )}
    </div>
  );
}

export default App;