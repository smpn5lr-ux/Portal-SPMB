
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
  CreditCard
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
  originSchool: z.string().min(2, "Asal sekolah harus diisi"),
  applicationPath: z.enum(['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']),
  gender: z.enum(['Laki-laki', 'Perempuan']),
  birthPlace: z.string().min(2, "Tempat lahir harus diisi"),
  birthDate: z.string().min(1, "Tanggal lahir harus diisi"),
  religion: z.string().min(1, "Agama harus dipilih"),
  address: z.string().min(5, "Alamat lengkap harus diisi"),
  parentName: z.string().min(2, "Nama ayah/ibu harus diisi"),
  parentPhone: z.string().min(10, "No. Telepon minimal 10 digit"),
  livingWith: z.enum(['Bersama Orang Tua', 'Wali', 'Asrama', 'Kos']),
  transportation: z.enum(['Jalan Kaki', 'Motor', 'Mobil', 'Angkot/Kendaraan Umum']),
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
      originSchool: "",
      applicationPath: "Zonasi",
      gender: "Laki-laki",
      birthPlace: "",
      birthDate: "",
      religion: "Islam",
      address: "",
      parentName: "",
      parentPhone: "",
      livingWith: "Bersama Orang Tua",
      transportation: "Jalan Kaki",
    },
  })

  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'system')
  }, [db])

  const { data: systemSettings } = useDoc<any>(settingsRef)

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    // Mengurutkan berdasarkan createdAt agar data terbaru muncul di atas
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
    doc.text("A. IDENTITAS CALON PESERTA DIDIK", 20, 45)
    
    const dataSiswa = [
      ["Nama Lengkap", applicant.fullName.toUpperCase()],
      ["NISN", applicant.NISN],
      ["NIK", applicant.NIK],
      ["No. Kartu Keluarga", applicant.familyCardNumber],
      ["Tempat, Tanggal Lahir", `${applicant.birthPlace}, ${applicant.birthDate}`],
      ["Jenis Kelamin", applicant.gender],
      ["Agama", applicant.religion],
      ["Alamat Rumah", applicant.address],
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

    // Data Pendaftaran
    const currentY = (doc as any).lastAutoTable.finalY + 10
    doc.setFont("helvetica", "bold")
    doc.text("B. DATA REGISTRASI", 20, currentY)

    const dataReg = [
      ["Asal Sekolah", applicant.originSchool],
      ["Jalur Pendaftaran", applicant.applicationPath],
      ["No. Pendaftaran", applicant.registrationNumber || "-"]
    ]

    autoTable(doc, {
      body: dataReg,
      startY: currentY + 5,
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
    toast({ title: "Formulir berhasil diunduh" })
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
          toast({ title: "Scan Berhasil", description: "Data yang terbaca jelas telah diisi secara otomatis." })
        }
      } catch (err: any) {
        console.error(err)
        toast({ variant: "destructive", title: "Scan Gagal", description: "Pastikan gambar jelas dan coba lagi." })
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
      toast({ title: "Pendaftar berhasil ditambahkan" })
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
          <h1 className="text-3xl font-headline font-bold">Data Calon Murid</h1>
          <p className="text-muted-foreground mt-1">Kelola pendaftar baru sesuai standar Dapodik.</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={scanInputRef} onChange={handleScanForm} accept="image/*" className="hidden" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> Tambah Murid
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[850px] max-h-[90vh] p-0 flex flex-col">
              <DialogHeader className="p-6 pb-2 border-b flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="font-headline text-2xl">Formulir Pendaftaran Lengkap</DialogTitle>
                  <DialogDescription>Masukkan data sesuai identitas resmi atau gunakan Scan AI.</DialogDescription>
                </div>
                <Button onClick={() => scanInputRef.current?.click()} disabled={isScanning} variant="outline" className="gap-2 border-primary/50 text-primary">
                  {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  Scan AI
                </Button>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                  <ScrollArea className="flex-1 px-8 py-6">
                    <div className="space-y-8 pb-10">
                      {/* Bagian 1: Identitas Pribadi */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary border-b pb-1">
                          <User className="w-4 h-4" />
                          <h3 className="text-xs font-bold uppercase tracking-widest">I. Identitas Pribadi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Sesuai Akte" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Jenis Kelamin</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="NISN" render={({ field }) => (
                            <FormItem><FormLabel>NISN</FormLabel><FormControl><Input placeholder="10 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="NIK" render={({ field }) => (
                            <FormItem><FormLabel>NIK Murid</FormLabel><FormControl><Input placeholder="16 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="birthPlace" render={({ field }) => (
                            <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="birthDate" render={({ field }) => (
                            <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Bagian 2: Domisili & Transportasi */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary border-b pb-1">
                          <MapPin className="w-4 h-4" />
                          <h3 className="text-xs font-bold uppercase tracking-widest">II. Domisili & Transportasi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>Alamat Lengkap</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="livingWith" render={({ field }) => (
                            <FormItem><FormLabel>Tinggal Bersama</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Bersama Orang Tua">Bersama Orang Tua</SelectItem><SelectItem value="Wali">Wali</SelectItem><SelectItem value="Asrama">Asrama</SelectItem><SelectItem value="Kos">Kos</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="transportation" render={({ field }) => (
                            <FormItem><FormLabel>Transportasi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Jalan Kaki">Jalan Kaki</SelectItem><SelectItem value="Motor">Motor</SelectItem><SelectItem value="Mobil">Mobil</SelectItem><SelectItem value="Angkot/Kendaraan Umum">Angkot/Kendaraan Umum</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Bagian 3: Data Orang Tua & Pendaftaran */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary border-b pb-1">
                          <UsersIcon className="w-4 h-4" />
                          <h3 className="text-xs font-bold uppercase tracking-widest">III. Orang Tua & Registrasi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="parentName" render={({ field }) => (
                            <FormItem><FormLabel>Nama Ayah/Ibu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="parentPhone" render={({ field }) => (
                            <FormItem><FormLabel>No. HP Orang Tua</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="originSchool" render={({ field }) => (
                            <FormItem><FormLabel>Asal Sekolah (SD/MI)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="applicationPath" render={({ field }) => (
                            <FormItem><FormLabel>Jalur Pendaftaran</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Zonasi">Zonasi</SelectItem><SelectItem value="Prestasi">Prestasi</SelectItem><SelectItem value="Afirmasi">Afirmasi</SelectItem><SelectItem value="Perpindahan Orang Tua">Perpindahan Orang Tua</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="p-6 border-t bg-card">
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                      <Button type="submit" disabled={submitting}>Simpan Pendaftar</Button>
                    </DialogFooter>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow>
              <TableHead className="w-[50px]">No.</TableHead>
              <TableHead>NISN</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Asal Sekolah</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-24 text-muted-foreground italic">Tidak ada data murid ditemukan.</TableCell></TableRow>
            ) : filteredApplicants.map((applicant, idx) => (
              <TableRow key={applicant.id} className="hover:bg-muted/30">
                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-mono text-sm">{applicant.NISN}</TableCell>
                <TableCell className="font-medium">{applicant.fullName}</TableCell>
                <TableCell className="text-sm">{applicant.originSchool}</TableCell>
                <TableCell><Badge variant="outline" className={`${statusColorMap[applicant.verificationStatus]} text-[10px]`}>{applicant.verificationStatus}</Badge></TableCell>
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
