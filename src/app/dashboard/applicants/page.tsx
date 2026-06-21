
"use client"

import { useState, useMemo, useRef } from 'react'
import { 
  Search, Plus, Loader2, Camera, Download, User, MapPin, Briefcase, Eye 
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
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from 'next/link'
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, orderBy, addDoc, limit, getDocs, doc } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'
import { extractFormData } from '@/ai/flows/extract-form-data-flow'

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
  parentName: z.string().min(2, "Nama orang tua harus diisi"),
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
      fullName: "", NISN: "", NIK: "", familyCardNumber: "", originSchool: "",
      applicationPath: "Zonasi", gender: "Laki-laki", birthPlace: "", birthDate: "",
      religion: "Islam", address: "", parentName: "", parentPhone: "",
      livingWith: "Bersama Orang Tua", transportation: "Jalan Kaki",
    },
  })

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
            if (value && key in form.getValues()) form.setValue(key as any, value)
          });
          toast({ title: "Scan Berhasil", description: "Hanya data yang terbaca jelas yang diisi otomatis." })
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Scan Gagal", description: "Pastikan gambar tajam." })
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
          <p className="text-muted-foreground mt-1">Kelola data murid baru standar Dapodik.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Murid Baru</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 flex flex-col">
            <DialogHeader className="p-6 pb-2 border-b flex flex-row items-center justify-between">
              <div>
                <DialogTitle>Formulir Pendaftaran</DialogTitle>
                <DialogDescription>Gunakan Scan AI untuk membaca formulir manual.</DialogDescription>
              </div>
              <Button onClick={() => scanInputRef.current?.click()} disabled={isScanning} variant="outline" size="sm" className="gap-2">
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Scan AI
              </Button>
            </DialogHeader>
            <input type="file" ref={scanInputRef} onChange={handleScanForm} accept="image/*" className="hidden" />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 px-8 py-6">
                  <div className="space-y-8">
                    <section className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b pb-1">I. Identitas Murid</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                          <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="SESUAI IJAZAH" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                          <FormItem><FormLabel>Jenis Kelamin</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="NISN" render={({ field }) => (
                          <FormItem><FormLabel>NISN (10 Digit)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="NIK" render={({ field }) => (
                          <FormItem><FormLabel>NIK (16 Digit)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b pb-1">II. Alamat & Orang Tua</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="address" render={({ field }) => (
                          <FormItem className="md:col-span-2"><FormLabel>Alamat Rumah</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="parentName" render={({ field }) => (
                          <FormItem><FormLabel>Nama Orang Tua/Wali</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="parentPhone" render={({ field }) => (
                          <FormItem><FormLabel>No. HP Aktif</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b pb-1">III. Registrasi Sekolah</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="originSchool" render={({ field }) => (
                          <FormItem><FormLabel>Asal Sekolah (SD/MI)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="applicationPath" render={({ field }) => (
                          <FormItem><FormLabel>Jalur Pendaftaran</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Zonasi">Zonasi</SelectItem><SelectItem value="Prestasi">Prestasi</SelectItem><SelectItem value="Afirmasi">Afirmasi</SelectItem><SelectItem value="Perpindahan Orang Tua">Perpindahan Orang Tua</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                      </div>
                    </section>
                  </div>
                </ScrollArea>
                <DialogFooter className="p-6 border-t bg-muted/20">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Data
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari Nama atau NISN..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Tidak ada pendaftar.</TableCell></TableRow>
            ) : filteredApplicants.map((applicant) => (
              <TableRow key={applicant.id}>
                <TableCell className="font-mono text-xs">{applicant.NISN}</TableCell>
                <TableCell className="font-medium">{applicant.fullName}</TableCell>
                <TableCell className="text-sm">{applicant.originSchool}</TableCell>
                <TableCell><Badge variant="outline">{applicant.applicationPath}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] uppercase font-bold">{applicant.verificationStatus}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/applicants/${applicant.id}`}><Eye className="w-4 h-4" /></Link></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
