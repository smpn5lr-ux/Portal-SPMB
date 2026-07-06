'use server';
/**
 * @fileOverview Flow Genkit untuk ekstraksi data murid dari file PDF/Dokumen.
 * Menggunakan kemampuan multimodal Gemini 1.5 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractFileOutputSchema = z.object({
  applicants: z.array(z.object({
    fullName: z.string().optional(),
    gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
    NISN: z.string().optional(),
    NIK: z.string().optional(),
    birthPlace: z.string().optional(),
    birthDate: z.string().optional(),
    originSchool: z.string().optional(),
    parentName: z.string().optional(),
    studentPhone: z.string().optional(),
    address: z.string().optional(),
    applicationPath: z.enum(['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']).optional(),
  })).describe("Daftar murid yang berhasil diekstraksi dari dokumen.")
});

const ExtractFileInputSchema = z.object({
  fileDataUri: z.string().describe("Data URI file (PDF atau Gambar)."),
  fileType: z.string().describe("Mime type file."),
});

export async function extractFromFile(input: z.infer<typeof ExtractFileInputSchema>) {
  return extractFromFileFlow(input);
}

const extractFromFileFlow = ai.defineFlow(
  {
    name: 'extractFromFileFlow',
    inputSchema: ExtractFileInputSchema,
    outputSchema: ExtractFileOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: [
        {
          text: `Anda adalah pakar administrasi sekolah. Ekstrak data calon murid dari dokumen terlampir ke dalam format terstruktur.
          
          ATURAN:
          1. Baca setiap baris data jika berupa tabel atau daftar.
          2. Pastikan Jenis Kelamin hanya 'Laki-laki' atau 'Perempuan'.
          3. Format tanggal lahir harus YYYY-MM-DD.
          4. Jika data tidak ditemukan, biarkan kosong (undefined).
          5. Fokus pada Nama, NISN, Sekolah Asal, dan Nama Orang Tua.`
        },
        {
          media: {
            url: input.fileDataUri,
            contentType: input.fileType
          }
        }
      ],
      output: { schema: ExtractFileOutputSchema }
    });
    return output!;
  }
);
