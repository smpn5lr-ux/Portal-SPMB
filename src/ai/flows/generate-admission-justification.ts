'use server';
/**
 * @fileOverview A Genkit flow for generating AI-powered justifications for student admission decisions.
 *
 * - generateAdmissionJustification - A function that generates an admission justification.
 * - AdmissionJustificationInput - The input type for the generateAdmissionJustification function.
 * - AdmissionJustificationOutput - The return type for the generateAdmissionJustification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const AdmissionJustificationInputSchema = z.object({
  applicantData: z.object({
    NISN: z.string().describe('Nomor Induk Siswa Nasional (NISN) of the applicant.'),
    fullName: z.string().describe('Full name of the applicant.'),
    birthDate: z.string().describe('Applicant\'s date of birth (e.g., "DD-MM-YYYY").'),
    gender: z.enum(['Laki-laki', 'Perempuan']).describe('Gender of the applicant.'),
    address: z.string().describe('Full address of the applicant.'),
    parentName: z.string().describe('Name of the parent or guardian.'),
    originSchool: z.string().describe('Previous school of the applicant.'),
    NIK: z.string().describe('Nomor Induk Kependudukan (NIK) of the applicant.'),
    applicationPath: z.enum(['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']).describe('The admission path chosen by the applicant.'),
    academicScore: z.number().optional().describe('Academic score (if applying via Prestasi path).'),
    distanceToSchoolKm: z.number().optional().describe('Distance from applicant\'s address to school in kilometers (if applying via Zonasi path).'),
    ageYears: z.number().optional().describe('Applicant\'s age in years, used for tie-breaking.'),
    affirmationCategory: z.string().optional().describe('Category of affirmation (e.g., "Disabilitas", "Ekonomi Kurang Mampu", if applying via Afirmasi path).')
  }).describe('Data of the applicant.'),
  selectionCriteria: z.object({
    zonasiMaxDistanceKm: z.number().describe('Maximum allowed distance for Zonasi path in km.'),
    prestasiMinScore: z.number().describe('Minimum academic score required for Prestasi path.'),
    affirmationCategoriesAllowed: z.array(z.string()).describe('List of accepted affirmation categories.'),
    transferParentMinMonths: z.number().optional().describe('Minimum months for parent transfer (if applicable for Perpindahan Orang Tua path).'),
    maxAgeForPriority: z.number().optional().describe('Maximum age for priority in tie-breaking.')
  }).describe('The criteria used for student selection.'),
  quotaRules: z.object({
    totalQuota: z.number().describe('Total student quota for the school.'),
    quotaPerPath: z.record(z.enum(['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']), z.number()).describe('Quota percentage or number for each admission path.'),
    rombelCapacity: z.number().describe('Maximum capacity of students per rombongan belajar (class group).')
  }).describe('The quota rules for admission.'),
  admissionStatus: z.enum(['accepted', 'waitlisted', 'rejected']).describe('The final admission status of the applicant.'),
  rankingDetails: z.string().optional().describe('Optional details about the applicant\'s ranking within their path or overall.'),
  currentRomelEnrollment: z.number().describe('Current total number of students enrolled in rombels across the school.')
});
export type AdmissionJustificationInput = z.infer<typeof AdmissionJustificationInputSchema>;

// Output Schema
const AdmissionJustificationOutputSchema = z.object({
  justification: z.string().describe('A detailed explanation for the admission decision.'),
  summary: z.string().describe('A concise summary of the admission decision.')
});
export type AdmissionJustificationOutput = z.infer<typeof AdmissionJustificationOutputSchema>;

// Wrapper function to call the flow
export async function generateAdmissionJustification(
  input: AdmissionJustificationInput
): Promise<AdmissionJustificationOutput> {
  return admissionJustificationFlow(input);
}

// Define the prompt
const admissionJustificationPrompt = ai.definePrompt({
  name: 'admissionJustificationPrompt',
  input: { schema: AdmissionJustificationInputSchema },
  output: { schema: AdmissionJustificationOutputSchema },
  prompt: `You are an expert school administrator responsible for explaining student admission decisions for the New Student Admission System (SPMB) in Indonesia.
Your task is to provide a clear, objective, and empathetic justification for an applicant's admission status based on the provided data.
The explanation should be professional, supportive, and easy for parents/guardians to understand.

Applicant Details:
- NISN: {{{applicantData.NISN}}}
- Nama Lengkap: {{{applicantData.fullName}}}
- Tanggal Lahir: {{{applicantData.birthDate}}}
- Jenis Kelamin: {{{applicantData.gender}}}
- Alamat: {{{applicantData.address}}}
- Nama Orang Tua/Wali: {{{applicantData.parentName}}}
- Asal Sekolah: {{{applicantData.originSchool}}}
- NIK: {{{applicantData.NIK}}}
- Jalur Pendaftaran: {{{applicantData.applicationPath}}}
{{#if applicantData.academicScore}}- Nilai Akademik: {{{applicantData.academicScore}}}{{/if}}
{{#if applicantData.distanceToSchoolKm}}- Jarak ke Sekolah: {{{applicantData.distanceToSchoolKm}}} km{{/if}}
{{#if applicantData.ageYears}}- Usia: {{{applicantData.ageYears}}} tahun{{/if}}
{{#if applicantData.affirmationCategory}}- Kategori Afirmasi: {{{applicantData.affirmationCategory}}}{{/if}}

Selection Criteria:
- Kriteria Zonasi (Jarak Maksimal): {{{selectionCriteria.zonasiMaxDistanceKm}}} km
- Kriteria Prestasi (Nilai Minimal): {{{selectionCriteria.prestasiMinScore}}}
- Kategori Afirmasi yang Diterima: {{#each selectionCriteria.affirmationCategoriesAllowed}}'{{{this}}}'{{#unless @last}}, {{/unless}}{{/each}}
{{#if selectionCriteria.transferParentMinMonths}}- Kriteria Perpindahan Orang Tua (Minimal Bulan Kerja): {{{selectionCriteria.transferParentMinMonths}}} bulan{{/if}}
{{#if selectionCriteria.maxAgeForPriority}}- Prioritas Usia (Maksimal untuk Tie-Breaker): {{{selectionCriteria.maxAgeForPriority}}} tahun{{/if}}

Quota Rules:
- Total Kuota Penerimaan Sekolah: {{{quotaRules.totalQuota}}} siswa
- Kuota per Jalur Pendaftaran:
    {{#each quotaRules.quotaPerPath}}- {{@key}}: {{this}}% dari total kuota{{/each}}
- Kapasitas Maksimal per Rombongan Belajar (Rombel): {{{quotaRules.rombelCapacity}}} siswa

- Total Siswa Diterima di Rombel Saat Ini: {{{currentRomelEnrollment}}} siswa

Admission Status: **{{{admissionStatus}}}**
{{#if rankingDetails}}Detail Peringkat: {{{rankingDetails}}}{{/if}}

Based on the information above, you need to generate a detailed 'justification' and a concise 'summary' for the admission decision.
The 'justification' should be a comprehensive explanation, referencing specific criteria, the applicant's data, and how it aligns or deviates from the rules.
    - If **accepted**: Clearly state the path, how they met the criteria, and that they are within the quota.
    - If **waitlisted**: Explain that they met some criteria but are currently beyond the available quota, possibly due to higher-ranked applicants, and that they will be considered if a slot becomes available.
    - If **rejected**: Clearly state the primary reasons for rejection (e.g., did not meet minimum distance/score, category not eligible, quota full and ranking too low).
The 'summary' should be a short, one-sentence statement encapsulating the decision and the main reason.
Ensure the language is respectful and professional, suitable for official communication.
`
});

// Define the flow
const admissionJustificationFlow = ai.defineFlow(
  {
    name: 'admissionJustificationFlow',
    inputSchema: AdmissionJustificationInputSchema,
    outputSchema: AdmissionJustificationOutputSchema
  },
  async (input) => {
    const {output} = await admissionJustificationPrompt(input);
    return output!;
  }
);
