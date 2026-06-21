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
  School
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
import * as XLSX from 'xlsx'

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
  originSchoolAddress: z.string().optional(),
  originSchoolKelurahan: z.string().optional(),
  originSchoolKecamatan: z.string().optional(),
  originSchoolProvinsi: z.string().optional(),
  usParticipantNumber: z.string().optional(),
  ijazahSerialNumber: z.string().optional(),
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
  propinsi: z.string().optional(),
  parentName: z.string().min(2, "Nama pendaftar harus diisi"),
  parentPhone: z.string().min(10, "No. Telepon minimal 10 digit"),
  parentEmail: z.string().email("Email tidak valid").optional().or(z.literal('')),
  academicScore: z.string().optional(),
  distanceToSchoolKm: z.string().optional(),
  livingWith: z.enum(['Bersama Orang Tua', 'Wali', 'Asrama', 'Kos']),
  transportation: z.enum(['Jalan Kaki', 'Motor', 'Mobil', 'Angkot/Kendaraan Umum']),
  hobbies: z.string().optional(),
  studentPhone: z.string().optional(),
  registrantRelationship: z.string().optional(),
  
  // Data Ayah
  fatherName: z.string().optional(),
  fatherNIK: z.string().optional(),
  fatherBirthYear: z.string().optional(),
  fatherEducation: z.string().optional(),
  fatherOccupation: z.string().optional(),
  fatherIncome: z.string().optional(),
  
  // Data Ibu
  motherName: z.string().optional(),
  motherNIK: z.string().optional(),
  motherBirthYear: z.string().optional(),
  motherEducation: z.string().optional(),
  motherOccupation: z.string().optional(),
  motherIncome: z.string().optional(),
  
  // Data Wali
  guardianName: z.string().optional(),
  guardianNIK: z.string().optional(),
  guardianBirthYear: z.string().optional(),
  guardianEducation: z.string().optional(),
  guardianOccupation: z.string().optional(),
  guardianIncome: z.string().optional(),
  
  numberOfSiblings: z.string().optional(),
  childOrder: z.string().optional(),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  travelTimeMinutes: z.string().optional(),
  welfareType: z.string().optional(),
  welfareCardNumber: z.string().optional(),
  welfareCardName: z.string().optional(),
  registrationType: z.enum(['Murid Baru', 'Mutasi', 'Mengulang']).default('Murid Baru'),
})

