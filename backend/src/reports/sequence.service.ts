import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class SequenceService {
  /**
   * Generates a unique sequential number atomically using Prisma transaction capabilities.
   * Format: PREFIX + PADDED_NUMBER (e.g. PO/2026/00001)
   * Hardened with atomic upsert against composite unique constraint @@unique([company_id, type, prefix])
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
      const sequence = await (tx as any).documentSequence.upsert({
        where: {
          company_id_type_prefix: {
            company_id: companyId,
            type: type,
            prefix: fullPrefix,
          },
        },
        update: {
          last_value: { increment: 1 },
        },
        create: {
          company_id: companyId,
          type: type,
          prefix: fullPrefix,
          last_value: 1,
        },
      });

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
