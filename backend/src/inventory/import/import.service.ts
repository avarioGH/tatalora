import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryLedgerService } from '../inventory-ledger.service';
import { SawnTimberService } from '../sawn-timber.service';
import { TimberCalculationService } from '../timber-calculation.service';
import * as xlsx from 'xlsx';
import * as path from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: InventoryLedgerService,
    private sawnTimberService: SawnTimberService,
    private calcService: TimberCalculationService,
  ) {}

  async createSession(
    fileName: string,
    originalName: string,
    createdBy: string,
  ) {
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    const workbook = xlsx.readFile(filePath);
    return this.prisma.importSession.create({
      data: {
        fileName,
        fileType: originalName,
        importType: 'UNKNOWN',
        status: 'UPLOADED',
        createdBy,
      },
    });
  }

  getSheets(fileName: string) {
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    const workbook = xlsx.readFile(filePath);
    return workbook.SheetNames;
  }

  async getHistory() {
    return this.prisma.importSession.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  private parseIndonesianNumber(val: any) {
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }

  private parseIndonesianSize(sizeStr: string) {
    if (!sizeStr) return null;
    const s = String(sizeStr).trim();
    const parts = s.split(/\s*[xX\xd7\*]\s*/);
    if (parts.length !== 3) return null;
    return parts.map((p) => parseFloat(p.replace(/\./g, '').replace(',', '.')));
  }

  async previewImport(id: string, sheetName: string, importType: string) {
    const session = await this.prisma.importSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('Session not found');

    const filePath = path.join(process.cwd(), 'uploads', session.fileName);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new BadRequestException(`Sheet ${sheetName} not found`);

    const rawData = xlsx.utils.sheet_to_json(sheet, {
      defval: null,
      header: 1,
    }) as any[];

    let valid = 0,
      invalid = 0,
      totalM3 = 0;
    const previewRows: any[] = [];

    if (importType === 'SAWN_TIMBER_OUTPUT') {
      const outData = rawData
        .slice(2)
        .filter((r) => r[3] !== null && r[7] !== null);
      for (let i = 0; i < outData.length; i++) {
        const row = outData[i];
        let status = 'VALID';
        let error: string | null = null;
        let calculatedM3 = 0;

        const bundel = row[3];
        const sizeStr = row[7];
        const qty = this.parseIndonesianNumber(row[8]);
        const excelM3 = this.parseIndonesianNumber(row[9]);

        const dims = this.parseIndonesianSize(sizeStr);
        if (!dims || dims.some(isNaN)) {
          status = 'ERROR';
          error = 'Invalid dimensions format';
        } else {
          const [t, w, l] = dims;
          calculatedM3 = (t * w * l * qty) / 1000000000;
          if (Math.abs(calculatedM3 - excelM3) > 0.005) status = 'WARNING';
          totalM3 += calculatedM3;
        }

        if (status === 'ERROR') invalid++;
        else valid++;
        if (i < 100) {
          previewRows.push({
            bundel,
            size: sizeStr,
            qty,
            excelM3,
            _status: status,
            _error: error,
            _calcM3: calculatedM3,
            _excelM3: excelM3,
          });
        }
      }

      await this.prisma.importSession.update({
        where: { id },
        data: {
          importType,
          selectedSheet: sheetName,
          totalRows: outData.length,
          validRows: valid,
          invalidRows: invalid,
        },
      });
    }

    return {
      rows: previewRows,
      validRows: valid,
      invalidRows: invalid,
      totalM3,
    };
  }

  async executeImport(id: string, sheetName: string, importType: string) {
    const session = await this.prisma.importSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException();
    if (session.status === 'COMPLETED')
      throw new BadRequestException('Import already executed');

    await this.prisma.importSession.update({
      where: { id },
      data: { status: 'IMPORTING' },
    });

    const filePath = path.join(process.cwd(), 'uploads', session.fileName);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, {
      defval: null,
      header: 1,
    }) as any[];

    let importedRows = 0;
    let duplicateRows = 0;
    let skippedRows = 0;

    try {
      if (importType === 'SAWN_TIMBER_OUTPUT') {
        const outData = rawData
          .slice(2)
          .filter((r) => r[3] !== null && r[7] !== null);

        let dummyCompany = await this.prisma.company.findFirst();
        if (!dummyCompany)
          dummyCompany = await this.prisma.company.create({
            data: { name: 'DUMMY' },
          });

        let loc = await this.prisma.warehouse.findFirst({
          where: { name: 'SAWMILL_LOCATION' },
        });
        if (!loc)
          loc = await this.prisma.warehouse.create({
            data: {
              name: 'SAWMILL_LOCATION',
              code: 'SM1',
              company: { connect: { id: dummyCompany.id } },
            },
          });

        let dummyInput = await this.prisma.inputLog.findFirst({
          where: { inputNumber: 'DUMMY-INPUT' },
        });
        if (!dummyInput)
          dummyInput = await this.prisma.inputLog.create({
            data: {
              inputNumber: 'DUMMY-INPUT',
              species: 'MERANTI',
              shift: '1',
              date: new Date(),
              status: 'AVAILABLE',
              totalQty: 0,
              totalVolume: 0,
            },
          });

        const bundleMap = new Map<string, any[]>();
        for (const row of outData) {
          const bundel = row[3];
          if (!bundleMap.has(bundel)) bundleMap.set(bundel, []);
          bundleMap.get(bundel)?.push(row);
        }

        for (const [bundel, rows] of bundleMap.entries()) {
          const existing = await this.prisma.sawnTimberOutput.findFirst({
            where: { bundleNumber: bundel },
          });
          if (existing) {
            duplicateRows += rows.length;
            continue;
          }

          await this.prisma.$transaction(async (tx) => {
            const output = await tx.sawnTimberOutput.create({
              data: {
                bundleNumber: bundel,
                outputDate: new Date(),
                shift: '1',
                locationId: loc.id,
                inputLogId: dummyInput.id,
                status: 'POSTED',
              },
            });

            for (const row of rows) {
              const sizeStr = row[7];
              const qty = this.parseIndonesianNumber(row[8]);
              const dims = this.parseIndonesianSize(sizeStr);
              if (!dims || dims.some(isNaN) || qty <= 0) {
                skippedRows++;
                continue;
              }
              const [t, w, l] = dims;

              let tGrade = await tx.timberGrade.findFirst({
                where: { company_id: dummyCompany.id, code: 'A' },
              });
              if (!tGrade) {
                tGrade = await tx.timberGrade.create({
                  data: {
                    company_id: dummyCompany.id,
                    code: 'A',
                    name: 'Grade A',
                  },
                });
              }
              const grade = tGrade.code;
              const species = 'MERANTI';
              const sku = `${species}-${grade}-${t} x ${w} x ${l}`;
              let variant = await tx.timberVariant.findUnique({
                where: { sku },
              });
              if (!variant) {
                let masterProd = await tx.product.findFirst({
                  where: { code: species },
                });
                if (!masterProd) {
                  let cat = await tx.category.findFirst();
                  if (!cat)
                    cat = await tx.category.create({
                      data: { name: 'Timber', company_id: dummyCompany.id },
                    });
                  let unit = await tx.unit.findFirst();
                  if (!unit)
                    unit = await tx.unit.create({
                      data: { name: 'PCS', company_id: dummyCompany.id },
                    });

                  masterProd = await tx.product.create({
                    data: {
                      code: species,
                      name: species,
                      status: true,
                      purchase_price: 0,
                      selling_price: 0,
                      company_id: dummyCompany.id,
                      category_id: cat.id,
                      unit_id: unit.id,
                    },
                  });
                }
                variant = await tx.timberVariant.create({
                  data: {
                    company_id: dummyCompany.id,
                    productId: masterProd.id,
                    sku,
                    species,
                    grade,
                    gradeId: tGrade.id,
                    thickness: t,
                    width: w,
                    length: l,
                    volumePerPiece: (t * w * l) / 1000000000,
                  },
                });
              }

              const volM3 = variant.volumePerPiece * qty;

              await tx.sawnTimberOutputItem.create({
                data: {
                  outputId: output.id,
                  timberVariantId: variant.id,
                  grade,
                  quantityPcs: qty,
                  thicknessMm: t,
                  widthMm: w,
                  lengthMm: l,
                  volumeM3: volM3,
                },
              });

              await this.ledgerService.createMovement(
                tx as any,
                loc.id,
                variant.id,
                'IN',
                'PRODUCTION_OUTPUT',
                output.id,
                qty,
                volM3,
              );

              importedRows++;
            }

            await tx.auditLog.create({
              data: {
                user_id: session.createdBy || 'SYSTEM',
                action: 'POST',
                entity: 'SAWN_OUTPUT',
                entity_id: output.id,
                after_data: { bundleNumber: bundel },
              },
            });
          });
        }
      }

      await this.prisma.importSession.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          importedRows,
          duplicateRows,
          skippedRows,
          completedAt: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          user_id: session.createdBy || 'SYSTEM',
          action: 'EXECUTE',
          entity: 'IMPORT_SESSION',
          entity_id: session.id,
        },
      });

      return { success: true, importedRows, duplicateRows, skippedRows };
    } catch (err: any) {
      await this.prisma.importSession.update({
        where: { id },
        data: { status: 'FAILED', errorSummary: err.message },
      });
      await this.prisma.auditLog.create({
        data: {
          user_id: session.createdBy || 'SYSTEM',
          action: 'FAIL',
          entity: 'IMPORT_SESSION',
          entity_id: session.id,
          after_data: { error: err.message },
        },
      });
      throw new BadRequestException('Import failed: ' + err.message);
    }
  }
}
