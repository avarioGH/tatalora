import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {
  async generateDocument(docDefinition: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const isWide =
          docDefinition.columns && docDefinition.columns.length > 5;
        const doc = new PDFDocument({
          margin: 50,
          layout: isWide ? 'landscape' : 'portrait',
        });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc
          .fontSize(20)
          .text(docDefinition.companyName || 'ERP Boostup', { align: 'right' });
        doc.fontSize(10).text(docDefinition.title, { align: 'right' });
        doc.moveDown();

        doc.fontSize(16).text(docDefinition.documentTitle || 'Document');
        doc.fontSize(12).text(`No: ${docDefinition.documentNumber || '-'}`);
        doc.text(
          `Date: ${docDefinition.date || new Date().toLocaleDateString()}`,
        );
        doc.moveDown(2);

        // Standard Table Rendering (Simple)
        if (docDefinition.columns && docDefinition.data) {
          let y = doc.y;
          const tableWidth = isWide ? 692 : 512;
          const colWidth = tableWidth / docDefinition.columns.length;

          // Draw Headers
          doc.font('Helvetica-Bold');
          docDefinition.columns.forEach((col: any, i: number) => {
            doc.text(col.header, 50 + i * colWidth, y, {
              width: colWidth,
              align: 'left',
            });
          });
          y += 20;
          doc
            .moveTo(50, y)
            .lineTo(50 + tableWidth, y)
            .stroke();
          y += 5;

          // Draw Data
          doc.font('Helvetica');
          docDefinition.data.forEach((row: any) => {
            if (y > 700) {
              doc.addPage();
              y = 50;
            }
            docDefinition.columns.forEach((col: any, i: number) => {
              doc.text(String(row[col.key] || ''), 50 + i * colWidth, y, {
                width: colWidth,
                align: 'left',
              });
            });
            y += 20;
          });

          doc
            .moveTo(50, y)
            .lineTo(50 + tableWidth, y)
            .stroke();
          y += 10;
        }

        // Totals
        if (docDefinition.totals) {
          doc.font('Helvetica-Bold');
          let y = doc.y;
          Object.keys(docDefinition.totals).forEach((key) => {
            doc.text(`${key}: ${docDefinition.totals[key]}`, 350, y, {
              width: 200,
              align: 'right',
            });
            y += 20;
          });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
