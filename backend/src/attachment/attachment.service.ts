import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageProvider } from './storage.provider';

export type AllowedEntityType =
  | 'INVOICE'
  | 'VENDOR_BILL'
  | 'PURCHASE_ORDER'
  | 'EXPENSE_CLAIM'
  | 'PAYROLL'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'ASSET'
  | 'APPROVAL_REQUEST'
  | 'MANUFACTURING_ORDER';

@Injectable()
export class AttachmentService {
  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  ];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10 MB

  constructor(
    private prisma: PrismaService,
    private storage: StorageProvider,
  ) {}

  async uploadAttachment(
    companyId: string,
    userId: string,
    entityType: AllowedEntityType,
    entityId: string,
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
  ) {
    // 1. Validation
    if (fileBuffer.length > this.maxFileSize) {
      throw new BadRequestException('File size exceeds the 10MB limit');
    }
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException('MIME type not allowed');
    }

    // 2. Validate Entity Ownership
    await this.validateEntityOwnership(companyId, entityType, entityId);

    // 3. Upload to Storage
    const uploadResult = await this.storage.upload(
      fileBuffer,
      originalFileName,
      companyId,
    );

    try {
      // 4. Create DB Metadata
      const attachment = await (this.prisma as any).attachment.create({
        data: {
          company_id: companyId,
          entity_type: entityType,
          entity_id: entityId,
          file_name: originalFileName,
          original_file_name: originalFileName,
          mime_type: mimeType,
          file_size: uploadResult.size,
          storage_provider: uploadResult.provider,
          storage_key: uploadResult.key,
          checksum: uploadResult.checksum,
          uploaded_by: userId,
          status: 'ACTIVE',
        },
      });

      // 5. Audit
      await this.prisma.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          action: 'DOCUMENT_UPLOADED',
          entity: 'Attachment',
          entity_id: attachment.id,
          after_data: {
            entity_type: entityType,
            entity_id: entityId,
            size: uploadResult.size,
          } as any,
        },
      });

      return attachment;
    } catch (dbError) {
      // Storage compensation logic
      await this.storage
        .delete(uploadResult.key)
        .catch((e) => console.error('Compensation failed', e));
      throw new Error(
        'Failed to create attachment metadata, upload rolled back',
      );
    }
  }

  async getAttachments(
    companyId: string,
    entityType: string,
    entityId: string,
  ) {
    return (this.prisma as any).attachment.findMany({
      where: {
        company_id: companyId,
        entity_type: entityType,
        entity_id: entityId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        file_name: true,
        mime_type: true,
        file_size: true,
        uploaded_by: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async downloadAttachment(
    companyId: string,
    userId: string,
    attachmentId: string,
  ) {
    const attachment = await (this.prisma as any).attachment.findFirst({
      where: { id: attachmentId, company_id: companyId, status: 'ACTIVE' },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Validate access to the entity before allowing download
    await this.validateEntityOwnership(
      companyId,
      attachment.entity_type as AllowedEntityType,
      attachment.entity_id,
    );

    const buffer = await this.storage.download(attachment.storage_key);

    await this.prisma.auditLog.create({
      data: {
        company_id: companyId,
        user_id: userId,
        action: 'DOCUMENT_DOWNLOADED',
        entity: 'Attachment',
        entity_id: attachment.id,
      },
    });

    return {
      buffer,
      mimeType: attachment.mime_type,
      fileName: attachment.file_name,
    };
  }

  async deleteAttachment(
    companyId: string,
    userId: string,
    attachmentId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await (tx as any).attachment.findFirst({
        where: { id: attachmentId, company_id: companyId, status: 'ACTIVE' },
      });

      if (!attachment) {
        throw new NotFoundException('Attachment not found');
      }

      // Check if the entity is locked/posted, blocking deletion
      await this.enforceImmutability(
        tx as any,
        companyId,
        attachment.entity_type,
        attachment.entity_id,
      );

      const updated = await (tx as any).attachment.update({
        where: { id: attachmentId },
        data: { status: 'DELETED' },
      });

      await tx.auditLog.create({
        data: {
          company_id: companyId,
          user_id: userId,
          action: 'DOCUMENT_DELETED',
          entity: 'Attachment',
          entity_id: attachment.id,
        },
      });

      return updated;
    });
  }

  private async validateEntityOwnership(
    companyId: string,
    entityType: AllowedEntityType,
    entityId: string,
  ) {
    let exists = false;
    switch (entityType) {
      case 'INVOICE':
      case 'VENDOR_BILL':
        exists = !!(await this.prisma.invoice.findFirst({
          where: { id: entityId, company_id: companyId },
        }));
        break;
      case 'PURCHASE_ORDER':
        exists = !!(await this.prisma.purchaseOrder.findFirst({
          where: { id: entityId, company_id: companyId },
        }));
        break;
      case 'EXPENSE_CLAIM':
        exists = !!(await this.prisma.expenseClaim.findFirst({
          where: { id: entityId, company_id: companyId },
        }));
        break;
      case 'PAYROLL':
        exists = !!(await this.prisma.payroll.findFirst({
          where: { id: entityId, company_id: companyId },
        }));
        break;
      case 'CUSTOMER':
        exists = !!(await this.prisma.customer.findFirst({
          where: { id: entityId, company_id: companyId },
        }));
        break;
      case 'SUPPLIER':
        exists = !!(await this.prisma.customer.findFirst({
          where: { id: entityId, company_id: companyId },
        }));
        break;
      case 'ASSET':
        exists = !!(await this.prisma.assetMaster.findFirst({
          where: { id: entityId, company_id: companyId },
        }));
        break;
      case 'APPROVAL_REQUEST':
        exists = !!(await this.prisma.approvalRequest.findFirst({
          where: { id: entityId, company_id: companyId },
        }));
        break;
      case 'MANUFACTURING_ORDER':
        exists = !!(await this.prisma.manufacturingOrder.findFirst({
          where: { id: entityId, company_id: companyId },
        }));
        break;
      default:
        throw new BadRequestException('Unsupported entity type: ' + entityType);
    }

    if (!exists) {
      throw new ForbiddenException(
        'Entity ' +
          entityType +
          ' ' +
          entityId +
          ' not found or does not belong to company',
      );
    }
  }

  private async enforceImmutability(
    tx: any,
    companyId: string,
    entityType: string,
    entityId: string,
  ) {
    // If an entity is posted/completed, prevent deleting attachments
    switch (entityType) {
      case 'INVOICE':
      case 'VENDOR_BILL':
        const inv = await tx.invoice.findFirst({
          where: { id: entityId, company_id: companyId },
        });
        if (inv && (inv.status === 'POSTED' || inv.status === 'PAID')) {
          throw new ForbiddenException(
            'Cannot delete attachments from a posted/paid invoice',
          );
        }
        break;
      case 'EXPENSE_CLAIM':
        const exp = await tx.expenseClaim.findFirst({
          where: { id: entityId, company_id: companyId },
        });
        if (exp && (exp.status === 'POSTED' || exp.status === 'PAID')) {
          throw new ForbiddenException(
            'Cannot delete attachments from a posted expense claim',
          );
        }
        break;
      case 'PAYROLL':
        const pay = await tx.payroll.findFirst({
          where: { id: entityId, company_id: companyId },
        });
        if (pay && (pay.status === 'POSTED' || pay.status === 'PAID')) {
          throw new ForbiddenException(
            'Cannot delete attachments from a posted payroll',
          );
        }
        break;
    }
  }
}
