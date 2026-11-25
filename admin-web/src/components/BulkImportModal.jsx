import React, { useState } from 'react';
import { X, Upload, Download } from 'lucide-react';
import { api } from '../api';

const SAMPLE_CSV = `subject,question_text,option_a,option_b,option_c,option_d,correct_option,explanation
Mathematics,"What is the value of 12 × 12?",124,134,144,154,C,"12 squared is 144."
Physics,"What is the SI unit of Force?",Joule,Newton,Watt,Pascal,B,"Force is measured in Newtons (N)."`;

const SAMPLE_JSON = JSON.stringify(
  [
    {
      subject: 'Chemistry',
      question_text: 'What is the chemical formula of water?',
      option_a: 'H2O2',
      option_b: 'CO2',
      option_c: 'H2O',
      option_d: 'NaCl',
      correct_option: 'C',
      explanation: 'Water consists of two hydrogen atoms and one oxygen atom.',
    },
  ],
  null,
  2
);

export default function BulkImportModal({ test, onClose, onImported }) {
  const [format, setFormat] = useState('csv');
  const [rawText, setRawText] = useState(SAMPLE_CSV);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  function switchFormat(next) {
    setFormat(next);
    setRawText(next === 'csv' ? SAMPLE_CSV : SAMPLE_JSON);
    setError('');
    setReport(null);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      if (file.name.toLowerCase().endsWith('.json')) {
        setFormat('json');
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        setFormat('csv');
      }
      setRawText(content);
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const content = format === 'csv' ? SAMPLE_CSV : SAMPLE_JSON;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions-template.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await api.importQuestions(test.id, format, rawText);
      setReport(res);
      onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="page-header" style={{ marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0 }}>Bulk Import Questions</h3>
            <p className="page-subtitle">Import MCQs into {test.title}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {report && (
          <div className="alert alert-success">
            Imported {report.importedCount} question(s).
            {report.errorCount > 0 ? ` Skipped ${report.errorCount} invalid row(s).` : ''}
          </div>
        )}

        <div className="flex-gap" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={`btn btn-sm ${format === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => switchFormat('csv')}
          >
            CSV Format
          </button>
          <button
            type="button"
            className={`btn btn-sm ${format === 'json' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => switchFormat('json')}
          >
            JSON Format
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
            <Download size={14} /> Download Template
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Load File
            <input type="file" accept=".csv,.json,.txt" hidden onChange={handleFileUpload} />
          </label>
        </div>

        <form onSubmit={handleImport}>
          <div className="field">
            <label>Paste {format.toUpperCase()} Data</label>
            <textarea
              className="textarea"
              style={{ minHeight: 220, fontFamily: 'monospace', fontSize: 12.5 }}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>
          {report?.errors?.length > 0 && (
            <div className="alert alert-error" style={{ maxHeight: 120, overflowY: 'auto' }}>
              {report.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}
          <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Importing...' : 'Import Questions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
