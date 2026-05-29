import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [view, setView] = useState('profile');
  
  // Shelf Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [originalShelf, setOriginalShelf] = useState([]); // Backup for reverting
  
  const [isShelfModalOpen, setIsShelfModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Library / Box State
  const [selectedLibraryAlbum, setSelectedLibraryAlbum] = useState(null);
  const [selectedBox, setSelectedBox] = useState('');
  const [rating, setRating] = useState(0);
  
  const [shelf, setShelf] = useState(Array(8).fill(null));

  // --- TAB SWITCHING & SAFEGUARDS ---
  const switchView = (newView) => {
    // Prevent accidentally leaving unsaved changes
    if (isEditing && newView !== view) {
      if (!window.confirm("Are you sure you want to leave? Your shelf changes won't be saved.")) {
        return; // Stop the tab switch
      }
      setShelf([...originalShelf]); // Revert changes
      setIsEditing(false);
    }

    setView(newView);
    setSearchTerm('');
    setResults([]);
    setSelectedLibraryAlbum(null);
    setSelectedBox('');
    setRating(0);
  };

  // --- SHELF EDIT CONTROLS ---
  const toggleEditMode = () => {
    if (!isEditing) {
      setOriginalShelf([...shelf]); // Save a backup before editing
      setIsEditing(true);
    } else {
      setIsEditing(false); // Just save and close
    }
  };

  const revertChanges = () => {
    setShelf([...originalShelf]); // Restore from backup
    setIsEditing(false);
  };

  // --- SEARCH LOGIC ---
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
  };

  // --- SHELF LOGIC ---
  const openShelfSearch = (index) => {
    setActiveSlot(index);
    setIsShelfModalOpen(true);
  };

  const handlePinToShelf = (album) => {
    const newShelf = [...shelf];
    newShelf[activeSlot] = album;
    setShelf(newShelf);
    setIsShelfModalOpen(false);
    setSearchTerm('');
    setActiveSlot(null);
  };

  const removeFromShelf = (index) => {
    const newShelf = [...shelf];
    newShelf[index] = null;
    setShelf(newShelf);
  };

  // --- BOX LOGIC ---
  const handleSaveToBox = () => {
    if (!selectedBox) return alert("Please select a box first!");
    
    // FIX 3: Optional Ratings logic
    const ratingMsg = rating === 0 ? "unrated" : `with a ${rating}-star rating`;
    
    alert(`Saved ${selectedLibraryAlbum.strAlbum} to ${selectedBox} (${ratingMsg})!`);
    switchView('profile');
  };

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

      {view === 'profile' ? (
        <main className="profile-page">
          <section className="shelf-section">
            <div className="section-header">
              <h2>The Top 8</h2>
              
              {/* FIX 2: Added Revert Button */}
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
                      <img src={album.strAlbumThumb} alt="" />
                      <div className="nameplate">
                        <p className="np-title">{album.strAlbum}</p>
                        <p className="np-artist">{album.strArtist}</p>
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

          <section className="profile-feed">
             <div className="activity-placeholder">
                <h3>Recent Activity</h3>
                <p>Status updates will appear here...</p>
              </div>
          </section>
        </main>
      ) : (
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
                <select 
                  value={selectedBox} 
                  onChange={(e) => setSelectedBox(e.target.value)}
                  className="box-dropdown"
                >
                  <option value="">-- Select a Box --</option>
                  <option value="favorites">Favorites</option>
                  <option value="listened">Listened</option>
                  <option value="wishlist">Want to Listen</option>
                </select>

                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star} 
                      className={`star ${rating >= star ? 'filled' : ''}`}
                      onClick={() => setRating(rating === star ? 0 : star)} // Clicking same star resets to 0
                    >
                      ★
                    </span>
                  ))}
                </div>

                <button className="save-btn" onClick={handleSaveToBox}>Save to Box</button>
              </div>
            </div>
          ) : (
            /* FIX 1: Only render this box if they have started typing */
            searchTerm.trim().length > 0 && (
              <div className="search-results-scrollbox">
                {loading && <p className="loading-text">Flipping through records...</p>}
                {!loading && results.length === 0 && <p className="loading-text">No records found.</p>}
                {!loading && results.map((album) => (
                  <div key={album.idAlbum} className="search-row" onClick={() => setSelectedLibraryAlbum(album)}>
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

      {isShelfModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add to Shelf</h3>
              <button className="status-icon-btn close-modal" onClick={() => { setIsShelfModalOpen(false); setSearchTerm(''); }}>×</button>
            </div>
            <input 
              type="text" 
              placeholder="Artist name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="modal-results">
              {results.map(album => (
                <div key={album.idAlbum} className="modal-result-item" onClick={() => handlePinToShelf(album)}>
                  <img src={album.strAlbumThumb} alt="" />
                  <div className="modal-text">
                    <strong>{album.strAlbum}</strong>
                    <span>{album.strArtist}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;