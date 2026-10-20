import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

@Injectable()
export class ExportService {
  async toXlsx(title: string, columns: any[], data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');

    // Add Title
    sheet.addRow([title]);
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.addRow([]);

    // Add Headers
    const headerRow = sheet.addRow(columns.map((c) => c.header));
    headerRow.font = { bold: true };

    // Add Data
    data.forEach((row) => {
      const rowData = columns.map((c) => row[c.key]);
      sheet.addRow(rowData);
    });

    // Auto fit columns (simple)
    sheet.columns.forEach((column) => {
      column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  toCsv(columns: any[], data: any[]): Buffer {
    const headers = columns.map((c) => `"${c.header}"`).join(',');
    const rows = data.map((row) => {
      return columns
        .map((c) => `"${String(row[c.key] || '').replace(/"/g, '""')}"`)
        .join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    return Buffer.from(csvContent, 'utf-8');
  }
}
