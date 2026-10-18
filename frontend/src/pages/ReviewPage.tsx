import { useState, useEffect } from 'react';
import { CheckCircle, Edit, XCircle } from 'lucide-react';

export default function ReviewPage() {
  const [mcqs, setMcqs] = useState<any[]>([]);
  const [actionReason, setActionReason] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:8000/api/mcqs/')
      .then(res => res.json())
      .then(data => setMcqs(data.filter((m: any) => m.status === 'DRAFT')))
      .catch(console.error);
  }, []);

  const handleReview = async (id: string, action: string) => {
    if (action === 'REJECT' && !actionReason) {
      alert("Please provide a rejection reason.");
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:8000/api/review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: actionReason })
      });
      const data = await res.json();
      alert(data.message);
      // Remove from queue
      setMcqs(mcqs.filter(m => m.id !== id));
      setActionReason('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <h1>Review Queue</h1>
      {mcqs.length === 0 ? <p>No MCQs in the review queue.</p> : null}
      
      {mcqs.map((mcq) => (
        <div key={mcq.id} className="card">
          <h3>{mcq.questionText}</h3>
          
          <div>
            {mcq.options.map((opt: any) => (
              <div key={opt.id} className={`mcq-option ${opt.isCorrect ? 'correct' : ''}`}>
                {opt.text} {opt.isCorrect && '✓'}
              </div>
            ))}
          </div>
          
          <div className="provenance-box" style={{marginBottom: '20px'}}>
             <strong>Provenance:</strong> {mcq.provenance.board}, {mcq.provenance.subject}, {mcq.provenance.concept}
          </div>

          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <button className="btn btn-success" onClick={() => handleReview(mcq.id, 'APPROVE')}>
              <CheckCircle size={16} style={{display:'inline', verticalAlign:'middle', marginRight:'5px'}}/> Approve
            </button>
            <button className="btn" onClick={() => alert("Edit mode mock: In real app, this opens an edit form.")}>
              <Edit size={16} style={{display:'inline', verticalAlign:'middle', marginRight:'5px'}}/> Edit
            </button>
            <input 
              type="text" 
              placeholder="Rejection Reason" 
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              style={{padding: '10px', borderRadius: '4px', border: '1px solid #ccc', flex: 1}}
            />
            <button className="btn btn-danger" onClick={() => handleReview(mcq.id, 'REJECT')}>
              <XCircle size={16} style={{display:'inline', verticalAlign:'middle', marginRight:'5px'}}/> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
