import React, { useEffect, useState } from 'react';
import './BoardManagementPage.css';

interface BoardProfile {
  id: string;
  name: string;
  short_code: string;
  country: string;
  description: string;
  status: string;
  website?: string;
  headquarters?: string;
  established_year?: number;
  class_levels: string[];
  subjects_by_class: Record<string, string[]>;
}

const BoardManagementPage: React.FC = () => {
  const [boards, setBoards] = useState<BoardProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedBoard, setSelectedBoard] = useState<BoardProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<string>('');

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      const data = await res.json();
      setBoards(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBoard = (board: BoardProfile) => {
    setSelectedBoard(board);
    setFormData(JSON.stringify(board, null, 2));
    setIsEditing(false);
  };

  const handleAddNew = () => {
    const newBoard: Partial<BoardProfile> = {
      id: "new_board",
      name: "New Board",
      short_code: "NEW",
      country: "",
      description: "",
      status: "ACTIVE",
      class_levels: [],
      subjects_by_class: {}
    };
    setSelectedBoard(newBoard as BoardProfile);
    setFormData(JSON.stringify(newBoard, null, 2));
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const parsedData = JSON.parse(formData);
      const res = await fetch('http://localhost:8000/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to save board');
      }
      alert('Board saved successfully!');
      fetchBoards();
      setIsEditing(false);
    } catch (err: any) {
      alert(`Error saving board: ${err.message}`);
    }
  };

  if (loading) return <div>Loading boards...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="board-management-container">
      <header className="page-header">
        <h1>Board & Syllabus Management</h1>
        <p>View, add, or update the educational boards and their syllabus structures.</p>
      </header>

      <div className="board-layout">
        <aside className="board-sidebar">
          <h3>Registered Boards</h3>
          <ul className="board-list">
            {boards.map(b => (
              <li 
                key={b.short_code} 
                className={selectedBoard?.short_code === b.short_code ? 'active' : ''}
                onClick={() => handleSelectBoard(b)}
              >
                {b.name} ({b.short_code})
              </li>
            ))}
          </ul>
          <button className="btn primary full-width" onClick={handleAddNew}>+ Add New Board</button>
        </aside>

        <main className="board-details">
          {selectedBoard ? (
            <div className="board-editor">
              <div className="editor-header">
                <h2>{isEditing ? (selectedBoard.short_code === 'NEW' ? 'Create New Board' : 'Edit Board') : selectedBoard.name}</h2>
                {!isEditing ? (
                  <button className="btn secondary" onClick={() => setIsEditing(true)}>Edit JSON</button>
                ) : (
                  <div className="editor-actions">
                    <button className="btn secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button className="btn primary" onClick={handleSave}>Save Changes</button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <textarea 
                  className="json-editor"
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  rows={25}
                />
              ) : (
                <div className="board-info-card">
                  <div className="info-grid">
                    <div><strong>Short Code:</strong> {selectedBoard.short_code}</div>
                    <div><strong>Country:</strong> {selectedBoard.country}</div>
                    <div><strong>Status:</strong> <span className={`status-badge ${selectedBoard.status.toLowerCase()}`}>{selectedBoard.status}</span></div>
                    {selectedBoard.website && <div><strong>Website:</strong> <a href={selectedBoard.website} target="_blank" rel="noreferrer">{selectedBoard.website}</a></div>}
                  </div>
                  
                  <div className="info-section">
                    <h4>Description</h4>
                    <p>{selectedBoard.description}</p>
                  </div>

                  <div className="info-section">
                    <h4>Class Levels</h4>
                    <div className="tag-list">
                      {selectedBoard.class_levels?.map(cls => (
                        <span key={cls} className="tag">{cls}</span>
                      ))}
                    </div>
                  </div>

                  <div className="info-section">
                    <h4>Subjects by Class</h4>
                    {selectedBoard.subjects_by_class && Object.entries(selectedBoard.subjects_by_class).map(([cls, subjects]) => (
                      <div key={cls} className="subject-group">
                        <strong>Class {cls}:</strong>
                        <span> {subjects.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p>Select a board from the sidebar to view or edit its syllabus configuration.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BoardManagementPage;
