import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, Download, FileText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Branch } from '../lib/types';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface CSVRow {
  car_make: string;
  car_model: string;
  car_year: string;
  light_type: string;
  variant: string;
  side: string;
  condition: string;
  quantity: string;
  reference_price: string;
  notes: string;
  valid?: boolean;
  error?: string;
}

const VALID_TYPES = ['Headlight', 'Taillight', 'Fog Light', 'Boot Light'];
const VALID_SIDES = ['Left', 'Right', 'Center', 'Pair', 'Set'];

export default function BulkUploadPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    supabase.from('branches').select('*').then(({ data }) => {
      setBranches(data || []);
      if (data && data.length > 0) setSelectedBranch(data[0].id);
    });
  }, []);

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: CSVRow = {
        car_make: '', car_model: '', car_year: '', light_type: '', variant: 'Normal/Halogen',
        side: '', condition: 'Foreign Used', quantity: '1', reference_price: '0', notes: '',
      };
      headers.forEach((h, i) => {
        if (h in row) (row as Record<string, string>)[h] = values[i] || '';
      });
      row.valid = !!(row.car_make && row.car_model && row.car_year && VALID_TYPES.includes(row.light_type) && VALID_SIDES.includes(row.side));
      if (!row.valid) {
        row.error = !row.car_make ? 'Missing make' : !row.car_model ? 'Missing model' : !row.car_year ? 'Missing year' : !VALID_TYPES.includes(row.light_type) ? 'Invalid type' : 'Invalid side';
      }
      return row;
    });
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFile(file);
  };

  const handleUpload = async () => {
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0 || !selectedBranch) return;
    setUploading(true);

    let success = 0;
    let failed = 0;
    for (const row of validRows) {
      const makeCode = row.car_make.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
      const modelCode = row.car_model.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase();
      const typeCode = row.light_type === 'Headlight' ? 'HL' : row.light_type === 'Taillight' ? 'TL' : row.light_type === 'Fog Light' ? 'FL' : 'BL';
      const sideCode = row.side === 'Left' ? 'L' : row.side === 'Right' ? 'R' : row.side === 'Center' ? 'C' : row.side === 'Pair' ? 'P' : 'S';
      const sku = `${makeCode}${modelCode}${typeCode}${sideCode}${Math.floor(1000 + Math.random() * 9000)}`;

      const { error } = await supabase.from('products').insert({
        sku,
        car_make: row.car_make,
        car_model: row.car_model,
        car_year: row.car_year,
        light_type: row.light_type,
        variant: row.variant || 'Normal/Halogen',
        side: row.side,
        condition: row.condition || 'Foreign Used',
        quantity: parseInt(row.quantity) || 0,
        reference_price: parseFloat(row.reference_price) || 0,
        notes: row.notes,
        branch_id: selectedBranch,
        created_by: user?.id,
      });
      if (error) failed++;
      else success++;
    }

    setUploading(false);
    setResult({ success, failed });
    setRows([]);
  };

  const downloadTemplate = () => {
    const headers = 'car_make,car_model,car_year,light_type,variant,side,condition,quantity,reference_price,notes';
    const example = 'Toyota,Corolla,2020,Headlight,LED,Left,Foreign Used,5,350,Good condition';
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attapapa_bulk_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h3 className="text-xl font-black text-slate-900">Bulk Upload</h3>
        <p className="text-slate-500 text-sm">Upload multiple products via CSV file</p>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-5">
        <div>
          <p className="font-semibold text-slate-900 text-sm">Download Template</p>
          <p className="text-xs text-slate-500 mt-0.5">Get the CSV template with the correct column format</p>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
          <Download size={14} />
          Template
        </button>
      </div>

      <div>
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch</label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">Drop CSV file here or click to browse</p>
          <p className="text-sm text-slate-400 mt-1">Only .csv files accepted</p>
        </div>
      </div>

      {result && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 animate-fade-in">
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800">Upload Complete</p>
            <p className="text-sm text-emerald-700">{result.success} products added, {result.failed} failed</p>
          </div>
          <button onClick={() => setResult(null)} className="ml-auto text-emerald-400 hover:text-emerald-600"><X size={16} /></button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">{validCount} valid</span>
              {invalidCount > 0 && <span className="text-xs font-semibold bg-red-100 text-red-700 px-3 py-1 rounded-full">{invalidCount} invalid</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRows([])} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Clear</button>
              <button
                onClick={handleUpload}
                disabled={uploading || validCount === 0}
                className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 font-semibold"
              >
                {uploading ? 'Uploading...' : `Upload ${validCount} Products`}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Make</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Model</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Year</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Type</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Side</th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-500">Qty</th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={i} className={row.valid ? '' : 'bg-red-50'}>
                    <td className="px-3 py-2">{row.car_make}</td>
                    <td className="px-3 py-2">{row.car_model}</td>
                    <td className="px-3 py-2">{row.car_year}</td>
                    <td className="px-3 py-2">{row.light_type}</td>
                    <td className="px-3 py-2">{row.side}</td>
                    <td className="px-3 py-2 text-center">{row.quantity}</td>
                    <td className="px-3 py-2 text-center">
                      {row.valid ? (
                        <CheckCircle size={13} className="text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-red-500 font-medium">{row.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
