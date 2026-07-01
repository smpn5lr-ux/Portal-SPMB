
"use client"

import { useState, useMemo, useRef, useEffect } from 'react'
import { 
  Search, Plus, Loader2, Camera, Eye, User, Home, MapPin, Phone, Users as UsersIcon
} from "lucide-react"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from 'next/link'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, addDoc, limit, getDocs } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'
import { extractFormData } from '@/ai/flows/extract-form-data-flow'

const formSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap harus diisi"),
  gender: z.enum(['Laki-laki', 'Perempuan']),
  NISN: z.string().length(10, "NISN harus 10 digit"),
  NIK: z.string().length(16, "NIK harus 16 digit"),
  familyCardNumber: z.string().length(16, "No. KK harus 16 digit"),
  birthPlace: z.string().min(2, "Tempat lahir harus diisi"),
  birthDate: z.string().min(1, "Tanggal lahir harus diisi"),
  aktaLahirNumber: z.string().min(2, "No. Reg Akta Lahir harus diisi"),
  religion: z.string().min(1, "Agama harus dipilih"),
  address: z.string().min(5, "Alamat harus diisi"),
  rt: z.string().min(1, "RT harus diisi"),
  rw: z.string().min(1, "RW harus diisi"),
  kelurahan: z.string().min(2, "Kelurahan harus diisi"),
  kecamatan: z.string().min(2, "Kecamatan harus diisi"),
  propinsi: z.string().min(2, "Provinsi harus diisi"),
  livingWith: z.enum(['Bersama Orang Tua', 'Wali', 'Asrama', 'Kos']),
  transportation: z.enum(['Jalan Kaki', 'Motor', 'Mobil', 'Angkot/Kendaraan Umum']),
  childOrder: z.string().min(1, "Urutan anak harus diisi"),
  studentPhone: z.string().min(10, "No. HP Siswa minimal 10 digit"),
  numberOfSiblings: z.string().min(1, "Jumlah saudara harus diisi"),
  
  // Father Data
  fatherName: z.string().optional(),
  fatherNIK: z.string().optional(),
  fatherBirthYear: z.string().optional(),
  fatherEducation: z.string().optional(),
  fatherJob: z.string().optional(),
  fatherIncome: z.string().optional(),
  
  // Mother Data
  motherName: z.string().optional(),
  motherNIK: z.string().optional(),
  motherBirthYear: z.string().optional(),
  motherEducation: z.string().optional(),
  motherJob: z.string().optional(),
  motherIncome: z.string().optional(),
  
  // Guardian Data
  guardianName: z.string().optional(),
  guardianNIK: z.string().optional(),
  guardianBirthYear: z.string().optional(),
  guardianEducation: z.string().optional(),
  guardianJob: z.string().optional(),
  guardianIncome: z.string().optional(),

  // Required Metadata
  originSchool: z.string().min(2, "Asal sekolah harus diisi"),
  applicationPath: z.enum(['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']),
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
      fullName: "", gender: "Laki-laki", NISN: "", NIK: "", familyCardNumber: "",
      birthPlace: "", birthDate: "", aktaLahirNumber: "", religion: "Katolik",
      address: "", rt: "", rw: "", kelurahan: "", kecamatan: "", propinsi: "Jawa Barat",
      livingWith: "Bersama Orang Tua", transportation: "Jalan Kaki",
      childOrder: "1", studentPhone: "", numberOfSiblings: "0",
      originSchool: "", applicationPath: "Zonasi",
      fatherName: "", fatherNIK: "", fatherBirthYear: "", fatherEducation: "", fatherJob: "", fatherIncome: "",
      motherName: "", motherNIK: "", motherBirthYear: "", motherEducation: "", motherJob: "", motherIncome: "",
      guardianName: "", guardianNIK: "", guardianBirthYear: "", guardianEducation: "", guardianJob: "", guardianIncome: ""
    },
  })

  const watchLivingWith = form.watch("livingWith")

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'applicants'), orderBy('createdAt', 'desc'), limit(100))
  }, [db])

  const { data: applicants, loading } = useCollection<Applicant>(applicantsQuery)

  const filteredApplicants = useMemo(() => {
    if (!applicants) return []
    return applicants.filter(a => 
      a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || a.NISN.includes(searchTerm)
    )
  }, [applicants, searchTerm])

  const handleScanForm = async (fileInput: HTMLInputElement) => {
    const file = fileInput.files?.[0]
    if (!file) return
    setIsScanning(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      try {
        const result = await extractFormData({ photoDataUri: base64 })
        if (result) {
          Object.entries(result).forEach(([key, value]) => {
            if (value && key in form.getValues()) form.setValue(key as any, value)
          });
          toast({ title: "Scan Berhasil", description: "Hanya data yang terbaca jelas yang diisi otomatis." })
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Scan Gagal", description: "Gagal memproses gambar." })
      } finally {
        setIsScanning(false)
        fileInput.value = ''
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
      const nextSequence = snap.empty ? 1 : (Number(snap.docs[0].data().registrationSequence) || 0) + 1;
      
      const newApplicant = {
        ...values,
        childOrder: Number(values.childOrder),
        numberOfSiblings: Number(values.numberOfSiblings),
        parentName: values.livingWith === 'Wali' ? (values.guardianName || "") : (values.fatherName || ""),
        parentPhone: values.studentPhone, 
        registrationNumber: `REG-2024-${nextSequence.toString().padStart(4, '0')}`,
        registrationSequence: nextSequence,
        verificationStatus: 'Belum Diverifikasi',
        admissionStatus: 'pending',
        createdAt: new Date().toISOString(),
      }

      await addDoc(collection(db, 'applicants'), newApplicant)
      setIsDialogOpen(false)
      form.reset()
      toast({ title: "Pendaftar Berhasil Ditambahkan" })
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'applicants', operation: 'create' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Data Calon Murid</h1>
          <p className="text-muted-foreground mt-1">Manajemen data pendaftaran murid baru sesuai standar Dapodik.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Murid Baru</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[850px] h-[90vh] p-0 flex flex-col overflow-hidden border-border/50">
            <DialogHeader className="p-6 pb-2 border-b flex flex-row items-center justify-between shrink-0">
              <div>
                <DialogTitle className="text-2xl font-headline">Formulir Pendaftaran</DialogTitle>
                <DialogDescription>Input data murid baru atau gunakan Scan AI untuk mempercepat pengisian.</DialogDescription>
              </div>
              <Button onClick={() => scanInputRef.current?.click()} disabled={isScanning} variant="outline" size="sm" className="gap-2 border-primary/20 text-primary">
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Scan AI
              </Button>
            </DialogHeader>
            <input type="file" ref={scanInputRef} onChange={(e) => handleScanForm(e.target)} accept="image/*" className="hidden" />
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 px-8">
                  <div className="py-6 space-y-10">
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <User className="w-5 h-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">A. Data Murid Baru</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                          <FormItem className="md:col-span-2"><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="SESUAI IJAZAH" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
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
                          <FormItem><FormLabel>No. Kartu Keluarga (KK)</FormLabel><FormControl><Input placeholder="16 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="birthPlace" render={({ field }) => (
                          <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="birthDate" render={({ field }) => (
                          <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="aktaLahirNumber" render={({ field }) => (
                          <FormItem><FormLabel>No. Reg Akta Lahir</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="religion" render={({ field }) => (
                          <FormItem><FormLabel>Agama</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Katolik">Katolik</SelectItem><SelectItem value="Islam">Islam</SelectItem><SelectItem value="Kristen">Kristen</SelectItem><SelectItem value="Hindu">Hindu</SelectItem><SelectItem value="Budha">Budha</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                      </div>
                    </section>
                    
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Home className="w-5 h-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">B. Alamat Tinggal</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="address" render={({ field }) => (
                          <FormItem className="md:col-span-3"><FormLabel>Alamat Lengkap (Jl / Dusun)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="rt" render={({ field }) => (
                          <FormItem><FormLabel>RT</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="rw" render={({ field }) => (
                          <FormItem><FormLabel>RW</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="kelurahan" render={({ field }) => (
                          <FormItem><FormLabel>Desa / Kelurahan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="kecamatan" render={({ field }) => (
                          <FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="propinsi" render={({ field }) => (
                          <FormItem><FormLabel>Provinsi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="livingWith" render={({ field }) => (
                          <FormItem><FormLabel>Tempat Tinggal</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Bersama Orang Tua">Tinggal Bersama Orang Tua</SelectItem><SelectItem value="Wali">Wali</SelectItem><SelectItem value="Asrama">Asrama</SelectItem><SelectItem value="Kos">Kos</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Phone className="w-5 h-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">C. Kontak & Lainnya</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="transportation" render={({ field }) => (
                          <FormItem><FormLabel>Moda Transportasi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Jalan Kaki">Jalan Kaki</SelectItem><SelectItem value="Motor">Motor</SelectItem><SelectItem value="Mobil">Mobil</SelectItem><SelectItem value="Angkot/Kendaraan Umum">Angkot/Kendaraan Umum</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="studentPhone" render={({ field }) => (
                          <FormItem><FormLabel>No. HP Siswa</FormLabel><FormControl><Input placeholder="08xxxx" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="childOrder" render={({ field }) => (
                          <FormItem><FormLabel>Anak Ke-</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="numberOfSiblings" render={({ field }) => (
                          <FormItem><FormLabel>Jumlah Saudara</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <UsersIcon className="w-5 h-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">
                          {watchLivingWith === 'Wali' ? 'D. Data Wali' : 'D. Data Orang Tua'}
                        </h3>
                      </div>
                      
                      {watchLivingWith !== 'Wali' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="fatherName" render={({ field }) => (
                              <FormItem><FormLabel>Nama Ayah Kandung</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="fatherNIK" render={({ field }) => (
                              <FormItem><FormLabel>NIK Ayah</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="fatherBirthYear" render={({ field }) => (
                              <FormItem><FormLabel>Tahun Lahir Ayah</FormLabel><FormControl><Input placeholder="YYYY" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="fatherEducation" render={({ field }) => (
                              <FormItem><FormLabel>Pendidikan Ayah</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="fatherJob" render={({ field }) => (
                              <FormItem><FormLabel>Pekerjaan Ayah</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="fatherIncome" render={({ field }) => (
                              <FormItem><FormLabel>Penghasilan Ayah</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                          </div>
                          <Separator className="bg-border/30" />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="motherName" render={({ field }) => (
                              <FormItem><FormLabel>Nama Ibu Kandung</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="motherNIK" render={({ field }) => (
                              <FormItem><FormLabel>NIK Ibu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="motherBirthYear" render={({ field }) => (
                              <FormItem><FormLabel>Tahun Lahir Ibu</FormLabel><FormControl><Input placeholder="YYYY" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="motherEducation" render={({ field }) => (
                              <FormItem><FormLabel>Pendidikan Ibu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="motherJob" render={({ field }) => (
                              <FormItem><FormLabel>Pekerjaan Ibu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="motherIncome" render={({ field }) => (
                              <FormItem><FormLabel>Penghasilan Ibu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                          <FormField control={form.control} name="guardianName" render={({ field }) => (
                            <FormItem><FormLabel>Nama Wali</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianNIK" render={({ field }) => (
                            <FormItem><FormLabel>NIK Wali</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianBirthYear" render={({ field }) => (
                            <FormItem><FormLabel>Tahun Lahir Wali</FormLabel><FormControl><Input placeholder="YYYY" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianEducation" render={({ field }) => (
                            <FormItem><FormLabel>Pendidikan Wali</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianJob" render={({ field }) => (
                            <FormItem><FormLabel>Pekerjaan Wali</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianIncome" render={({ field }) => (
                            <FormItem><FormLabel>Penghasilan Wali</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      )}
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <MapPin className="w-5 h-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">E. Jalur & Asal Sekolah</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="originSchool" render={({ field }) => (
                          <FormItem><FormLabel>Asal Sekolah Dasar (SD/MI)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="applicationPath" render={({ field }) => (
                          <FormItem><FormLabel>Jalur Pendaftaran</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Zonasi">Zonasi</SelectItem><SelectItem value="Prestasi">Prestasi</SelectItem><SelectItem value="Afirmasi">Afirmasi</SelectItem><SelectItem value="Perpindahan Orang Tua">Perpindahan Orang Tua</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                      </div>
                    </section>
                  </div>
                </ScrollArea>
                <DialogFooter className="p-6 border-t bg-muted/20 shrink-0">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Data Pendaftar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari Nama atau NISN..." className="pl-9 bg-muted/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow>
              <TableHead className="font-bold text-primary">NISN</TableHead>
              <TableHead className="font-bold text-primary">Nama Lengkap</TableHead>
              <TableHead className="font-bold text-primary">Asal Sekolah</TableHead>
              <TableHead className="font-bold text-primary">Jalur</TableHead>
              <TableHead className="font-bold text-primary">Status</TableHead>
              <TableHead className="text-right font-bold text-primary">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Tidak ada pendaftar ditemukan.</TableCell></TableRow>
            ) : filteredApplicants.map((applicant) => (
              <TableRow key={applicant.id} className="hover:bg-muted/10 transition-colors">
                <TableCell className="font-mono text-xs">{applicant.NISN}</TableCell>
                <TableCell className="font-medium">{applicant.fullName}</TableCell>
                <TableCell className="text-sm">{applicant.originSchool}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase">{applicant.applicationPath}</Badge></TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold ${
                    applicant.verificationStatus === 'Lengkap' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    applicant.verificationStatus === 'Ditolak' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>
                    {applicant.verificationStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild className="hover:text-primary"><Link href={`/dashboard/applicants/${applicant.id}`}><Eye className="w-4 h-4" /></Link></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
