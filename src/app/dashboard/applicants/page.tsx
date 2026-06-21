
"use client"

import { useState, useMemo, useRef } from 'react'
import { 
  Search, 
  Plus, 
  Eye, 
  Loader2,
  Camera,
  Download,
  FileText,
  User,
  MapPin,
  Users as UsersIcon,
  Phone,
  School,
  Calendar,
  CreditCard,
  Briefcase,
  Baby
} from "lucide-react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from 'next/link'
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, orderBy, addDoc, serverTimestamp, limit, getDocs, doc } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'
import { extractFormData } from '@/ai/flows/extract-form-data-flow'

const statusColorMap: Record<string, string> = {
  'Belum Diverifikasi': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Lengkap': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Perlu Perbaikan': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Ditolak': 'bg-destructive/10 text-destructive border-destructive/20',
}

const formSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap harus diisi"),
  NISN: z.string().length(10, "NISN harus 10 digit"),
  NIK: z.string().length(16, "NIK harus 16 digit"),
  familyCardNumber: z.string().length(16, "No. KK harus 16 digit"),
  aktaLahirNumber: z.string().optional(),
  originSchool: z.string().min(2, "Asal sekolah harus diisi"),
  applicationPath: z.enum(['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']),
  gender: z.enum(['Laki-laki', 'Perempuan']),
  birthPlace: z.string().min(2, "Tempat lahir harus diisi"),
  birthDate: z.string().min(1, "Tanggal lahir harus diisi"),
  religion: z.string().min(1, "Agama harus dipilih"),
  address: z.string().min(5, "Alamat lengkap harus diisi"),
  rt: z.string().optional(),
  rw: z.string().optional(),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  parentName: z.string().min(2, "Nama ayah/ibu harus diisi"),
  parentPhone: z.string().min(10, "No. Telepon minimal 10 digit"),
  livingWith: z.enum(['Bersama Orang Tua', 'Wali', 'Asrama', 'Kos']),
  transportation: z.enum(['Jalan Kaki', 'Motor', 'Mobil', 'Angkot/Kendaraan Umum']),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  ijazahSerialNumber: z.string().optional(),
})

