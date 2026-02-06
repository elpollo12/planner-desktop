/**
 * Type definitions for jspdf-autotable
 * Extends jsPDF with autoTable functionality
 */

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  export interface CellDef {
    content?: string | number;
    colSpan?: number;
    rowSpan?: number;
    styles?: Partial<Styles>;
  }

  export interface RowInput {
    [key: string]: string | number | CellDef;
  }

  export interface Styles {
    font?: string;
    fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
    overflow?: 'linebreak' | 'ellipsize' | 'visible' | 'hidden';
    fillColor?: number | number[] | string | false;
    textColor?: number | number[] | string;
    cellWidth?: 'auto' | 'wrap' | number;
    minCellHeight?: number;
    minCellWidth?: number;
    halign?: 'left' | 'center' | 'right' | 'justify';
    valign?: 'top' | 'middle' | 'bottom';
    fontSize?: number;
    cellPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    lineColor?: number | number[] | string;
    lineWidth?: number;
  }

  export interface ColumnStyles {
    [key: string]: Partial<Styles>;
  }

  export interface UserOptions {
    head?: (string | number | CellDef)[][];
    body?: (string | number | CellDef)[][];
    foot?: (string | number | CellDef)[][];
    startY?: number | false;
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    pageBreak?: 'auto' | 'avoid' | 'always';
    tableWidth?: 'auto' | 'wrap' | number;
    showHead?: 'everyPage' | 'firstPage' | 'never';
    showFoot?: 'everyPage' | 'lastPage' | 'never';
    theme?: 'striped' | 'grid' | 'plain';
    styles?: Partial<Styles>;
    headStyles?: Partial<Styles>;
    bodyStyles?: Partial<Styles>;
    footStyles?: Partial<Styles>;
    alternateRowStyles?: Partial<Styles>;
    columnStyles?: ColumnStyles;
    didDrawPage?: (data: any) => void;
    didDrawCell?: (data: any) => void;
    willDrawCell?: (data: any) => void;
    didParseCell?: (data: any) => void;
  }

  export default function autoTable(
    doc: jsPDF,
    options: UserOptions
  ): jsPDF;
}

/**
 * Extend jsPDF interface with autoTable properties
 */
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
      finalX?: number;
      pageNumber?: number;
      pageCount?: number;
      settings?: any;
      table?: any;
      cursor?: any;
    };
    previousAutoTable?: {
      finalY: number;
    };
    autoTable?: (options: import('jspdf-autotable').UserOptions) => jsPDF;
  }
}
