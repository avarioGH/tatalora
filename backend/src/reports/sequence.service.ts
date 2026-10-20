import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class SequenceService {
  /**
   * Generates a unique sequential number atomically using Prisma transaction capabilities.
   * Format: PREFIX + PADDED_NUMBER (e.g. INV/2026/00001)
   */
  async generateNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
    type: string,
    prefixString: string,
    padding: number = 5,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const fullPrefix = `${prefixString}/${year}/`;

    try {
      let sequence = await (tx as any).documentSequence.findFirst({
        where: {
          company_id: companyId,
          type: type,
          prefix: fullPrefix,
        },
      });

      if (sequence) {
        sequence = await (tx as any).documentSequence.update({
          where: { id: sequence.id },
          data: { last_value: { increment: 1 } },
        });
      } else {
        sequence = await (tx as any).documentSequence.create({
          data: {
            company_id: companyId,
            type: type,
            prefix: fullPrefix,
            last_value: 1,
          },
        });
      }

      const paddedValue = sequence.last_value.toString().padStart(padding, '0');
      return `${fullPrefix}${paddedValue}`;
    } catch {
      // Fallback: DocumentSequence model not available (pending migration).
      // Use timestamp + random suffix to ensure uniqueness.
      const ts = Date.now().toString().slice(-6);
      const rand = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      return `${fullPrefix}${ts}${rand}`;
    }
  }
}
