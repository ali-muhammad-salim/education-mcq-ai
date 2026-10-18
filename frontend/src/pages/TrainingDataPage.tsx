import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function TrainingDataPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/training/approved-data')
      .then(res => res.json())
      .then(data => setData(data))
      .catch(console.error);
  }, []);

  const handleExport = () => {
    window.open('http://localhost:8000/api/training/export', '_blank');
  };

  return (
    <div className="page-container">
      <h1>Approved Training Data</h1>
      <p>This list exclusively contains verified and approved MCQs ready for fine-tuning.</p>
      
      <button className="btn" onClick={handleExport} style={{marginBottom: '20px'}}>
        <Download size={16} style={{display:'inline', verticalAlign:'middle', marginRight:'5px'}}/> Export JSONL
      </button>

      {data.map((mcq) => (
        <div key={mcq.id} className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span className={`status-badge status-approved`}>{mcq.status}</span>
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
        </div>
      ))}
    </div>
  );
}
