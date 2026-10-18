import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';

export default function UploadPage() {
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/documents/')
      .then(res => res.json())
      .then(data => setDocuments(data))
      .catch(console.error);
  }, []);

  const handleUpload = (e: React.FormEvent, type: 'book' | 'past-paper') => {
    e.preventDefault();
    // In a real app, we would use FormData to send files to the backend
    alert(`Mock upload initiated for ${type}. Check network requests in production.`);
  };

  return (
    <div className="page-container">
      <h1>Data Ingestion</h1>
      
      <div className="card">
        <h2>Upload Textbook</h2>
        <form onSubmit={(e) => handleUpload(e, 'book')}>
          <div className="form-group">
            <label>Title</label>
            <input type="text" required placeholder="e.g., Physics Grade 11" />
          </div>
          <div className="form-group">
            <label>Board Association</label>
            <select>
              <option>Federal Board</option>
              <option>Sindh Board</option>
              <option>Punjab Board</option>
              <option>Aga Khan Board</option>
            </select>
          </div>
          <div className="form-group">
            <label>File (PDF/Image)</label>
            <input type="file" required accept=".pdf,image/*" />
          </div>
          <button className="btn" type="submit"><Upload size={16} style={{display:'inline', verticalAlign:'middle', marginRight:'5px'}}/> Upload Book</button>
        </form>
      </div>

      <div className="card">
        <h2>Upload Past Paper</h2>
        <form onSubmit={(e) => handleUpload(e, 'past-paper')}>
          <div className="form-group">
            <label>Exam Year</label>
            <input type="number" required placeholder="2024" />
          </div>
          <div className="form-group">
            <label>Board</label>
            <select>
              <option>Federal Board</option>
              <option>Sindh Board</option>
            </select>
          </div>
          <div className="form-group">
            <label>File (PDF/Image)</label>
            <input type="file" required accept=".pdf,image/*" />
          </div>
          <button className="btn" type="submit"><Upload size={16} style={{display:'inline', verticalAlign:'middle', marginRight:'5px'}}/> Upload Past Paper</button>
        </form>
      </div>

      <div className="card">
        <h2>Processing Status</h2>
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th style={{paddingBottom: '10px', borderBottom: '1px solid #ccc'}}>Title</th>
              <th style={{paddingBottom: '10px', borderBottom: '1px solid #ccc'}}>Type</th>
              <th style={{paddingBottom: '10px', borderBottom: '1px solid #ccc'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.id}>
                <td style={{padding: '10px 0'}}>{doc.title}</td>
                <td style={{padding: '10px 0'}}>{doc.type}</td>
                <td style={{padding: '10px 0'}}>
                  <span className={`status-badge status-${doc.status.toLowerCase()}`}>
                    {doc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
