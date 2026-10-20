import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export class ExpensePostedEvent {
  constructor(
    public readonly companyId: string,
    public readonly sourceEntityId: string,
    public readonly eventId: string,
    public readonly occurredAt: Date,
    public readonly payload: any,
    public readonly tx?: any,
  ) {}
}

@Injectable()
export class ExpenseService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getClaims(
    companyId: string,
    employeeId?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const where: any = { company_id: companyId };
    if (employeeId) where.employee_id = employeeId;

    return (this.prisma.expenseClaim as any).findMany({
      where,
      include: { employee: true, items: { include: { category: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
  }

  async getClaim(companyId: string, id: string) {
    const claim = await (this.prisma.expenseClaim as any).findFirst({
      where: { id, company_id: companyId },
      include: { employee: true, items: { include: { category: true } } },
    });
    if (!claim) throw new NotFoundException('Expense Claim not found');
    return claim;
  }

  async createClaim(companyId: string, userId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      // Basic RBAC/ownership validation would happen in controller, but we enforce here:
      const employee = await tx.employee.findFirst({
        where: { id: data.employeeId, company_id: companyId },
      });
      if (!employee)
        throw new NotFoundException('Employee not found or unauthorized');

      const claimNumber = `EXP/${new Date().getFullYear()}/${Date.now()}`;

      const claim = await (tx.expenseClaim as any).create({
        data: {
          company_id: companyId,
          employee_id: employee.id,
          claim_number: claimNumber,
          claim_date: new Date(data.claimDate || Date.now()),
          title: data.title,
          description: data.description,
          status: 'DRAFT',
          total_amount: 0,
          created_by: userId,
        },
      });

      let total = 0;
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          if (item.amount <= 0)
            throw new BadRequestException(
              'Expense item amount must be positive',
            );
          const cat = await tx.financeCategory.findFirst({
            where: { id: item.categoryId, company_id: companyId },
          });
          if (!cat)
            throw new BadRequestException(
              `Category ${item.categoryId} not found`,
            );

          await tx.expenseItem.create({
            data: {
              expense_claim_id: claim.id,
              category_id: cat.id,
              description: item.description,
              amount: item.amount,
              expense_date: new Date(item.expenseDate || Date.now()),
              reference: item.reference,
            },
          });
          total += item.amount;
        }
      }

      const updatedClaim = await (tx.expenseClaim as any).update({
        where: { id: claim.id },
        data: { total_amount: total },
        include: { items: true },
      });

      return updatedClaim;
    });
  }

  async submitClaim(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await (tx.expenseClaim as any).findFirst({
        where: { id, company_id: companyId },
        include: { items: true },
      });
      if (!claim) throw new NotFoundException('Expense Claim not found');
      if (claim.status !== 'DRAFT')
        throw new BadRequestException('Only DRAFT claims can be submitted');
      if (claim.items.length === 0)
        throw new BadRequestException('Cannot submit empty claim');
      if (claim.total_amount <= 0)
        throw new BadRequestException('Claim total must be positive');

      return (tx.expenseClaim as any).update({
        where: { id },
        data: { status: 'SUBMITTED', submitted_at: new Date() },
      });
    });
  }

  async approveClaim(companyId: string, id: string, userId: string) {
    const claim = await (this.prisma.expenseClaim as any).findFirst({
      where: { id, company_id: companyId },
    });
    if (!claim) throw new NotFoundException('Expense Claim not found');
    if (claim.status !== 'SUBMITTED')
      throw new BadRequestException('Only SUBMITTED claims can be approved');

    // Optional: if (claim.employee_id === user.employee_id) throw new ForbiddenException('Cannot self-approve');

    return (this.prisma.expenseClaim as any).update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_at: new Date(),
        approved_by: userId,
      },
    });
  }

  async postClaim(companyId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await (this.prisma.expenseClaim as any).findFirst({
        where: { id, company_id: companyId },
        include: { items: true },
      });
      if (!claim) throw new NotFoundException('Expense Claim not found');
      if (claim.status !== 'APPROVED')
        throw new BadRequestException('Only APPROVED claims can be posted');

      const updated = await (tx.expenseClaim as any).update({
        where: { id },
        data: {
          status: 'POSTED',
          posted_at: new Date(),
          finance_reviewed_by: userId,
          remaining_amount: claim.total_amount,
        },
      });

      // Emit double-entry event for GL to catch (Dr Expense Account, Cr Employee Reimbursement Payable)
      await this.eventEmitter.emitAsync(
        'expense.posted',
        new ExpensePostedEvent(
          companyId,
          claim.id,
          'EVT-EXP-' + Date.now(),
          new Date(),
          {
            totalAmount: claim.total_amount,
            items: claim.items,
          },
          tx as any,
        ),
      );

      return updated;
    });
  }
}
