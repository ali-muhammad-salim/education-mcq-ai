import { useState } from 'react';
import { Play } from 'lucide-react';

export default function FineTuningPage() {
  const [config, setConfig] = useState({
    baseModel: 'Qwen3-7B',
    dataset: 'approved_v1.jsonl',
    trainSplit: 80,
    epochs: 3,
    learningRate: 2e-5,
    loraRank: 16,
    batchSize: 4,
    maxSeqLength: 2048,
    outputDir: './models/finetuned/qwen3-mcq-v1'
  });

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/training/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      console.error(err);
      alert("Failed to reach API.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  return (
    <div className="page-container">
      <h1>Fine-Tuning Configuration</h1>
      <p style={{color: '#b91c1c', fontWeight: 'bold'}}>
        Notice: Actual fine-tuning is disabled in this MVP until the dataset pipeline is fully verified.
      </p>

      <div className="card">
        <form onSubmit={handleStart}>
          <div className="provenance-grid">
            <div className="form-group">
              <label>Base Model</label>
              <select name="baseModel" value={config.baseModel} onChange={handleChange}>
                <option value="Qwen3-7B">Qwen3 7B (Instruct)</option>
                <option value="Llama3-8B">Llama3 8B</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Target Dataset</label>
              <input type="text" name="dataset" value={config.dataset} disabled />
            </div>

            <div className="form-group">
              <label>Train Split (%)</label>
              <input type="number" name="trainSplit" value={config.trainSplit} onChange={handleChange} min="50" max="95" />
            </div>

            <div className="form-group">
              <label>Epochs</label>
              <input type="number" name="epochs" value={config.epochs} onChange={handleChange} min="1" max="10" />
            </div>

            <div className="form-group">
              <label>Learning Rate</label>
              <input type="text" name="learningRate" value={config.learningRate} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>LoRA Rank (r)</label>
              <input type="number" name="loraRank" value={config.loraRank} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Batch Size</label>
              <input type="number" name="batchSize" value={config.batchSize} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Max Sequence Length</label>
              <input type="number" name="maxSeqLength" value={config.maxSeqLength} onChange={handleChange} />
            </div>
          </div>
          
          <div className="form-group" style={{marginTop: '15px'}}>
            <label>Output Directory</label>
            <input type="text" name="outputDir" value={config.outputDir} onChange={handleChange} />
          </div>

          <button className="btn" type="submit" style={{marginTop: '20px', width: '100%', padding: '15px', fontSize: '1.1rem'}}>
            <Play size={18} style={{display:'inline', verticalAlign:'middle', marginRight:'5px'}}/> Start Training
          </button>
        </form>
      </div>
    </div>
  );
}