export default function ApplicantsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const db = useFirestore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      NISN: "",
      NIK: "",
      familyCardNumber: "",
      aktaLahirNumber: "",
      originSchool: "",
      applicationPath: "Zonasi",
      gender: "Laki-laki",
      birthPlace: "",
      birthDate: "",
      religion: "Islam",
      address: "",
      rt: "",
      rw: "",
      kelurahan: "",
      kecamatan: "",
      parentName: "",
      parentPhone: "",
      livingWith: "Bersama Orang Tua",
      transportation: "Jalan Kaki",
      fatherName: "",
      motherName: "",
      ijazahSerialNumber: "",
    },
  })

  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'system')
  }, [db])

  const { data: systemSettings } = useDoc<any>(settingsRef)

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'applicants'), orderBy('createdAt', 'desc'), limit(100))
  }, [db])

  const { data: applicants, loading } = useCollection<Applicant>(applicantsQuery)

  const filteredApplicants = useMemo(() => {
    if (!applicants) return []
    return applicants.filter(a => 
      a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.NISN.includes(searchTerm)
    )
  }, [applicants, searchTerm])

  const handleDownloadPDF = async (applicant: Applicant) => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    
    const doc = new jsPDF()
    const schoolName = systemSettings?.schoolName || "PORTAL SPMB"
    const dinasName = systemSettings?.dinasName || "DINAS PENDIDIKAN"
    const academicYear = systemSettings?.academicYear || "2024/2025"

    // Header / Kop Surat
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text(dinasName.toUpperCase(), 105, 15, { align: "center" })
    doc.setFontSize(16)
    doc.text(schoolName.toUpperCase(), 105, 23, { align: "center" })
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(`FORMULIR PENDAFTARAN PESERTA DIDIK BARU TAHUN PELAJARAN ${academicYear}`, 105, 30, { align: "center" })
    doc.line(20, 33, 190, 33)

    // Data Utama
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("I. IDENTITAS CALON PESERTA DIDIK", 20, 45)
    
    const dataSiswa = [
      ["Nama Lengkap", applicant.fullName.toUpperCase()],
      ["NISN", applicant.NISN],
      ["NIK / No. KTP", applicant.NIK],
      ["No. Kartu Keluarga", applicant.familyCardNumber],
      ["No. Akta Kelahiran", applicant.aktaLahirNumber || "-"],
      ["Tempat, Tanggal Lahir", `${applicant.birthPlace}, ${applicant.birthDate}`],
      ["Jenis Kelamin", applicant.gender],
      ["Agama", applicant.religion],
      ["Alamat Rumah", `${applicant.address} RT/RW ${applicant.rt || '00'}/${applicant.rw || '00'}, ${applicant.kelurahan || '-'}, ${applicant.kecamatan || '-'}`],
      ["Tinggal Bersama", applicant.livingWith || "-"],
      ["Transportasi ke Sekolah", applicant.transportation || "-"]
    ]

    autoTable(doc, {
      body: dataSiswa,
      startY: 50,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    })

    // Data Orang Tua
    const currentY = (doc as any).lastAutoTable.finalY + 10
    doc.setFont("helvetica", "bold")
    doc.text("II. DATA ORANG TUA / WALI", 20, currentY)

    const dataOrangTua = [
      ["Nama Ayah Kandung", applicant.fatherName || "-"],
      ["Nama Ibu Kandung", applicant.motherName || "-"],
      ["Nama Wali (Jika ada)", applicant.guardianName || "-"],
      ["No. Telepon Orang Tua", applicant.parentPhone]
    ]

    autoTable(doc, {
      body: dataOrangTua,
      startY: currentY + 5,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    })

    // Data Pendaftaran
    const regY = (doc as any).lastAutoTable.finalY + 10
    doc.setFont("helvetica", "bold")
    doc.text("III. DATA REGISTRASI & PENDIDIKAN", 20, regY)

    const dataReg = [
      ["Asal Sekolah (SD/MI)", applicant.originSchool],
      ["No. Seri Ijazah", applicant.ijazahSerialNumber || "-"],
      ["Jalur Pendaftaran", applicant.applicationPath],
      ["No. Pendaftaran", applicant.registrationNumber || "-"]
    ]

    autoTable(doc, {
      body: dataReg,
      startY: regY + 5,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    })

    // Footer / Tanda Tangan
    const footerY = (doc as any).lastAutoTable.finalY + 25
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`${systemSettings?.location || 'Jakarta'}, ${new Date().toLocaleDateString('id-ID')}`, 140, footerY - 5)
    doc.text("Orang Tua / Wali Murid,", 20, footerY)
    doc.text("Panitia PPDB,", 140, footerY)
    doc.text("(............................)", 20, footerY + 25)
    doc.text("(............................)", 140, footerY + 25)

    doc.save(`Formulir_PPDB_${applicant.fullName.replace(/\s+/g, '_')}.pdf`)
    toast({ title: "Formulir PDF Berhasil Diunduh" })
  }

  const handleScanForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsScanning(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      try {
        const result = await extractFormData({ photoDataUri: base64 })
        if (result) {
          Object.entries(result).forEach(([key, value]) => {
            if (value && key in form.getValues()) {
              form.setValue(key as any, value)
            }
          })
          toast({ title: "Scan Berhasil", description: "Hanya data yang terbaca 100% jelas yang diisi otomatis." })
        }
      } catch (err: any) {
        console.error(err)
        toast({ variant: "destructive", title: "Scan Gagal", description: "Pastikan gambar tajam dan tidak buram." })
      } finally {
        setIsScanning(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!db || submitting) return
    setSubmitting(true)
    try {
      const q = query(collection(db, 'applicants'), orderBy('registrationSequence', 'desc'), limit(1));
      const snap = await getDocs(q);
      const nextSequence = snap.empty ? 1 : (snap.docs[0].data().registrationSequence || 0) + 1;
      
      const newApplicant = {
        ...values,
        registrationNumber: `REG-2024-${nextSequence.toString().padStart(4, '0')}`,
        registrationSequence: nextSequence,
        verificationStatus: 'Belum Diverifikasi' as const,
        admissionStatus: 'pending' as const,
        createdAt: new Date().toISOString(),
      }

      await addDoc(collection(db, 'applicants'), newApplicant)
      setIsDialogOpen(false)
      form.reset()
      toast({ title: "Pendaftar Berhasil Ditambahkan" })
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'applicants', operation: 'create' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Portal Pendaftaran</h1>
          <p className="text-muted-foreground mt-1">Kelola data murid baru sesuai standar Dapodik Kemdikbud.</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={scanInputRef} onChange={handleScanForm} accept="image/*" className="hidden" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> Formulir Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 flex flex-col border-border/50 bg-card">
              <DialogHeader className="p-6 pb-2 border-b flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="font-headline text-2xl">Formulir Pendaftaran Dapodik</DialogTitle>
                  <DialogDescription>Isi data lengkap calon murid atau gunakan Scan Formulir Manual.</DialogDescription>
                </div>
                <Button onClick={() => scanInputRef.current?.click()} disabled={isScanning} variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/5">
                  {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  Scan AI (Beta)
                </Button>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                  <ScrollArea className="flex-1 px-8 py-6">
                    <div className="space-y-10 pb-12">
                      {/* Bagian 1: Identitas */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-primary border-b border-primary/20 pb-2">
                          <User className="w-5 h-5" />
                          <h3 className="text-sm font-bold uppercase tracking-widest">I. Data Identitas Pribadi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem className="md:col-span-2 lg:col-span-1"><FormLabel>Nama Lengkap (Sesuai Ijazah/Akte)</FormLabel><FormControl><Input placeholder="Contoh: BUDI SANTOSO" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Jenis Kelamin</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="NISN" render={({ field }) => (
                            <FormItem><FormLabel>NISN (10 Digit)</FormLabel><FormControl><Input placeholder="Contoh: 0123456789" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="NIK" render={({ field }) => (
                            <FormItem><FormLabel>NIK / No. KTP Murid</FormLabel><FormControl><Input placeholder="16 Digit Sesuai KK" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="familyCardNumber" render={({ field }) => (
                            <FormItem><FormLabel>No. Kartu Keluarga</FormLabel><FormControl><Input placeholder="16 Digit No. KK" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="aktaLahirNumber" render={({ field }) => (
                            <FormItem><FormLabel>No. Registrasi Akte Lahir</FormLabel><FormControl><Input placeholder="Contoh: 1234/AL-2012" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="birthPlace" render={({ field }) => (
                            <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="birthDate" render={({ field }) => (
                            <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="religion" render={({ field }) => (
                            <FormItem><FormLabel>Agama</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Islam">Islam</SelectItem><SelectItem value="Kristen">Kristen</SelectItem><SelectItem value="Katolik">Katolik</SelectItem><SelectItem value="Hindu">Hindu</SelectItem><SelectItem value="Budha">Budha</SelectItem><SelectItem value="Khonghucu">Khonghucu</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Bagian 2: Alamat */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-primary border-b border-primary/20 pb-2">
                          <MapPin className="w-5 h-5" />
                          <h3 className="text-sm font-bold uppercase tracking-widest">II. Data Wilayah / Domisili</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem className="md:col-span-2 lg:col-span-4"><FormLabel>Alamat Lengkap (Dusun/Jalan)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="rt" render={({ field }) => (
                            <FormItem><FormLabel>RT</FormLabel><FormControl><Input placeholder="00" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="rw" render={({ field }) => (
                            <FormItem><FormLabel>RW</FormLabel><FormControl><Input placeholder="00" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="kelurahan" render={({ field }) => (
                            <FormItem><FormLabel>Desa / Kelurahan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="kecamatan" render={({ field }) => (
                            <FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Bagian 3: Orang Tua & Pendidikan */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-primary border-b border-primary/20 pb-2">
                          <Briefcase className="w-5 h-5" />
                          <h3 className="text-sm font-bold uppercase tracking-widest">III. Data Orang Tua & Pendidikan</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <FormField control={form.control} name="fatherName" render={({ field }) => (
                            <FormItem><FormLabel>Nama Ayah Kandung</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="motherName" render={({ field }) => (
                            <FormItem><FormLabel>Nama Ibu Kandung</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="parentPhone" render={({ field }) => (
                            <FormItem><FormLabel>No. HP Orang Tua</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="originSchool" render={({ field }) => (
                            <FormItem><FormLabel>Asal Sekolah Dasar (SD/MI)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="ijazahSerialNumber" render={({ field }) => (
                            <FormItem><FormLabel>No. Seri Ijazah / SKL</FormLabel><FormControl><Input placeholder="DN-XX/XXXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="applicationPath" render={({ field }) => (
                            <FormItem><FormLabel>Jalur Pendaftaran</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Zonasi">Zonasi</SelectItem><SelectItem value="Prestasi">Prestasi</SelectItem><SelectItem value="Afirmasi">Afirmasi</SelectItem><SelectItem value="Perpindahan Orang Tua">Perpindahan Orang Tua</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="p-6 border-t bg-muted/30">
                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                      <Button type="submit" disabled={submitting} className="min-w-[150px]">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Simpan & Daftarkan
                      </Button>
                    </DialogFooter>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Nama atau NISN..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
            Total: {filteredApplicants.length} Murid
          </Badge>
        </div>
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow>
              <TableHead className="w-[50px]">No.</TableHead>
              <TableHead>NISN</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Asal Sekolah</TableHead>
              <TableHead>Jalur</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-24 text-muted-foreground italic">Tidak ada data murid yang ditemukan.</TableCell></TableRow>
            ) : filteredApplicants.map((applicant, idx) => (
              <TableRow key={applicant.id} className="hover:bg-muted/30">
                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-mono text-sm">{applicant.NISN}</TableCell>
                <TableCell className="font-medium">{applicant.fullName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{applicant.originSchool}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{applicant.applicationPath}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={`${statusColorMap[applicant.verificationStatus]} text-[10px] font-bold`}>{applicant.verificationStatus}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(applicant)} title="Unduh Formulir PDF">
                      <Download className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/applicants/${applicant.id}`}><Eye className="w-4 h-4" /></Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
