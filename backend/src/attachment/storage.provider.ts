import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StorageUploadResult {
  provider: string;
  key: string;
  size: number;
  checksum: string;
}

export abstract class StorageProvider {
  abstract upload(
    buffer: Buffer,
    originalName: string,
    companyId: string,
  ): Promise<StorageUploadResult>;
  abstract download(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
}

@Injectable()
export class LocalStorageProvider extends StorageProvider {
  private readonly basePath: string;

  constructor() {
    super();
    // Default to a persistent volume path in production
    this.basePath =
      process.env.STORAGE_BASE_PATH || path.join(process.cwd(), 'uploads');
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (e) {
      console.error('Failed to create storage directory', e);
    }
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    companyId: string,
  ): Promise<StorageUploadResult> {
    const ext = path.extname(originalName);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const safeName = crypto.randomBytes(16).toString('hex') + ext;

    // Store in company-specific subfolder to prevent traversal/mixing
    const companyPath = path.join(this.basePath, companyId);
    await fs.mkdir(companyPath, { recursive: true });

    const key = path.join(companyId, safeName);
    const fullPath = path.join(this.basePath, key);

    await fs.writeFile(fullPath, buffer);

    return {
      provider: 'LOCAL',
      key: key.replace(/\\\\/g, '/'),
      size: buffer.length,
      checksum,
    };
  }

  async download(key: string): Promise<Buffer> {
    // Basic path traversal protection
    if (key.includes('..') || path.isAbsolute(key)) {
      throw new Error('Invalid storage key');
    }
    const fullPath = path.join(this.basePath, key);
    return fs.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    if (key.includes('..') || path.isAbsolute(key)) {
      throw new Error('Invalid storage key');
    }
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.unlink(fullPath);
    } catch (e) {
      // Ignore if file already doesn't exist
    }
  }

  async exists(key: string): Promise<boolean> {
    if (key.includes('..') || path.isAbsolute(key)) {
      return false;
    }
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
