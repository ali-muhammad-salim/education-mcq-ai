import { useState, useEffect } from 'react';

export default function MCQViewer() {
  const [mcqs, setMcqs] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/mcqs/')
      .then(res => res.json())
      .then(data => setMcqs(data))
      .catch(console.error);
  }, []);

  return (
    <div className="page-container">
      <h1>View Generated MCQs</h1>
      
      {mcqs.map((mcq) => (
        <div key={mcq.id} className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span className={`status-badge status-${mcq.status.toLowerCase()}`}>{mcq.status}</span>
            <span style={{fontSize:'0.8rem', color:'#666'}}>ID: {mcq.id}</span>
          </div>
          
          <h3 style={{marginTop:'15px', marginBottom:'15px'}}>{mcq.questionText}</h3>
          
          <div>
            {mcq.options.map((opt: any) => (
              <div key={opt.id} className={`mcq-option ${opt.isCorrect ? 'correct' : ''}`}>
                {opt.text} {opt.isCorrect && '✓'}
              </div>
            ))}
          </div>
          
          <p style={{fontSize: '0.9rem', color: '#555', marginTop: '10px'}}>
            <strong>Explanation:</strong> {mcq.explanation}
          </p>
          
          <div className="provenance-box">
            <h4 style={{marginTop:0, marginBottom:'10px'}}>Provenance & Source Links</h4>
            <div className="provenance-grid">
              <div><strong>Board:</strong> {mcq.provenance.board}</div>
              <div><strong>Class:</strong> {mcq.provenance.class}</div>
              <div><strong>Subject:</strong> {mcq.provenance.subject}</div>
              <div><strong>Concept:</strong> {mcq.provenance.concept}</div>
              <div><strong>Source:</strong> {mcq.provenance.sourceBook} (p. {mcq.provenance.sourcePage})</div>
              {mcq.provenance.relatedPastPaperYear && (
                <div>
                  <strong>Past Paper Match:</strong> {mcq.provenance.relatedPastPaperYear} - {mcq.provenance.relatedQuestionNumber}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
