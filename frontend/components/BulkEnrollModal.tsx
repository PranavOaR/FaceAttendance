'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student } from '@/lib/types';
import { uploadStudentPhoto } from '@/lib/uploadPhoto';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface BulkEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (student: Omit<Student, 'id' | 'classId'>) => Promise<void>;
  classId: string;
}

interface ParsedRow {
  name: string;
  srn: string;
  parentEmail: string;
  photoFile: File | null;
  photoPreview: string | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

type Step = 'upload' | 'preview' | 'enrolling' | 'done';

// ─── CSV parser ──────────────────────────────────────────────
function parseCSV(text: string): { name: string; srn: string; parentEmail: string }[] {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Detect header
  const headerLine = lines[0].toLowerCase();
  const cols = headerLine.split(',').map(c => c.trim().replace(/"/g, ''));

  const nameIdx = cols.findIndex(c => c === 'name' || c === 'student name' || c === 'full name');
  const srnIdx = cols.findIndex(c => c === 'srn' || c === 'roll number' || c === 'roll no' || c === 'id');
  const emailIdx = cols.findIndex(c => c.includes('email') || c.includes('parent'));

  if (nameIdx === -1 || srnIdx === -1) return [];

  return lines.slice(1).map(line => {
    // Handle quoted fields
    const parts: string[] = [];
    let inQuote = false;
    let cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { parts.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    parts.push(cur.trim());

    return {
      name: (parts[nameIdx] || '').trim(),
      srn: (parts[srnIdx] || '').trim().toUpperCase(),
      parentEmail: emailIdx >= 0 ? (parts[emailIdx] || '').trim() : ''
    };
  }).filter(r => r.name && r.srn);
}

// ─── Component ───────────────────────────────────────────────
export default function BulkEnrollModal({ isOpen, onClose, onEnroll, classId }: BulkEnrollModalProps) {
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('upload');

  // Upload step state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Preview step state
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string>('');

  // Enrolling step state
  const [doneCount, setDoneCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // ── File handlers ──
  const handleCsvDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setCsvDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) setCsvFile(file);
    else toast.error('Please drop a .csv file');
  }, []);

  const handlePhotoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setPhotoDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) setPhotoFiles(prev => [...prev, ...files]);
    else toast.error('Please drop image files');
  }, []);

  const handlePhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    setPhotoFiles(prev => [...prev, ...files]);
  };

  // ── Parse & match ──
  const handleParse = async () => {
    setParseError('');
    if (!csvFile) { setParseError('Please upload a CSV file.'); return; }
    if (!photoFiles.length) { setParseError('Please upload at least one photo.'); return; }

    try {
      const text = await csvFile.text();
      const parsed = parseCSV(text);

      if (!parsed.length) {
        setParseError(
          'Could not parse CSV. Make sure it has columns: Name, SRN (and optionally ParentEmail).'
        );
        return;
      }

      // Build a map of normalised SRN → File for O(1) lookup
      const photoMap = new Map<string, File>();
      for (const f of photoFiles) {
        const srn = f.name.replace(/\.[^.]+$/, '').toUpperCase().trim();
        photoMap.set(srn, f);
      }

      // Generate previews asynchronously
      const buildPreview = (file: File): Promise<string> =>
        new Promise(res => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(file);
        });

      const built: ParsedRow[] = await Promise.all(
        parsed.map(async r => {
          const photoFile = photoMap.get(r.srn) || null;
          const photoPreview = photoFile ? await buildPreview(photoFile) : null;
          return { ...r, photoFile, photoPreview, status: 'pending' as const };
        })
      );

      setRows(built);
      setStep('preview');
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse files');
    }
  };

  // ── Enroll ──
  const handleEnrollAll = async () => {
    if (!user) { toast.error('Not logged in'); return; }

    setStep('enrolling');
    setDoneCount(0);
    setErrorCount(0);

    const matched = rows.filter(r => r.photoFile);

    for (let i = 0; i < matched.length; i++) {
      const row = matched[i];

      // Mark uploading
      setRows(prev =>
        prev.map(r => (r.srn === row.srn ? { ...r, status: 'uploading' } : r))
      );

      try {
        const photoURL = await uploadStudentPhoto(
          row.photoFile!,
          user.uid,
          classId,
          row.srn
        );

        await onEnroll({
          name: row.name,
          srn: row.srn,
          photo: photoURL,
          parentEmail: row.parentEmail || undefined
        });

        setRows(prev =>
          prev.map(r => (r.srn === row.srn ? { ...r, status: 'done' } : r))
        );
        setDoneCount(c => c + 1);
      } catch (err: any) {
        setRows(prev =>
          prev.map(r =>
            r.srn === row.srn ? { ...r, status: 'error', errorMsg: err.message || 'Failed' } : r
          )
        );
        setErrorCount(c => c + 1);
      }
    }

    setStep('done');
  };

  // ── Reset on close ──
  const handleClose = () => {
    setStep('upload');
    setCsvFile(null);
    setPhotoFiles([]);
    setRows([]);
    setParseError('');
    setDoneCount(0);
    setErrorCount(0);
    onClose();
  };

  const matchedCount = rows.filter(r => r.photoFile).length;
  const unmatchedCount = rows.filter(r => !r.photoFile).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === 'enrolling' ? undefined : handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

              {/* ── Header ── */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Enroll Students</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {step === 'upload' && 'Upload a CSV + student photos to enroll everyone at once'}
                    {step === 'preview' && `${rows.length} students parsed — ${matchedCount} with photos`}
                    {step === 'enrolling' && `Enrolling ${matchedCount} students…`}
                    {step === 'done' && `Done — ${doneCount} enrolled${errorCount ? `, ${errorCount} failed` : ''}`}
                  </p>
                </div>
                {step !== 'enrolling' && (
                  <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* ── Step indicator ── */}
              <div className="px-6 pt-3 pb-1 flex items-center gap-2">
                {['upload', 'preview', 'enrolling'].map((s, idx) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                      ${step === s ? 'bg-slate-900 text-white' :
                        (step === 'preview' && idx === 0) || (step === 'enrolling' && idx <= 1) || step === 'done'
                          ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {((step === 'preview' && idx === 0) || (step === 'enrolling' && idx <= 1) || step === 'done') && step !== s
                        ? '✓' : idx + 1}
                    </div>
                    <span className={`text-xs ${step === s ? 'text-slate-900 font-medium' : 'text-gray-400'}`}>
                      {s === 'upload' ? 'Upload' : s === 'preview' ? 'Preview' : 'Enroll'}
                    </span>
                    {idx < 2 && <div className="w-8 h-px bg-gray-200" />}
                  </div>
                ))}
              </div>

              {/* ── Body ── */}
              <div className="flex-1 overflow-y-auto px-6 py-4">

                {/* ─── STEP: upload ─── */}
                {step === 'upload' && (
                  <div className="space-y-5">
                    {/* CSV instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                      <p className="font-semibold mb-1">CSV format (required columns):</p>
                      <code className="block bg-white border border-blue-100 rounded px-2 py-1 font-mono text-blue-700">
                        Name, SRN, ParentEmail
                      </code>
                      <p className="mt-1.5">Photos must be image files named by SRN, e.g. <code className="font-mono">PES1UG20CS001.jpg</code></p>
                    </div>

                    {/* CSV drop zone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        1. Student list (CSV)
                      </label>
                      <div
                        onDragOver={e => { e.preventDefault(); setCsvDragOver(true); }}
                        onDragLeave={() => setCsvDragOver(false)}
                        onDrop={handleCsvDrop}
                        onClick={() => csvInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-lg p-5 cursor-pointer transition-colors text-center
                          ${csvDragOver ? 'border-slate-500 bg-slate-50' : csvFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-slate-400 hover:bg-gray-50'}`}
                      >
                        <input
                          ref={csvInputRef}
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) setCsvFile(f); }}
                        />
                        {csvFile ? (
                          <div className="flex items-center justify-center gap-2 text-green-700">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium">{csvFile.name}</span>
                            <button
                              onClick={e => { e.stopPropagation(); setCsvFile(null); }}
                              className="text-green-400 hover:text-green-700 ml-1"
                            >✕</button>
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm">Drop CSV here or <span className="text-slate-900 font-medium">click to browse</span></p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Photos drop zone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        2. Student photos (images)
                      </label>
                      <div
                        onDragOver={e => { e.preventDefault(); setPhotoDragOver(true); }}
                        onDragLeave={() => setPhotoDragOver(false)}
                        onDrop={handlePhotoDrop}
                        onClick={() => photoInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-lg p-5 cursor-pointer transition-colors text-center
                          ${photoDragOver ? 'border-slate-500 bg-slate-50' : photoFiles.length ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-slate-400 hover:bg-gray-50'}`}
                      >
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handlePhotoInput}
                        />
                        {photoFiles.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-purple-700">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-medium">{photoFiles.length} photo{photoFiles.length > 1 ? 's' : ''} selected</span>
                              <button
                                onClick={e => { e.stopPropagation(); setPhotoFiles([]); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                                className="text-purple-400 hover:text-purple-700 ml-1"
                              >✕</button>
                            </div>
                            <div className="flex flex-wrap justify-center gap-1">
                              {photoFiles.slice(0, 8).map(f => (
                                <span key={f.name} className="text-xs bg-white border border-purple-200 rounded px-1.5 py-0.5 text-purple-800 font-mono">
                                  {f.name.replace(/\.[^.]+$/, '')}
                                </span>
                              ))}
                              {photoFiles.length > 8 && (
                                <span className="text-xs text-purple-600">+{photoFiles.length - 8} more</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm">Drop photos here or <span className="text-slate-900 font-medium">click to browse</span></p>
                            <p className="text-xs text-gray-400 mt-1">Name each photo by SRN — e.g. PES1UG20CS001.jpg</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {parseError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {parseError}
                      </p>
                    )}
                  </div>
                )}

                {/* ─── STEP: preview ─── */}
                {step === 'preview' && (
                  <div className="space-y-3">
                    {/* summary badges */}
                    <div className="flex gap-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 font-medium">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {matchedCount} ready to enroll
                      </span>
                      {unmatchedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800 font-medium">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {unmatchedCount} no photo found
                        </span>
                      )}
                    </div>

                    {/* table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Photo</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SRN</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Parent Email</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Photo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rows.map(row => (
                            <tr key={row.srn} className={row.photoFile ? '' : 'bg-orange-50'}>
                              <td className="px-3 py-2">
                                {row.photoPreview ? (
                                  <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                    <Image src={row.photoPreview} alt={row.name} fill className="object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                              <td className="px-3 py-2 font-mono text-gray-600 text-xs">{row.srn}</td>
                              <td className="px-3 py-2 text-gray-500 text-xs">{row.parentEmail || '—'}</td>
                              <td className="px-3 py-2 text-center">
                                {row.photoFile ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">✓ Matched</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">Missing</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {unmatchedCount > 0 && (
                      <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                        Students without a matched photo will be skipped. Make sure photo filenames match the SRN exactly (e.g. <code className="font-mono">PES1UG20CS001.jpg</code>).
                      </p>
                    )}
                  </div>
                )}

                {/* ─── STEP: enrolling ─── */}
                {(step === 'enrolling' || step === 'done') && (
                  <div className="space-y-2">
                    {rows.filter(r => r.photoFile).map(row => (
                      <div key={row.srn} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100">
                        {/* status icon */}
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                          {row.status === 'pending' && (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                          {row.status === 'uploading' && (
                            <svg className="w-4 h-4 animate-spin text-slate-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                          {row.status === 'done' && (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {row.status === 'error' && (
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>

                        {/* photo */}
                        {row.photoPreview && (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image src={row.photoPreview} alt={row.name} fill className="object-cover" />
                          </div>
                        )}

                        {/* name + srn */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{row.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{row.srn}</p>
                        </div>

                        {/* status label */}
                        <div className="flex-shrink-0 text-xs">
                          {row.status === 'pending' && <span className="text-gray-400">Waiting…</span>}
                          {row.status === 'uploading' && <span className="text-slate-600 font-medium">Uploading…</span>}
                          {row.status === 'done' && <span className="text-green-600 font-medium">Enrolled</span>}
                          {row.status === 'error' && (
                            <span className="text-red-600 font-medium" title={row.errorMsg}>Failed</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {step === 'done' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-3 p-4 rounded-lg border ${errorCount === 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}
                      >
                        <p className={`text-sm font-semibold ${errorCount === 0 ? 'text-green-800' : 'text-orange-800'}`}>
                          {errorCount === 0
                            ? `All ${doneCount} students enrolled successfully!`
                            : `${doneCount} enrolled, ${errorCount} failed. You can retry failed students individually.`}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Footer buttons ── */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                {step === 'upload' && (
                  <>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleParse}
                      disabled={!csvFile || !photoFiles.length}
                      className="px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Parse & Preview →
                    </button>
                  </>
                )}

                {step === 'preview' && (
                  <>
                    <button
                      onClick={() => setStep('upload')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleEnrollAll}
                      disabled={matchedCount === 0}
                      className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Enroll {matchedCount} Student{matchedCount !== 1 ? 's' : ''} →
                    </button>
                  </>
                )}

                {step === 'done' && (
                  <div className="w-full flex justify-end">
                    <button
                      onClick={handleClose}
                      className="px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
