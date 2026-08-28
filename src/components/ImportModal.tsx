import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { ImportResult } from '@/hooks/useStudents';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: { firstName: string; lastName: string; className: string }[]) => Promise<ImportResult>;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseCSV = (text: string): { firstName: string; lastName: string; className: string }[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données');
    }

    // Detect delimiter (comma or semicolon)
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const header = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

    // Map columns — accept French or English headers
    const firstNameIdx = header.findIndex((h) =>
      ['prénom', 'prenom', 'firstname', 'first_name', 'first name'].includes(h),
    );
    const lastNameIdx = header.findIndex((h) =>
      ['nom', 'lastname', 'last_name', 'last name', 'name'].includes(h),
    );
    const classIdx = header.findIndex((h) =>
      ['classe', 'class', 'class_name', 'classname'].includes(h),
    );

    if (firstNameIdx === -1 || lastNameIdx === -1 || classIdx === -1) {
      throw new Error(
        `Colonnes requises: "prénom", "nom", "classe". Colonnes détectées: ${header.join(', ')}`,
      );
    }

    const rows: { firstName: string; lastName: string; className: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;
      rows.push({
        firstName: cols[firstNameIdx] || '',
        lastName: cols[lastNameIdx] || '',
        className: cols[classIdx] || '',
      });
    }

    return rows;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setParsing(true);
    try {
      const text = await selectedFile.text();
      parseCSV(text); // Validate parsing without importing
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const importResult = await onImport(rows);
      setResult(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'prénom,nom,classe\nJean,Adjovi,6ème A\nMarie,Bossou,6ème B\nPaul,Hounkpatin,5ème A';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_import_eleves.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importer des élèves"
      subtitle="Téléversez un fichier CSV ou Excel pour créer plusieurs fiches à la fois"
      maxWidth="max-w-lg"
    >
      {result ? (
        <div className="space-y-5">
          <div className="text-center py-4">
            {result.imported > 0 && (
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="w-14 h-14 rounded-full bg-success-50 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-success-400" />
                </div>
                <p className="font-heading font-bold text-2xl text-navy-500">
                  {result.imported} élève{result.imported !== 1 ? 's' : ''} importé{result.imported !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            {result.errors > 0 && (
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="w-14 h-14 rounded-full bg-coral-50 flex items-center justify-center">
                  <AlertCircle size={28} className="text-coral-400" />
                </div>
                <p className="font-heading font-bold text-2xl text-navy-500">
                  {result.errors} erreur{result.errors !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            {result.errorDetails.length > 0 && (
              <div className="bg-cream rounded-xl p-4 text-left max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-navy-300 uppercase tracking-wide mb-2">Détails des erreurs</p>
                {result.errorDetails.map((detail, i) => (
                  <p key={i} className="text-sm text-coral-400 mb-1">{detail}</p>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleClose} className="btn-primary w-full">
            Terminer
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Template download */}
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm text-navy-300 hover:text-navy-500 transition-colors"
          >
            <Download size={16} />
            Télécharger le modèle CSV
          </button>

          {/* File upload zone */}
          <div
            className="border-2 border-dashed border-navy-100 rounded-xl p-8 text-center transition-colors hover:border-gold-400 cursor-pointer"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile) {
                inputRef.current!.files = e.dataTransfer.files;
                handleFileChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
              }
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center">
                  <FileText size={24} className="text-navy-300" />
                </div>
                <p className="text-sm font-medium text-navy-500">{file.name}</p>
                <p className="text-xs text-navy-200">{(file.size / 1024).toFixed(1)} Ko</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center">
                  <Upload size={24} className="text-navy-300" />
                </div>
                <p className="text-sm font-medium text-navy-400">Cliquez ou glissez un fichier ici</p>
                <p className="text-xs text-navy-200">Format CSV (colonnes: prénom, nom, classe)</p>
              </div>
            )}
          </div>

          {parsing && (
            <div className="flex items-center justify-center gap-2 text-sm text-navy-300">
              <div className="w-4 h-4 border-2 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
              Lecture du fichier...
            </div>
          )}

          {error && (
            <div className="bg-coral-50 text-coral-500 text-sm rounded-lg px-4 py-3 animate-fade-in">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={handleClose} className="btn-ghost flex-1">
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing || parsing}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {importing ? 'Import en cours...' : 'Importer'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