const EDUCATION_OPTIONS = ['Tidak Sekolah', 'SD', 'SMP', 'SMA', 'S1', 'S2', 'S3']
const OCCUPATION_OPTIONS = ['Tidak bekerja', 'Petani/Nelayan', 'ASN', 'Peg. swasta', 'Pengusaha', 'Pensiun']
const INCOME_OPTIONS = ['< Rp. 500,000', 'Rp. 500,000 - 999,999', 'Rp. 1,000,000 - Rp. 3,000,000', 'Rp. 3,000,000 - 5,000,000']

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
      originSchoolAddress: "",
      originSchoolKelurahan: "",
      originSchoolKecamatan: "",
      originSchoolProvinsi: "",
      usParticipantNumber: "",
      ijazahSerialNumber: "",
      applicationPath: "Zonasi",
      gender: "Laki-laki",
      birthPlace: "",
      birthDate: "",
      religion: "Katolik",
      address: "",
      rt: "",
      rw: "",
      kelurahan: "",
      kecamatan: "",
      propinsi: "",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      academicScore: "",
      distanceToSchoolKm: "",
      livingWith: "Bersama Orang Tua",
      transportation: "Jalan Kaki",
      hobbies: "",
      studentPhone: "",
      registrantRelationship: "Ayah",
      fatherName: "",
      fatherNIK: "",
      fatherBirthYear: "",
      fatherEducation: "SMP",
      fatherOccupation: "Petani/Nelayan",
      fatherIncome: "Rp. 1,000,000 - Rp. 3,000,000",
      motherName: "",
      motherNIK: "",
      motherBirthYear: "",
      motherEducation: "SMP",
      motherOccupation: "Tidak bekerja",
      motherIncome: "< Rp. 500,000",
      guardianName: "",
      guardianNIK: "",
      guardianBirthYear: "",
      guardianEducation: "",
      guardianOccupation: "",
      guardianIncome: "",
      numberOfSiblings: "1",
      childOrder: "1",
      heightCm: "",
      weightKg: "",
      travelTimeMinutes: "",
      welfareType: "PIP",
      welfareCardNumber: "",
      welfareCardName: "",
      registrationType: "Murid Baru",
    },
  })

  const livingWithWatcher = form.watch('livingWith')
  const relationshipWatcher = form.watch('registrantRelationship')
  const showGuardianInfo = livingWithWatcher === 'Wali' || relationshipWatcher === 'Wali'

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

    // Cek ukuran file (Max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File Terlalu Besar", description: "Maksimal ukuran foto adalah 10MB." })
      return
    }

    setIsScanning(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      try {
        const result = await extractFormData({ photoDataUri: base64 })
        if (result) {
          // Hanya set nilai jika ada data yang terbaca
          Object.entries(result).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "" && key in form.getValues()) {
              form.setValue(key as any, value)
            }
          });
          toast({ title: "Scan Berhasil", description: "Data yang terbaca telah dimasukkan ke formulir." })
        } else {
          toast({ variant: "destructive", title: "Scan Kosong", description: "AI tidak dapat menemukan data yang jelas. Coba foto ulang." })
        }
      } catch (err: any) {
        console.error("Scan error:", err)
        toast({ 
          variant: "destructive", 
          title: "Scan Gagal", 
          description: "Gagal memproses gambar. Pastikan koneksi stabil dan foto tidak buram." 
        })
      } finally {
        setIsScanning(false)
        if (scanInputRef.current) scanInputRef.current.value = ''
      }
    }
    reader.onerror = () => {
      setIsScanning(false)
      toast({ variant: "destructive", title: "Gagal Membaca File", description: "Terjadi kesalahan saat membaca file gambar." })
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
        academicScore: parseFloat(values.academicScore || "0"),
        distanceToSchoolKm: parseFloat(values.distanceToSchoolKm || "0"),
        heightCm: parseFloat(values.heightCm || "0"),
        weightKg: parseFloat(values.weightKg || "0"),
        verificationStatus: 'Belum Diverifikasi',
        admissionStatus: 'pending',
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      })
      setIsDialogOpen(false)
      form.reset()
      toast({ title: "Data Berhasil Disimpan" })
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
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" ref={scanInputRef} onChange={handleScanForm} accept="image/*" className="hidden" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary"><Plus className="w-4 h-4" /> Tambah Murid</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1000px] h-[95vh] p-0 flex flex-col">
              <DialogHeader className="p-6 pb-2 border-b flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="font-headline text-2xl">Formulir Pendaftaran</DialogTitle>
                  <DialogDescription>Lengkapi data sesuai standar Dapodik (Hasil Scan Manual).</DialogDescription>
                </div>
                <Button onClick={() => scanInputRef.current?.click()} disabled={isScanning} variant="outline" className="gap-2 border-primary/50 text-primary">
                  {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  Scan Formulir AI
                </Button>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                  <ScrollArea className="flex-1 px-8 py-6">
                    <div className="space-y-10 pb-10">
                      {/* Bagian 1: Identitas Pribadi */}
                      <div className="space-y-4">
                        <h3 className="font-bold uppercase tracking-widest text-sm text-primary flex items-center gap-2"><User className="w-4 h-4" /> Bagian 1: Identitas Pribadi</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10 p-6 rounded-2xl border">
                          <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Sesuai Akte" {...field} /></FormControl><FormMessage /></FormItem>
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
                          <FormField control={form.control} name="familyCardNumber" render={({ field }) => (
                            <FormItem><FormLabel>No. Kartu Keluarga</FormLabel><FormControl><Input placeholder="16 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="birthPlace" render={({ field }) => (
                            <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Kota/Kab" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="birthDate" render={({ field }) => (
                            <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="aktaLahirNumber" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>No. Reg Akta Lahir</FormLabel><FormControl><Input placeholder="Sesuai Akta Lahir" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="religion" render={({ field }) => (
                            <FormItem><FormLabel>Agama</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Katolik">Katolik</SelectItem><SelectItem value="Islam">Islam</SelectItem><SelectItem value="Kristen">Kristen</SelectItem><SelectItem value="Hindu">Hindu</SelectItem><SelectItem value="Budha">Budha</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Bagian 2: Sekolah Asal */}
                      <div className="space-y-4">
                        <h3 className="font-bold uppercase tracking-widest text-sm text-cyan-500 flex items-center gap-2"><School className="w-4 h-4" /> Bagian 2: Sekolah Asal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-muted/10 p-6 rounded-2xl border">
                          <FormField control={form.control} name="originSchool" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>Nama SD Asal</FormLabel><FormControl><Input placeholder="Contoh: SDN Menteng 01" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="originSchoolAddress" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>Alamat Sekolah</FormLabel><FormControl><Input placeholder="Jl. Raya..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="originSchoolKelurahan" render={({ field }) => (
                            <FormItem><FormLabel>Kelurahan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="originSchoolKecamatan" render={({ field }) => (
                            <FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="originSchoolProvinsi" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>Provinsi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="usParticipantNumber" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>No. Peserta US (Sesuai Ijazah)</FormLabel><FormControl><Input placeholder="Masukkan nomor peserta..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="ijazahSerialNumber" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>No. Seri Ijazah</FormLabel><FormControl><Input placeholder="Masukkan nomor seri..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Alamat & Tempat Tinggal */}
                      <div className="space-y-4">
                        <h3 className="font-bold uppercase tracking-widest text-sm text-amber-500 flex items-center gap-2"><MapPin className="w-4 h-4" /> Bagian 3: Alamat & Domisili</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-muted/10 p-6 rounded-2xl border">
                          <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem className="md:col-span-4"><FormLabel>Alamat Lengkap</FormLabel><FormControl><Input placeholder="Nama Jalan / Kampung" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="rt" render={({ field }) => (
                            <FormItem><FormLabel>RT</FormLabel><FormControl><Input placeholder="00" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="rw" render={({ field }) => (
                            <FormItem><FormLabel>RW</FormLabel><FormControl><Input placeholder="00" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="kelurahan" render={({ field }) => (
                            <FormItem><FormLabel>Kelurahan/Desa</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="kecamatan" render={({ field }) => (
                            <FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="propinsi" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>Provinsi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="livingWith" render={({ field }) => (
                            <FormItem className="md:col-span-1"><FormLabel>Tempat Tinggal</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Bersama Orang Tua">Bersama Orang Tua</SelectItem><SelectItem value="Wali">Wali</SelectItem><SelectItem value="Asrama">Asrama</SelectItem><SelectItem value="Kos">Kos</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="transportation" render={({ field }) => (
                            <FormItem className="md:col-span-1"><FormLabel>Transportasi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Jalan Kaki">Jalan Kaki</SelectItem><SelectItem value="Motor">Motor</SelectItem><SelectItem value="Mobil">Mobil</SelectItem><SelectItem value="Angkot/Kendaraan Umum">Angkot/Kendaraan Umum</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Data Periodik & Kontak */}
                      <div className="space-y-4">
                        <h3 className="font-bold uppercase tracking-widest text-sm text-green-500 flex items-center gap-2"><Scale className="w-4 h-4" /> Bagian 4: Data Periodik & Kontak</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10 p-6 rounded-2xl border">
                          <FormField control={form.control} name="childOrder" render={({ field }) => (
                            <FormItem><FormLabel>Anak Ke-</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="studentPhone" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>No. HP Siswa</FormLabel><FormControl><Input placeholder="08..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="heightCm" render={({ field }) => (
                            <FormItem><FormLabel>Tinggi Badan (cm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="weightKg" render={({ field }) => (
                            <FormItem><FormLabel>Berat Badan (kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="travelTimeMinutes" render={({ field }) => (
                            <FormItem><FormLabel>Waktu Tempuh (menit)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Data Orang Tua */}
                      <div className="space-y-4">
                        <h3 className="font-bold uppercase tracking-widest text-sm text-pink-500 flex items-center gap-2"><UsersIcon className="w-4 h-4" /> Bagian 5: Data Orang Tua / Wali</h3>
                        <div className="space-y-6">
                          {/* AYAH */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10 p-6 rounded-2xl border">
                             <div className="md:col-span-3 flex items-center gap-2 border-b pb-2 mb-2">
                               <Badge className="bg-primary/20 text-primary border-none">AYAH KANDUNG</Badge>
                             </div>
                             <FormField control={form.control} name="fatherName" render={({ field }) => (
                                <FormItem className="md:col-span-1"><FormLabel>Nama Ayah</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="fatherNIK" render={({ field }) => (
                                <FormItem><FormLabel>NIK Ayah</FormLabel><FormControl><Input placeholder="16 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="fatherBirthYear" render={({ field }) => (
                                <FormItem><FormLabel>Tahun Lahir</FormLabel><FormControl><Input placeholder="Contoh: 1980" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="fatherEducation" render={({ field }) => (
                                <FormItem><FormLabel>Pendidikan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{EDUCATION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="fatherOccupation" render={({ field }) => (
                                <FormItem><FormLabel>Pekerjaan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{OCCUPATION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="fatherIncome" render={({ field }) => (
                                <FormItem><FormLabel>Penghasilan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{INCOME_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                             )} />
                          </div>

                          {/* IBU */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10 p-6 rounded-2xl border">
                             <div className="md:col-span-3 flex items-center gap-2 border-b pb-2 mb-2">
                               <Badge className="bg-pink-500/20 text-pink-500 border-none">IBU KANDUNG</Badge>
                             </div>
                             <FormField control={form.control} name="motherName" render={({ field }) => (
                                <FormItem className="md:col-span-1"><FormLabel>Nama Ibu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="motherNIK" render={({ field }) => (
                                <FormItem><FormLabel>NIK Ibu</FormLabel><FormControl><Input placeholder="16 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="motherBirthYear" render={({ field }) => (
                                <FormItem><FormLabel>Tahun Lahir</FormLabel><FormControl><Input placeholder="Contoh: 1985" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="motherEducation" render={({ field }) => (
                                <FormItem><FormLabel>Pendidikan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{EDUCATION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="motherOccupation" render={({ field }) => (
                                <FormItem><FormLabel>Pekerjaan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{OCCUPATION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="motherIncome" render={({ field }) => (
                                <FormItem><FormLabel>Penghasilan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{INCOME_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                             )} />
                          </div>
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
              <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /><p className="text-xs text-muted-foreground mt-2">Memuat data murid...</p></TableCell></TableRow>
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
                <TableCell className="text-right"><Button variant="ghost" size="icon" asChild><Link href={`/dashboard/applicants/${applicant.id}`}><Eye className="w-4 h-4" /></Link></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}