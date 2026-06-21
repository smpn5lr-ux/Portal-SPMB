
"use client"

import { useState, useMemo, useRef } from 'react'
import { 
  Search, 
  FileUp, 
  Plus, 
  Eye, 
  Loader2,
  User,
  Home,
  Users as UsersIcon,
  GraduationCap,
  Info,
  Layers,
  Smartphone,
  FileDown,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Camera,
  Mail,
  Scale,
  Clock,
  MapPin,
  ClipboardList,
  Heart,
  Briefcase,
  Wallet,
  Phone,
  School,
  FileText,
  Download
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
  parentName: z.string().min(2, "Nama pendaftar harus diisi"),
  parentPhone: z.string().min(10, "No. Telepon minimal 10 digit"),
  academicScore: z.string().optional(),
  distanceToSchoolKm: z.string().optional(),
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
      religion: "Katolik",
      address: "",
      parentName: "",
      parentPhone: "",
      academicScore: "",
      distanceToSchoolKm: "",
      livingWith: "Bersama Orang Tua",
      transportation: "Jalan Kaki",
    },
  })

  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'system')
  }, [db])

  const { data: systemSettings } = useDoc<any>(settingsRef)

  const handleDownloadForm = async (applicant: Applicant) => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    
    const doc = new jsPDF()
    const schoolName = systemSettings?.schoolName || "PORTAL SPMB"
    const dinasName = systemSettings?.dinasName || "DINAS PENDIDIKAN"
    const academicYear = systemSettings?.academicYear || "2024/2025"

    // Kop Surat
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text(dinasName.toUpperCase(), 105, 15, { align: "center" })
    doc.setFontSize(16)
    doc.text(schoolName.toUpperCase(), 105, 23, { align: "center" })
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(`FORMULIR PENDAFTARAN MURID BARU TAHUN AJARAN ${academicYear}`, 105, 30, { align: "center" })
    doc.line(20, 33, 190, 33)

    // Data Utama
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("I. IDENTITAS CALON MURID", 20, 45)
    
    const dataSiswa = [
      ["Nama Lengkap", applicant.fullName],
      ["NISN", applicant.NISN],
      ["NIK", applicant.NIK],
      ["Tempat, Tgl Lahir", `${applicant.birthPlace}, ${applicant.birthDate}`],
      ["Jenis Kelamin", applicant.gender],
      ["Agama", applicant.religion],
      ["Alamat", applicant.address],
      ["Sekolah Asal", applicant.originSchool],
      ["Jalur Pendaftaran", applicant.applicationPath],
      ["No. Urut Pendaftaran", `#${applicant.registrationSequence || '-'}`]
    ]

    autoTable(doc, {
      body: dataSiswa,
      startY: 50,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    })

    // Data Orang Tua
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFont("helvetica", "bold")
    doc.text("II. DATA ORANG TUA / WALI", 20, finalY)

    const dataOrtu = [
      ["Nama Orang Tua/Wali", applicant.parentName || '-'],
      ["No. HP Orang Tua", applicant.parentPhone]
    ]

    autoTable(doc, {
      body: dataOrtu,
      startY: finalY + 5,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    })

    // Tanda Tangan
    const signY = (doc as any).lastAutoTable.finalY + 25
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 140, signY - 15)
    doc.text("Orang Tua / Wali Murid", 20, signY)
    doc.text("Panitia PPDB", 140, signY)
    doc.text("(............................)", 20, signY + 30)
    doc.text("(............................)", 140, signY + 30)

    doc.save(`Formulir_Pendaftaran_${applicant.fullName}.pdf`)
    toast({ title: "Formulir berhasil diunduh" })
  }

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'applicants'), orderBy('registrationSequence', 'asc'), limit(200))
  }, [db])

  const { data: applicants, loading } = useCollection<Applicant>(applicantsQuery)

  const filteredApplicants = useMemo(() => {
    if (!applicants) return []
    return applicants.filter(a => 
      a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.NISN.includes(searchTerm)
    )
  }, [applicants, searchTerm])

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
          toast({ title: "Scan Berhasil", description: "Hanya data yang terbaca jelas yang diisi." })
        }
      } catch (err: any) {
        console.error(err)
        toast({ variant: "destructive", title: "Scan Gagal", description: "Gagal memproses gambar." })
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
      await addDoc(collection(db, 'applicants'), {
        ...values,
        registrationNumber: `REG-2024-${nextSequence.toString().padStart(4, '0')}`,
        registrationSequence: nextSequence,
        verificationStatus: 'Belum Diverifikasi',
        admissionStatus: 'pending',
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      })
      setIsDialogOpen(false)
      form.reset()
      toast({ title: "Data berhasil disimpan" })
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
              <Button className="gap-2 bg-primary shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> Tambah Murid</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] h-[90vh] p-0 flex flex-col">
              <DialogHeader className="p-6 pb-2 border-b flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="font-headline text-2xl">Formulir Pendaftaran</DialogTitle>
                  <DialogDescription>Isi data secara manual atau gunakan fitur Scan AI.</DialogDescription>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          <FormItem><FormLabel>NIK</FormLabel><FormControl><Input placeholder="16 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="birthPlace" render={({ field }) => (
                          <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="birthDate" render={({ field }) => (
                          <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="religion" render={({ field }) => (
                          <FormItem><FormLabel>Agama</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Katolik">Katolik</SelectItem><SelectItem value="Islam">Islam</SelectItem><SelectItem value="Kristen">Kristen</SelectItem><SelectItem value="Hindu">Hindu</SelectItem><SelectItem value="Budha">Budha</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="originSchool" render={({ field }) => (
                          <FormItem><FormLabel>Asal Sekolah (SD/MI)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
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
              <TableHead className="w-[100px]">No. Urut</TableHead>
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
              <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-24 text-muted-foreground italic">Tidak ada data murid ditemukan.</TableCell></TableRow>
            ) : filteredApplicants.map((applicant, idx) => (
              <TableRow key={applicant.id} className="hover:bg-muted/30">
                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-bold text-primary">#{applicant.registrationSequence || '-'}</TableCell>
                <TableCell className="font-mono text-sm">{applicant.NISN}</TableCell>
                <TableCell className="font-medium">{applicant.fullName}</TableCell>
                <TableCell>{applicant.originSchool}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{applicant.applicationPath}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={`${statusColorMap[applicant.verificationStatus]} text-[10px]`}>{applicant.verificationStatus}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadForm(applicant)} title="Unduh Formulir">
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
