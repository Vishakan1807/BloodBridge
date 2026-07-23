import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { CITY_OPTIONS } from '@/core/constants/indianCities';
import {
  parseSpreadsheetFile,
  downloadHospitalCSVTemplate,
  type ParsedHospitalImportRow,
} from '@/core/utils/csvParser';
import { bulkCreateHospitals, bulkCreateCamps } from '@/services/master.service';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  entityType?: 'hospital' | 'camp';
}

export function BulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
  entityType = 'hospital',
}: BulkUploadModalProps) {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedHospitalImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isCamp = entityType === 'camp';
  const entityLabel = isCamp ? 'Blood Bank / Camp' : 'Hospital';
  const entityLabelPlural = isCamp ? 'camps' : 'hospitals';

  // Reset modal state cleanly whenever modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setParsedRows([]);
      setFileName('');
      setParsing(false);
      setImporting(false);
      setIsDragging(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  async function processSelectedFile(file: File) {
    if (!file) return;

    setFileName(file.name);
    setParsing(true);
    try {
      const rows = await parseSpreadsheetFile(file);
      if (!rows || rows.length === 0) {
        showError('No valid data rows found in the uploaded file. Please verify columns.');
        setParsedRows([]);
        return;
      }
      setParsedRows(rows);
      showSuccess(`Successfully parsed ${rows.length} rows from ${file.name}`);
    } catch (err: any) {
      showError(err?.message || 'Failed to read spreadsheet file.');
      setParsedRows([]);
    } finally {
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  }

  function handleUpdateRow(index: number, field: keyof ParsedHospitalImportRow, value: string) {
    setParsedRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };

      // Re-validate status
      if (!target.name.trim()) {
        target.status = 'error';
        target.statusMessage = `${entityLabel} name is missing`;
      } else if (!target.district.trim()) {
        target.status = 'error';
        target.statusMessage = 'District is missing';
      } else {
        target.status = 'valid';
        target.statusMessage = 'Ready for import';
      }

      copy[index] = target;
      return copy;
    });
  }

  function handleRemoveRow(index: number) {
    setParsedRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCommitImport() {
    const validRows = parsedRows.filter((r) => r.name.trim() && r.district.trim());

    if (validRows.length === 0) {
      showError(`No valid ${entityLabelPlural} available to import.`);
      return;
    }

    setImporting(true);
    try {
      if (isCamp) {
        const payload = validRows.map((r) => ({
          name: r.name.trim(),
          city: r.district.trim(),
          address: r.address.trim(),
          phone: r.phone.trim(),
          coordinatorUid: null,
          isActive: true,
          createdBy: userProfile?.uid ?? '',
        }));
        const count = await bulkCreateCamps(payload);
        showSuccess(`Successfully bulk imported ${count} camps into Tamil Nadu database! 🏢`);
      } else {
        const payload = validRows.map((r) => ({
          name: r.name.trim(),
          city: r.district.trim(),
          address: r.address.trim(),
          phone: r.phone.trim(),
          isActive: true,
          createdBy: userProfile?.uid ?? '',
        }));
        const count = await bulkCreateHospitals(payload);
        showSuccess(`Successfully bulk imported ${count} hospitals into Tamil Nadu database! 🏥`);
      }

      setParsedRows([]);
      setFileName('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showError(err?.message || `Failed to bulk import ${entityLabelPlural}.`);
    } finally {
      setImporting(false);
    }
  }

  const validCount = parsedRows.filter((r) => r.name.trim() && r.district.trim()).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Import ${isCamp ? 'Camps' : 'Hospitals'} (Excel / CSV) ${isCamp ? '🏢' : '🏥'}`}
      size="xl"
    >
      <div className="space-y-5">
        {/* Top Info Banner */}
        <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div>
            <p className="font-semibold text-white text-sm flex items-center gap-1.5">
              <FileSpreadsheet size={16} className="text-brand-400" /> Excel & CSV Bulk Data Upload
            </p>
            <p className="mt-0.5">
              Upload an Excel (.xlsx, .xls, .csv) sheet containing {entityLabel} Name, District (Tamil Nadu), Address, and Contact Phone.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadHospitalCSVTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-brand-400 font-semibold border border-brand-500/40 transition-colors shrink-0 cursor-pointer"
          >
            <Download size={14} /> Download Sample Template (.csv)
          </button>
        </div>

        {/* Upload File Zone */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer select-none
            ${isDragging
              ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
              : 'border-surface-600 hover:border-brand-500/60 bg-surface-800/40 hover:bg-surface-800/70'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={handleFileChange}
            onClick={(e) => e.stopPropagation()}
            className="hidden"
          />

          {parsing ? (
            <div className="py-2 flex flex-col items-center">
              <Loader2 size={32} className="text-brand-400 animate-spin mb-2" />
              <p className="text-sm font-semibold text-white">Parsing spreadsheet data...</p>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-brand-400 mb-2" />
              <p className="text-sm font-semibold text-white">
                {fileName ? `Loaded File: ${fileName}` : 'Click anywhere inside to select or Drag & Drop Excel / CSV file'}
              </p>
              <p className="text-xs text-muted mt-1">
                Supports Excel (.xlsx, .xls), CSV, or TSV formats
              </p>

              <div className="mt-3 inline-block">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-200 text-xs font-semibold border border-surface-600 transition-colors">
                  {fileName ? 'Change File' : 'Select Spreadsheet File'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Real-time Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Data Preview ({parsedRows.length} Rows Extracted)</span>
                <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {validCount} Valid
                </span>
                {errorCount > 0 && (
                  <span className="text-xs font-normal text-danger bg-danger/10 px-2 py-0.5 rounded-full border border-danger/30">
                    {errorCount} Issues
                  </span>
                )}
              </h3>
            </div>

            <div className="max-h-72 overflow-y-auto border border-surface-700 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-surface-800 border-b border-surface-700 text-muted uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">{entityLabel} Name *</th>
                    <th className="py-2.5 px-3">District (Tamil Nadu) *</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Contact Phone</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/60 bg-surface-900/60">
                  {parsedRows.map((row, idx) => (
                    <tr key={`import-row-${idx}`} className="hover:bg-surface-700/30">
                      <td className="py-2 px-3 text-muted font-mono">{idx + 1}</td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleUpdateRow(idx, 'name', e.target.value)}
                          placeholder={`${entityLabel} Name`}
                          className="w-full bg-surface-800 border border-surface-600 rounded px-2 py-1 text-white focus:outline-none focus:border-brand-500"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <Select
                          id={`district-select-${idx}`}
                          options={[
                            { value: '', label: 'Select District...' },
                            ...CITY_OPTIONS,
                          ]}
                          value={row.district}
                          onChange={(e) => handleUpdateRow(idx, 'district', e.target.value)}
                          className="text-xs py-1"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.address}
                          onChange={(e) => handleUpdateRow(idx, 'address', e.target.value)}
                          placeholder="Address"
                          className="w-full bg-surface-800 border border-surface-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-brand-500"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.phone}
                          onChange={(e) => handleUpdateRow(idx, 'phone', e.target.value)}
                          placeholder="Phone"
                          className="w-full bg-surface-800 border border-surface-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                        />
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        {row.status === 'valid' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle2 size={11} /> Ready
                          </span>
                        ) : row.status === 'warning' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-warning font-semibold bg-warning/10 px-2 py-0.5 rounded border border-warning/30" title={row.statusMessage}>
                            <AlertTriangle size={11} /> Verify
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-danger font-semibold bg-danger/10 px-2 py-0.5 rounded border border-danger/30" title={row.statusMessage}>
                            <XCircle size={11} /> Incomplete
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveRow(idx);
                          }}
                          className="text-muted hover:text-danger p-1 rounded hover:bg-surface-700 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-700">
          <p className="text-xs text-muted">
            {validCount > 0 ? `${validCount} ${entityLabelPlural} ready to be created in Firebase DB` : 'Upload a CSV/Excel file to preview'}
          </p>

          <div className="flex gap-3">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>

            <Button
              variant="primary"
              type="button"
              disabled={validCount === 0}
              loading={importing}
              onClick={handleCommitImport}
              icon={<ShieldCheck size={16} />}
            >
              Commit Bulk Import ({validCount})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
