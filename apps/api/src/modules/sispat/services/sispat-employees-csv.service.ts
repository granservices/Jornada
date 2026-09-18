import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as XLSX from 'xlsx';

type PersistSispatFileInput = {
  fileBuffer: Buffer;
  originalFilename: string | null;
  contentType: string | null;
  source: 'multipart' | 'raw';
};

type PersistSispatFileResult = {
  importId: string;
  storedAt: string;
  storagePath: string;
  metadataPath: string;
  detectedFormat: 'csv' | 'xlsx';
  rowCount: number;
  columnCount: number;
  header: string[];
  worksheetName: string | null;
  sha256: string;
};

type ParsedSispatTabularData = {
  detectedFormat: 'csv' | 'xlsx';
  extension: '.csv' | '.xlsx';
  normalizedBuffer: Buffer;
  header: string[];
  previewRows: string[][];
  rowCount: number;
  columnCount: number;
  worksheetName: string | null;
};

@Injectable()
export class SispatEmployeesCsvService {
  constructor(private readonly configService: ConfigService) {}

  async persistIncomingFile({
    fileBuffer,
    originalFilename,
    contentType,
    source,
  }: PersistSispatFileInput): Promise<PersistSispatFileResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Arquivo vazio.');
    }

    const parsed = this.parseIncomingFile({
      fileBuffer,
      originalFilename,
      contentType,
    });

    const storedAt = new Date().toISOString();
    const safeTimestamp = storedAt.replaceAll(':', '-');
    const importId = `sispat-${safeTimestamp}-${randomUUID().slice(0, 8)}`;
    const storageDir = this.resolveStorageDir();
    const storagePath = path.join(storageDir, `${importId}${parsed.extension}`);
    const metadataPath = path.join(storageDir, `${importId}.json`);
    const sha256 = createHash('sha256')
      .update(parsed.normalizedBuffer)
      .digest('hex');

    await mkdir(storageDir, { recursive: true });
    await writeFile(storagePath, parsed.normalizedBuffer);
    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          importId,
          storedAt,
          source,
          contentType,
          originalFilename,
          detectedFormat: parsed.detectedFormat,
          worksheetName: parsed.worksheetName,
          rowCount: parsed.rowCount,
          columnCount: parsed.columnCount,
          header: parsed.header,
          sha256,
          previewRows: parsed.previewRows,
          storagePath,
        },
        null,
        2,
      ),
      'utf8',
    );

    return {
      importId,
      storedAt,
      storagePath,
      metadataPath,
      detectedFormat: parsed.detectedFormat,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      header: parsed.header,
      worksheetName: parsed.worksheetName,
      sha256,
    };
  }

  private resolveStorageDir() {
    const configuredPath = this.configService.get<string>(
      'SISPAT_IMPORT_STORAGE_DIR',
    );

    return path.resolve(configuredPath ?? './data/sispat-imports');
  }

  private parseIncomingFile({
    fileBuffer,
    originalFilename,
    contentType,
  }: Omit<PersistSispatFileInput, 'source'>): ParsedSispatTabularData {
    if (this.isSpreadsheetFile({ fileBuffer, originalFilename, contentType })) {
      return this.parseSpreadsheetFile(fileBuffer);
    }

    return this.parseCsvFile(fileBuffer);
  }

  private isSpreadsheetFile({
    fileBuffer,
    originalFilename,
    contentType,
  }: Omit<PersistSispatFileInput, 'source'>) {
    const normalizedContentType = contentType?.toLowerCase() ?? '';
    const normalizedFilename = originalFilename?.toLowerCase() ?? '';

    if (
      normalizedContentType.includes(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ) ||
      normalizedContentType.includes('application/vnd.ms-excel') ||
      normalizedFilename.endsWith('.xlsx') ||
      normalizedFilename.endsWith('.xls')
    ) {
      return true;
    }

    return this.looksLikeZipContainer(fileBuffer);
  }

  private looksLikeZipContainer(buffer: Buffer) {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  private parseSpreadsheetFile(fileBuffer: Buffer): ParsedSispatTabularData {
    const workbook = XLSX.read(fileBuffer, {
      type: 'buffer',
      raw: false,
      cellDates: false,
      dense: true,
    });

    const worksheetName = this.pickWorksheetName(workbook.SheetNames);
    const worksheet = workbook.Sheets[worksheetName];

    if (!worksheet) {
      throw new BadRequestException('Planilha XLSX sem abas validas.');
    }

    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
      worksheet,
      {
        header: 1,
        raw: false,
        defval: '',
        blankrows: false,
      },
    );

    const normalizedRows = rows
      .map((row) =>
        row.map((cell) =>
          typeof cell === 'string' ? cell.trim() : String(cell ?? '').trim(),
        ),
      )
      .filter((row) => row.some((cell) => cell.length > 0));

    if (normalizedRows.length === 0) {
      throw new BadRequestException('Planilha XLSX sem linhas validas.');
    }

    const header = normalizedRows[0] ?? [];
    const previewRows = normalizedRows.slice(1, 6);

    return {
      detectedFormat: 'xlsx',
      extension: '.xlsx',
      normalizedBuffer: fileBuffer,
      header,
      previewRows,
      rowCount: Math.max(normalizedRows.length - 1, 0),
      columnCount: header.length,
      worksheetName,
    };
  }

  private pickWorksheetName(sheetNames: string[]) {
    if (sheetNames.length === 0) {
      throw new BadRequestException('Planilha XLSX sem abas.');
    }

    const preferredSheet = sheetNames.find(
      (sheetName) => sheetName.trim().toLowerCase() === 'planilha1',
    );

    return preferredSheet ?? sheetNames[0];
  }

  private parseCsvFile(fileBuffer: Buffer): ParsedSispatTabularData {
    const csvContent = fileBuffer.toString('utf8').replace(/^\uFEFF/, '').trim();

    if (!csvContent) {
      throw new BadRequestException('CSV vazio.');
    }

    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new BadRequestException('CSV sem linhas validas.');
    }

    const header = this.parseCsvLine(lines[0]);
    const previewRows = lines.slice(1, 6).map((line) => this.parseCsvLine(line));

    return {
      detectedFormat: 'csv',
      extension: '.csv',
      normalizedBuffer: Buffer.from(csvContent, 'utf8'),
      header,
      previewRows,
      rowCount: Math.max(lines.length - 1, 0),
      columnCount: header.length,
      worksheetName: null,
    };
  }

  private parseCsvLine(line: string) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          index += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current.trim());

    return values;
  }
}
