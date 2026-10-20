import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QualityService {
  private readonly logger = new Logger(QualityService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getPoints(company_id: string) {
    return (this.prisma.qualityControlPoint as any).findMany({
      where: { company_id },
      include: { product: true },
    });
  }

  async getChecks(company_id: string) {
    return (this.prisma.qualityCheck as any).findMany({
      where: { company_id },
      include: {
        product: true,
        manufacturing_order: true,
        work_order: true,

        dispositions: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createCheck(company_id: string, data: any) {
    if (!data.product_id)
      throw new BadRequestException('Product ID is required');

    return (this.prisma.qualityCheck as any).create({
      data: {
        company_id,
        control_point_id: data.quality_point_id || data.control_point_id,
        product_id: data.product_id,
        manufacturing_order_id: data.manufacturing_order_id,
        work_order_id: data.work_order_id,
        status: 'PENDING',
      },
    });
  }

  async completeCheck(
    company_id: string,
    id: string,
    user_id: string,
    data: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const check = await (tx.qualityCheck as any).findUnique({
        where: { id },
        include: { manufacturing_order: true },
      });

      if (!check || check.company_id !== company_id) {
        throw new NotFoundException('Quality check not found');
      }

      if (check.status !== 'PENDING') {
        throw new BadRequestException(
          'Quality check is already completed or cancelled',
        );
      }

      const inspected = Number(data.inspected_quantity) || 0;
      const accepted = Number(data.accepted_quantity) || 0;
      const rejected = Number(data.rejected_quantity) || 0;

      if (inspected <= 0) {
        throw new BadRequestException('Inspected quantity must be > 0');
      }

      if (accepted + rejected > inspected) {
        throw new BadRequestException(
          'Accepted + Rejected cannot exceed Inspected quantity',
        );
      }

      // If tied to an MO, ensure we don't inspect more than produced (unless it's an incoming inspection, but we assume finished goods logic here)
      if (
        check.manufacturing_order &&
        check.manufacturing_order.produced_quantity < inspected
      ) {
        throw new BadRequestException(
          'Cannot inspect more than the produced quantity of the MO',
        );
      }

      let finalResult = 'PASSED';

      // Validation based on inspection type
      if (check.quality_point) {
        const pt = check.quality_point;
        if (pt.inspection_type === 'NUMERIC') {
          if (
            data.numeric_result === undefined ||
            data.numeric_result === null
          ) {
            throw new BadRequestException(
              'Numeric result is required for NUMERIC inspection',
            );
          }
          if (
            pt.tolerance_min !== null &&
            data.numeric_result < pt.tolerance_min
          )
            finalResult = 'FAILED';
          if (
            pt.tolerance_max !== null &&
            data.numeric_result > pt.tolerance_max
          )
            finalResult = 'FAILED';
        } else if (pt.inspection_type === 'CHECKLIST') {
          // Simplistic checklist validation: frontend sends a map or string. If any marked fail, then fail.
          // In a real system, you'd parse JSON. Here we rely on explicit 'failed' signal in payload if checklist is failed.
          if (data.checklist_failed) {
            finalResult = 'FAILED';
          }
        }
      }

      // Manual override if requested (e.g. inspector marks it fail despite numeric pass)
      if (data.force_fail) {
        finalResult = 'FAILED';
      }

      // If there are rejected quantities, it inherently has failures
      if (rejected > 0) {
        finalResult = 'FAILED';
      }

      const updated = await (tx.qualityCheck as any).update({
        where: { id },
        data: {
          status: finalResult,
          inspected_quantity: inspected,
          accepted_quantity: accepted,
          rejected_quantity: rejected,
          numeric_result: data.numeric_result,
          checklist_result: data.checklist_result
            ? JSON.stringify(data.checklist_result)
            : null,
          notes: data.notes,
          inspector_id: user_id,
          inspection_date: new Date(),
        },
      });

      return updated;
    });
  }

  async addDisposition(
    company_id: string,
    id: string,
    user_id: string,
    data: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const check = await (tx.qualityCheck as any).findUnique({
        where: { id },
      });

      if (!check || check.company_id !== company_id) {
        throw new NotFoundException('Quality check not found');
      }

      if (check.status !== 'FAILED') {
        throw new BadRequestException(
          'Dispositions can only be added to FAILED quality checks',
        );
      }

      const qty = Number(data.quantity) || 0;
      if (qty <= 0) {
        throw new BadRequestException('Disposition quantity must be positive');
      }

      if (qty > check.rejected_quantity) {
        throw new BadRequestException(
          'Disposition quantity cannot exceed rejected quantity',
        );
      }

      // Create disposition record
      const disp = await (tx as any).qualityDisposition.create({
        data: {
          company_id,
          quality_check_id: check.id,
          type: data.type, // REWORK, SCRAP, HOLD, REJECT
          quantity: qty,
          reason: data.reason,
          defect_code: data.defect_code,
          severity: data.severity,
          user_id: user_id,
        },
      });

      // No inventory mutation here to respect isolation rules.
      // If scrap is required, it must be performed via Inventory Service separately.

      return disp;
    });
  }
}
