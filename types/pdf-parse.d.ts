declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsCollectionPresent: boolean;
    IsLinearized: boolean;
    IsXFAPresent: boolean;
    Title?: string;
    Author?: string;
    Subject?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    Trapped?: string;
    [key: string]: any;
  }

  interface PDFMetadata {
    _metadata?: any;
    [key: string]: any;
  }

  interface PDFExtract {
    info: PDFInfo;
    metadata: PDFMetadata;
    numpages: number;
    numrender: number;
    text: string;
    version: string;
  }

  interface PDFParseOptions {
    pagerender?: (pageData: any) => Promise<string>;
    max?: number;
    version?: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: PDFParseOptions): Promise<PDFExtract>;
  
  export = pdfParse;
}