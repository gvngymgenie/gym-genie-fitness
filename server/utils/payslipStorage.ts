import { createClient } from '@supabase/supabase-js';

/**
 * Upload payslip PDFs to Supabase Storage 'payslips' bucket
 */
export class PayslipStorage {
  private static supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  private static supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  private static readonly BUCKET = 'payslips';

  private static get supabase() {
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase URL or Service Role Key is not defined.');
    }
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Ensure the payslips bucket exists (create if not)
   */
  private static async ensureBucket(): Promise<void> {
    const supabase = this.supabase;
    const { error: getError } = await supabase.storage.getBucket(this.BUCKET);
    if (getError) {
      const { error: createError } = await supabase.storage.createBucket(this.BUCKET, {
        public: true,
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
      });
      if (createError) {
        throw new Error(`Failed to create payslips bucket: ${createError.message}`);
      }
      console.log(`✅ Created new public bucket: ${this.BUCKET}`);
    } else {
      console.log(`ℹ️ Payslips bucket already exists`);
    }
  }

  /**
   * Upload a base64-encoded PDF to the payslips bucket.
   * Returns the public download URL.
   *
   * @param base64Data  Raw base64 string (no data: URI prefix)
   * @param filename    e.g. "payslip-Rahul-March-2025.pdf"
   * @param trainerId   Used as a subfolder for organization (optional)
   */
  static async uploadPayslip(
    base64Data: string,
    filename: string,
    trainerId?: string
  ): Promise<string> {
    const supabase = this.supabase;
    await this.ensureBucket();

    // Build path: [trainerId/]filename
    const objectPath = trainerId
      ? `${trainerId}/${filename}`
      : filename;

    const buffer = Buffer.from(base64Data, 'base64');

    const { data, error } = await supabase.storage
      .from(this.BUCKET)
      .upload(objectPath, buffer, {
        cacheControl: '31536000', // 1 year
        upsert: true,
        contentType: 'application/pdf',
      });

    if (error) {
      console.error('❌ Supabase payslip upload failed:', error);
      throw new Error(`Failed to upload payslip: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(this.BUCKET)
      .getPublicUrl(data.path);

    console.log(`✅ Payslip uploaded to Supabase: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  }

  /**
   * List all payslips in the bucket, optionally filtered by trainerId.
   * Returns array of objects with path, name, and public URL.
   */
  static async listAllPayslips(trainerId?: string): Promise<Array<{
    path: string;
    name: string;
    publicUrl: string;
    size?: number;
    updatedAt?: string;
  }>> {
    const supabase = this.supabase;
    await this.ensureBucket();

    const prefix = trainerId ? `${trainerId}/` : '';
    
    const { data, error } = await supabase.storage
      .from(this.BUCKET)
      .list(prefix, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'updated_at', order: 'desc' },
      });

    if (error) {
      console.error('❌ Failed to list payslips:', error);
      throw new Error(`Failed to list payslips: ${error.message}`);
    }

    // Build full paths with public URLs
    const payslips = (data || [])
      .filter(file => file.name.endsWith('.pdf'))
      .map(file => {
        const fullPath = trainerId ? `${trainerId}/${file.name}` : file.name;
        const { data: urlData } = supabase.storage
          .from(this.BUCKET)
          .getPublicUrl(fullPath);
        
        return {
          path: fullPath,
          name: file.name,
          publicUrl: urlData.publicUrl,
          size: file.metadata?.size,
          updatedAt: file.metadata?.lastModified,
        };
      });

    console.log(`✅ Listed ${payslips.length} payslips from Supabase`);
    return payslips;
  }

  /**
   * Delete a payslip from storage (useful for cleanup).
   * Pass the object path inside the bucket, e.g. "trainer123/payslip-foo.pdf"
   */
  static async deletePayslip(objectPath: string): Promise<void> {
    const supabase = this.supabase;
    const { error } = await supabase.storage
      .from(this.BUCKET)
      .remove([objectPath]);

    if (error && !error.message.toLowerCase().includes('not found')) {
      console.error('❌ Payslip deletion failed:', error);
      throw new Error(`Failed to delete payslip: ${error.message}`);
    }
    console.log(`✅ Payslip deleted: ${objectPath}`);
  }
}
