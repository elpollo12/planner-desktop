/**
 * Logistics Save Dialog Helper
 *
 * Bridges report generation (jsPDF / SheetJS) with Tauri native "Save As"
 * dialogs and the filesystem plugin so users can choose where to store
 * their logistics reports.
 */

import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { downloadDir } from '@tauri-apps/api/path';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Convert an ArrayBuffer (or ArrayLike) to Uint8Array safely.
 */
function toUint8(data: ArrayBuffer | number[]): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data);
}

// ============================================================================
// SINGLE-FILE SAVE (Excel)
// ============================================================================

export interface SaveExcelResult {
  /** The path the user chose. `null` if they cancelled. */
  path: string | null;
}

/**
 * Show a native "Save As" dialog for an XLSX workbook and write it to disk.
 *
 * @param workbook  – A SheetJS WorkBook instance (already populated).
 * @param defaultFilename – Suggested file name shown in the dialog.
 * @returns The chosen path or `null` if the user cancelled.
 */
export async function saveExcelDialog(
  workbook: XLSX.WorkBook,
  defaultFilename: string,
): Promise<SaveExcelResult> {
  const defaultDir = await downloadDir();

  const filePath = await save({
    title: 'Guardar reporte Excel',
    defaultPath: `${defaultDir}/${defaultFilename}`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });

  if (!filePath) return { path: null };

  // SheetJS write → ArrayBuffer
  const buffer: ArrayBuffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  await writeFile(filePath, toUint8(buffer));

  return { path: filePath };
}

// ============================================================================
// SINGLE-FILE SAVE (PDF)
// ============================================================================

export interface SavePdfResult {
  /** The path the user chose. `null` if they cancelled. */
  path: string | null;
}

/**
 * Show a native "Save As" dialog for a jsPDF document and write it to disk.
 *
 * @param doc – A jsPDF instance (already populated).
 * @param defaultFilename – Suggested file name shown in the dialog.
 * @returns The chosen path or `null` if the user cancelled.
 */
export async function savePdfDialog(
  doc: jsPDF,
  defaultFilename: string,
): Promise<SavePdfResult> {
  const defaultDir = await downloadDir();

  const filePath = await save({
    title: 'Guardar reporte PDF',
    defaultPath: `${defaultDir}/${defaultFilename}`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (!filePath) return { path: null };

  const buffer: ArrayBuffer = doc.output('arraybuffer');
  await writeFile(filePath, toUint8(buffer));

  return { path: filePath };
}

// ============================================================================
// BOTH FILES — Folder picker → save Excel + PDF inside a new sub-folder
// ============================================================================

export interface SaveBothResult {
  /** Directory where the files were saved. `null` if the user cancelled. */
  directory: string | null;
  excelPath: string | null;
  pdfPath: string | null;
}

/**
 * Ask the user to pick a **folder**, then create a sub-folder inside it
 * and write both the Excel and PDF reports there.
 *
 * The sub-folder is named after `baseName` (e.g. "logistica_general_2025-01-01_2025-01-31").
 *
 * @param workbook – A SheetJS WorkBook (already populated).
 * @param doc      – A jsPDF instance (already populated).
 * @param baseName – Base name used for the folder and file names (no extension).
 * @returns Paths of the saved files, or `null` fields if the user cancelled.
 */
export async function saveBothDialog(
  workbook: XLSX.WorkBook,
  doc: jsPDF,
  baseName: string,
): Promise<SaveBothResult> {
  const defaultDir = await downloadDir();

  // Open a *folder* picker
  const chosenDir = await open({
    title: 'Seleccionar carpeta para guardar reportes',
    directory: true,
    multiple: false,
    defaultPath: defaultDir,
  });

  if (!chosenDir) return { directory: null, excelPath: null, pdfPath: null };

  // Determine separator (Windows vs Unix)
  const sep = (chosenDir as string).includes('\\') ? '\\' : '/';

  // Write files directly in the chosen directory (no sub-folder).
  // The dialog's `open({ directory })` adds the chosen path to the fs scope,
  // but NOT any sub-folders we might create, so we write at the top level.
  const excelPath = `${chosenDir}${sep}${baseName}.xlsx`;
  const pdfPath = `${chosenDir}${sep}${baseName}.pdf`;

  // Write Excel
  const excelBuffer: ArrayBuffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });
  await writeFile(excelPath, toUint8(excelBuffer));

  // Write PDF
  const pdfBuffer: ArrayBuffer = doc.output('arraybuffer');
  await writeFile(pdfPath, toUint8(pdfBuffer));

  return { directory: chosenDir as string, excelPath, pdfPath };
}