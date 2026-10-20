import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NettingService {
  constructor(private prisma: PrismaService) {}

  async applyNetting(partner_id: string, amount: number, reqUser: any, notes?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const company_id = reqUser.company_id || reqUser.companyId;

    return this.prisma.$transaction(async (tx) => {
      // Find open Accounts Payable (AP) for this partner
      const apInvoices = await tx.invoice.findMany({
        where: {
          company_id,
          OR: [{ customer_id: partner_id }, { supplier_id: partner_id }],
          type: 'AP',
          status: { in: ['POSTED', 'PARTIALLY PAID'] }
        },
        orderBy: { invoice_date: 'asc' }
      });

      // Find open Accounts Receivable (AR) for this partner
      const arInvoices = await tx.invoice.findMany({
        where: {
          company_id,
          customer_id: partner_id,
          type: 'AR',
          status: { in: ['POSTED', 'PARTIALLY PAID'] }
        },
        orderBy: { invoice_date: 'asc' }
      });

      let outstandingAP = 0;
      apInvoices.forEach(ap => outstandingAP += ap.remaining_amount);
      
      let outstandingAR = 0;
      arInvoices.forEach(ar => outstandingAR += ar.remaining_amount);

      if (amount > outstandingAP) {
        throw new BadRequestException(`Netting amount cannot exceed outstanding AP (${outstandingAP})`);
      }
      if (amount > outstandingAR) {
        throw new BadRequestException(`Netting amount cannot exceed outstanding AR (${outstandingAR})`);
      }

      const nettingRecord = await tx.netting.create({
        data: {
          company_id,
          partner_id,
          netting_number: `NET-${Date.now()}`,
          date: new Date(),
          amount: amount,
          notes: notes || 'Kompensasi Hutang/Piutang (Netting)'
        }
      });

      // Apply to AP
      let toApplyAP = amount;
      for (const ap of apInvoices) {
        if (toApplyAP <= 0) break;
        const alloc = Math.min(ap.remaining_amount, toApplyAP);
        
        await tx.nettingAllocation.create({
          data: {
            netting_id: nettingRecord.id,
            invoice_id: ap.id,
            type: 'AP',
            amount: alloc
          }
        });
        
        const newPaid = ap.paid_amount + alloc;
        const newRem = ap.remaining_amount - alloc;
        await tx.invoice.update({
          where: { id: ap.id },
          data: { 
            paid_amount: newPaid,
            remaining_amount: newRem,
            status: newRem <= 0 ? 'PAID' : 'PARTIALLY PAID' 
          }
        });
        toApplyAP -= alloc;
      }

      // Apply to AR
      let toApplyAR = amount;
      for (const ar of arInvoices) {
        if (toApplyAR <= 0) break;
        const alloc = Math.min(ar.remaining_amount, toApplyAR);
        
        await tx.nettingAllocation.create({
          data: {
            netting_id: nettingRecord.id,
            invoice_id: ar.id,
            type: 'AR',
            amount: alloc
          }
        });
        
        const newPaid = ar.paid_amount + alloc;
        const newRem = ar.remaining_amount - alloc;
        await tx.invoice.update({
          where: { id: ar.id },
          data: { 
            paid_amount: newPaid,
            remaining_amount: newRem,
            status: newRem <= 0 ? 'PAID' : 'PARTIALLY PAID' 
          }
        });
        toApplyAR -= alloc;
      }

      return nettingRecord;
    });
  }

  async getPartnerBalance(partner_id: string, reqUser: any) {
    const company_id = reqUser.company_id || reqUser.companyId;
    const apInvoices = await this.prisma.invoice.findMany({ where: { company_id, OR: [{customer_id: partner_id}, {supplier_id: partner_id}], type: 'AP', status: { not: 'CANCELLED' } }});
    const arInvoices = await this.prisma.invoice.findMany({ where: { company_id, customer_id: partner_id, type: 'AR', status: { not: 'CANCELLED' } }});
    
    let outstanding_ap = 0;
    apInvoices.forEach(ap => outstanding_ap += ap.remaining_amount);
    
    let outstanding_ar = 0;
    arInvoices.forEach(ar => outstanding_ar += ar.remaining_amount);

    return {
      outstanding_ap,
      outstanding_ar,
      net_balance: outstanding_ar - outstanding_ap
    };
  }
}
