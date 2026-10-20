import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface UploadDocumentDto {
  companyId: string;
  documentNo: string;
  title: string;
  category: string;
  tags?: string;
  fileUrl: string; // From Object Storage
  fileSize: number;
  mimeType: string;
  userId: string;
}

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upload Document & Versioning Logic
   * Jika documentNo sudah ada, otomatis buat versi baru tanpa menimpa file lama.
   */
  async uploadDocument(data: UploadDocumentDto) {
    return this.prisma.$transaction(async (tx) => {
      let master = await tx.documentMaster.findUnique({
        where: {
          company_id_document_no: {
            company_id: data.companyId,
            document_no: data.documentNo,
          },
        },
        include: { versions: true },
      });

      let nextVersion = 1;

      // 1. Jika belum ada, buat Master baru
      if (!master) {
        master = await tx.documentMaster.create({
          data: {
            company_id: data.companyId,
            document_no: data.documentNo,
            title: data.title,
            category: data.category,
            tags: data.tags,
            status: 'ACTIVE',
            uploaded_by: data.userId,
          },
          include: { versions: true },
        });
      } else {
        // Jika sudah ada, naikkan versi
        nextVersion = master.versions.length + 1;
      }

      // 2. Buat Versi Dokumen (S3 File Tracking)
      const version = await tx.documentVersion.create({
        data: {
          document_master_id: master.id,
          version_number: nextVersion,
          file_url: data.fileUrl,
          file_size: data.fileSize,
          mime_type: data.mimeType,
          uploaded_by: data.userId,
        },
      });

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          company_id: data.companyId,
          user_id: data.userId,
          action: 'DOCUMENT_UPLOADED',
          entity: 'DocumentMaster',
          entity_id: master.id,
          after_data: { version: nextVersion, file_url: data.fileUrl } as any,
        },
      });

      return { master, version };
    });
  }

  /**
   * Share Link Generator (Secure & Expiring)
   */
  async generateShareLink(
    companyId: string,
    documentMasterId: string,
    userId: string,
    validDays: number,
    password?: string,
  ) {
    const doc = await this.prisma.documentMaster.findUnique({
      where: { id: documentMasterId },
    });
    if (!doc || doc.company_id !== companyId)
      throw new NotFoundException('Document not found');
    const token = crypto.randomBytes(32).toString('hex');
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + validDays);

    // Placeholder untuk Hashing Password jika dikirim
    const passwordHash = password
      ? crypto.createHash('sha256').update(password).digest('hex')
      : null;

    const link = await this.prisma.documentShareLink.create({
      data: {
        document_master_id: documentMasterId,
        token: token,
        expired_at: expiredAt,
        password_hash: passwordHash,
        created_by: userId,
      },
    });

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        company_id: companyId,
        user_id: userId,
        action: 'SHARE_LINK_GENERATED',
        entity: 'DocumentShareLink',
        entity_id: link.id,
      },
    });

    // Mengembalikan public URL format
    return `https://app.erp.local/share/${token}`;
  }
}
