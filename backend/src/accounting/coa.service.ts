import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoaService {
  private readonly logger = new Logger(CoaService.name);

  constructor(private prisma: PrismaService) {}

  async ensureStandardAccounts(tx: Prisma.TransactionClient, companyId: string) {
    const standardCOA = [
      { code: '1-10001', name: 'Kas Kecil (Petty Cash)', type: 'Kas & Bank', normal: 'Debit' },
      { code: '1-10002', name: 'Rekening Bank BCA', type: 'Kas & Bank', normal: 'Debit' },
      { code: '1-10003', name: 'Rekening Bank Mandiri', type: 'Kas & Bank', normal: 'Debit' },
      { code: '1-10100', name: 'Piutang Usaha (AR)', type: 'Akun Piutang', normal: 'Debit' },
      { code: '1-10200', name: 'Persediaan Barang Dagang', type: 'Persediaan', normal: 'Debit' },
      { code: '1-10300', name: 'PPN Masukan', type: 'Aktiva Lancar Lainnya', normal: 'Debit' },
      { code: '1-10400', name: 'Uang Muka Pembelian', type: 'Aktiva Lancar Lainnya', normal: 'Debit' },
      { code: '1-20001', name: 'Aset Tetap - Kendaraan', type: 'Aktiva Tetap', normal: 'Debit' },
      { code: '1-20002', name: 'Akumulasi Penyusutan Kendaraan', type: 'Aktiva Tetap', normal: 'Credit' },
      { code: '1-20003', name: 'Aset Tetap - Peralatan & Mesin', type: 'Aktiva Tetap', normal: 'Debit' },
      { code: '1-20004', name: 'Akumulasi Penyusutan Peralatan', type: 'Aktiva Tetap', normal: 'Credit' },
      { code: '2-20100', name: 'Hutang Usaha (AP)', type: 'Akun Hutang', normal: 'Credit' },
      { code: '2-20200', name: 'Hutang PPN Keluaran', type: 'Kewajiban Lancar Lainnya', normal: 'Credit' },
      { code: '2-20300', name: 'Hutang Gaji & Upah', type: 'Kewajiban Lancar Lainnya', normal: 'Credit' },
      { code: '2-20400', name: 'Uang Muka Penjualan', type: 'Kewajiban Lancar Lainnya', normal: 'Credit' },
      { code: '3-30001', name: 'Modal Disetor', type: 'Modal', normal: 'Credit' },
      { code: '3-30002', name: 'Laba Ditahan', type: 'Modal', normal: 'Credit' },
      { code: '3-30003', name: 'Laba Tahun Berjalan', type: 'Modal', normal: 'Credit' },
      { code: '4-40001', name: 'Pendapatan Penjualan Produk', type: 'Pendapatan', normal: 'Credit' },
      { code: '4-40002', name: 'Pendapatan Jasa', type: 'Pendapatan', normal: 'Credit' },
      { code: '4-40100', name: 'Diskon Penjualan', type: 'Pendapatan', normal: 'Debit' },
      { code: '4-40200', name: 'Retur Penjualan', type: 'Pendapatan', normal: 'Debit' },
      { code: '5-50001', name: 'Beban Pokok Penjualan (HPP)', type: 'Beban Pokok Pendapatan', normal: 'Debit' },
      { code: '5-50002', name: 'Potongan Pembelian', type: 'Beban Pokok Pendapatan', normal: 'Credit' },
      { code: '6-60001', name: 'Beban Gaji & Tunjangan', type: 'Beban Operasional', normal: 'Debit' },
      { code: '6-60002', name: 'Beban Sewa Gedung', type: 'Beban Operasional', normal: 'Debit' },
      { code: '6-60003', name: 'Beban Listrik, Air & Internet', type: 'Beban Operasional', normal: 'Debit' },
      { code: '6-60004', name: 'Beban Transportasi & Logistik', type: 'Beban Operasional', normal: 'Debit' },
      { code: '6-60005', name: 'Beban Pemasaran & Iklan', type: 'Beban Operasional', normal: 'Debit' },
      { code: '6-60006', name: 'Beban Penyusutan Aset', type: 'Beban Operasional', normal: 'Debit' },
      { code: '6-60007', name: 'Beban Administrasi Bank', type: 'Beban Operasional', normal: 'Debit' },
      { code: '8-80001', name: 'Pendapatan Bunga / Lainnya', type: 'Pendapatan', normal: 'Credit' },
      { code: '9-90001', name: 'Beban Pajak Penghasilan', type: 'Beban Operasional', normal: 'Debit' },
    ];

    for (const item of standardCOA) {
      let dbType = await (tx as any).accountType.findFirst({
        where: { company_id: companyId, name: item.type },
      });
      if (!dbType) {
        dbType = await (tx as any).accountType.create({
          data: {
            company_id: companyId,
            name: item.type,
            code: item.type.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10),
            normal_balance: item.normal,
          },
        });
      }

      const existing = await (tx as any).chartOfAccount.findFirst({
        where: { company_id: companyId, account_code: item.code },
      });
      if (!existing) {
        await (tx as any).chartOfAccount.create({
          data: {
            company_id: companyId,
            account_code: item.code,
            account_name: item.name,
            account_type_id: dbType.id,
            currency: 'IDR',
            allow_manual_entry: true,
            status: true,
          },
        });
      }
    }
  }
}
