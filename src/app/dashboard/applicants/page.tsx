
"use client"

import { useState, useMemo } from 'react'
import { 
  Search, 
  FileDown, 
  FileUp, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  CheckCircle,
  FileText,
  Loader2,
  User,
  Home,
  Users as UsersIcon,
  GraduationCap,
  Sparkles,
  Info,
  Layers,
  Heart,
  Briefcase,
  Smartphone
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
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
import { Separator } from "@/components/ui/separator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from 'next/link'
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, orderBy, addDoc, serverTimestamp, limit, doc } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'

const statusColorMap: Record<string, string> = {
  'Belum Diverifikasi': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Lengkap': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Perlu Perbaikan': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Ditolak': 'bg-destructive/10 text-destructive border-destructive/20',
}

const pathColorMap: Record<string, string> = {
  'Zonasi': 'text-primary border-primary/20',
  'Prestasi': 'text-cyan-500 border-cyan-500/20',
  'Afirmasi': 'text-pink-500 border-pink-500/20',
  'Perpindahan Orang Tua': 'text-purple-500 border-purple-500/20',
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
  parentName: z.string().min(2, "Nama orang tua/wali harus diisi"),
  parentPhone: z.string().min(10, "No. Telepon minimal 10 digit"),
  academicScore: z.string().optional(),
  distanceToSchoolKm: z.string().optional(),
  
  livingWith: z.string().optional(),
  transportation: z.string().optional(),
  hobbies: z.string().optional(),
  registrantRelationship: z.string().optional(),
  fatherName: z.string().optional(),
  fatherNIK: z.string().length(16, "NIK Ayah harus 16 digit").or(z.string().length(0)),
  fatherOccupation: z.string().optional(),
  motherName: z.string().optional(),
  motherNIK: z.string().length(16, "NIK Ibu harus 16 digit").or(z.string().length(0)),
  motherOccupation: z.string().optional(),
  numberOfSiblings: z.string().optional(),
  childOrder: z.string().optional(),
})

export default function ApplicantsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const db = useFirestore()

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, 'applicants'), 
      orderBy('createdAt', 'desc'),
      limit(50) 
    )
  }, [db])

  const schoolsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'schools')
  }, [db])

  const { data: applicants, loading } = useCollection<Applicant>(applicantsQuery)
  const { data: schoolsData } = useDoc<any>(schoolsRef)

  const schoolSuggestions = useMemo(() => {
    return schoolsData?.list || []
  }, [schoolsData])

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
      academicScore: "0",
      distanceToSchoolKm: "0",
      livingWith: "Bersama Orang Tua",
      transportation: "Jalan Kaki",
      hobbies: "",
      registrantRelationship: "Ayah",
      fatherName: "",
      fatherNIK: "",
      fatherOccupation: "",
      motherName: "",
      motherNIK: "",
      motherOccupation: "",
      numberOfSiblings: "1",
      childOrder: "1",
    },
  })

  const filteredApplicants = useMemo(() => {
    if (!applicants) return []
    return applicants.filter(a => 
      a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.NISN.includes(searchTerm)
    )
  }, [applicants, searchTerm])

  function calculateAge(birthDate: string): number {
    if (!birthDate) return 0
    const birth = new Date(birthDate)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!db || submitting) return

    setSubmitting(true)
    const registrationNumber = `REG-2024-${Math.floor(1000 + Math.random() * 9000)}`
    const ageYears = calculateAge(values.birthDate)
    
    const newApplicant = {
      ...values,
      registrationNumber,
      ageYears,
      academicScore: values.academicScore ? parseFloat(values.academicScore) : 0,
      distanceToSchoolKm: values.distanceToSchoolKm ? parseFloat(values.distanceToSchoolKm) : 0,
      numberOfSiblings: values.numberOfSiblings ? parseInt(values.numberOfSiblings) : 1,
      childOrder: values.childOrder ? parseInt(values.childOrder) : 1,
      verificationStatus: 'Belum Diverifikasi',
      admissionStatus: 'pending',
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
      documents: []
    }

    addDoc(collection(db, 'applicants'), newApplicant)
      .then(() => {
        setIsDialogOpen(false)
        form.reset()
        toast({
          title: "Berhasil!",
          description: `Data ${values.fullName} telah disimpan ke sistem.`,
        })
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'applicants',
          operation: 'create',
          requestResourceData: newApplicant
        }))
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Data Calon Murid</h1>
          <p className="text-muted-foreground mt-1">Kelola data pendaftar sesuai standar Dapodik.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2">
            <FileUp className="w-4 h-4" /> Import
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!submitting) setIsDialogOpen(open)
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> Tambah Pendaftar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[850px] h-[95vh] p-0 overflow-hidden border-border/50 bg-card flex flex-col">
              <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
                <DialogTitle className="font-headline text-2xl">Formulir Pendaftaran Dapodik</DialogTitle>
                <DialogDescription>Lengkapi seluruh informasi calon siswa sesuai dokumen resmi.</DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                  <ScrollArea className="flex-1 px-8 py-6">
                    <div className="space-y-10 pb-10">
                      {/* SECTION 1: IDENTITAS PRIBADI */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-primary">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <User className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 1: Identitas Pribadi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nama Lengkap</FormLabel>
                                <FormControl>
                                  <Input placeholder="Sesuai Akte Kelahiran" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jenis Kelamin</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih Gender" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="NISN"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>NISN (10 Digit)</FormLabel>
                                <FormControl>
                                  <Input placeholder="0123456789" {...field} maxLength={10} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="NIK"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>NIK (16 Digit)</FormLabel>
                                <FormControl>
                                  <Input placeholder="3201..." {...field} maxLength={16} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="birthPlace"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tempat Lahir</FormLabel>
                                <FormControl>
                                  <Input placeholder="Kota/Kabupaten" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="birthDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tanggal Lahir</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="religion"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Agama</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih Agama" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {['Katolik', 'Islam', 'Kristen', 'Hindu', 'Budha', 'Khonghucu', 'Lainnya'].map(r => (
                                      <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="hobbies"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hobi / Kegemaran</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seni, Olahraga, Membaca..." {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* SECTION 2: DATA KELUARGA */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-cyan-500">
                          <div className="bg-cyan-500/10 p-2 rounded-lg">
                            <Layers className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 2: Data Keluarga & Saudara</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          <FormField
                            control={form.control}
                            name="childOrder"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Anak Ke-berapa</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="numberOfSiblings"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jumlah Saudara Kandung</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* SECTION 3: DOMISILI */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-amber-500">
                          <div className="bg-amber-500/10 p-2 rounded-lg">
                            <Home className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 3: Alamat & Domisili</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Alamat Lengkap</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Jl. Raya No..., RT/RW, Kelurahan, Kecamatan" {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="familyCardNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>No. KK (16 Digit)</FormLabel>
                                <FormControl>
                                  <Input placeholder="3201..." {...field} maxLength={16} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="livingWith"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tinggal Dengan</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {['Bersama Orang Tua', 'Wali', 'Kost', 'Asrama', 'Lainnya'].map(v => (
                                      <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="transportation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Transportasi ke Sekolah</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {['Jalan Kaki', 'Motor', 'Mobil Pribadi', 'Ojek/Jemputan', 'Kendaraan Umum'].map(v => (
                                      <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="distanceToSchoolKm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jarak ke Sekolah (Km)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.1" placeholder="Contoh: 1.5" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* SECTION 4: ORANG TUA */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-pink-500">
                          <div className="bg-pink-500/10 p-2 rounded-lg">
                            <UsersIcon className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 4: Data Orang Tua / Wali</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          {/* Ayah */}
                          <div className="space-y-5 p-5 border rounded-2xl bg-card/50">
                            <div className="flex items-center gap-2 border-b pb-2">
                              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">AYAH</Badge>
                            </div>
                            <FormField
                              control={form.control}
                              name="fatherName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nama Lengkap Ayah</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Nama Sesuai KTP" {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="fatherNIK"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>NIK Ayah</FormLabel>
                                  <FormControl>
                                    <Input placeholder="16 Digit" {...field} maxLength={16} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="fatherOccupation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pekerjaan Ayah</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Contoh: Karyawan, TNI, Petani..." {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Ibu */}
                          <div className="space-y-5 p-5 border rounded-2xl bg-card/50">
                            <div className="flex items-center gap-2 border-b pb-2">
                              <Badge variant="outline" className="text-pink-500 border-pink-500/20 bg-pink-500/5">IBU</Badge>
                            </div>
                            <FormField
                              control={form.control}
                              name="motherName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nama Lengkap Ibu</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Nama Sesuai KTP" {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="motherNIK"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>NIK Ibu</FormLabel>
                                  <FormControl>
                                    <Input placeholder="16 Digit" {...field} maxLength={16} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="motherOccupation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pekerjaan Ibu</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Contoh: IRT, Guru, Perawat..." {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-accent/5 p-4 rounded-xl border border-accent/20">
                            <FormField
                              control={form.control}
                              name="registrantRelationship"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2"><Info className="w-3 h-3" /> Hubungan Pendaftar</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Hubungan" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {['Ayah', 'Ibu', 'Wali', 'Calon Siswa', 'Lainnya'].map(v => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="parentPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2"><Smartphone className="w-3 h-3" /> No. HP Aktif (WhatsApp)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="08..." {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION 5: PENDIDIKAN */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-green-500">
                          <div className="bg-green-500/10 p-2 rounded-lg">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 5: Jalur Masuk & Pendidikan</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name="originSchool"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Asal Sekolah (SD/MI)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input 
                                        placeholder="Ketik atau pilih sekolah asal..." 
                                        {...field} 
                                        list="school-suggestions"
                                        disabled={submitting} 
                                      />
                                      <datalist id="school-suggestions">
                                        {schoolSuggestions.map((school: string) => (
                                          <option key={school} value={school} />
                                        ))}
                                      </datalist>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="applicationPath"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jalur Pendaftaran</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih Jalur" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Zonasi">Zonasi</SelectItem>
                                    <SelectItem value="Prestasi">Prestasi</SelectItem>
                                    <SelectItem value="Afirmasi">Afirmasi</SelectItem>
                                    <SelectItem value="Perpindahan Orang Tua">Perpindahan Orang Tua</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="academicScore"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rata-rata Nilai Rapor</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="Contoh: 85.50" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="p-6 border-t bg-card shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
                    <DialogFooter className="flex flex-row items-center justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={submitting} className="min-w-[180px] shadow-lg shadow-primary/20 h-11 text-base font-bold">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                        Simpan Pendaftar
                      </Button>
                    </DialogFooter>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Cari NISN atau Nama..." 
            className="pl-10 h-11 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-bold">NISN / No. Reg</TableHead>
              <TableHead className="font-bold">Nama Lengkap</TableHead>
              <TableHead className="font-bold">Asal Sekolah</TableHead>
              <TableHead className="font-bold">Jalur</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Tidak ada pendaftar ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredApplicants.map((applicant) => (
                <TableRow key={applicant.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono font-medium text-primary text-sm">{applicant.NISN}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                        {applicant.registrationNumber}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{applicant.fullName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{applicant.originSchool}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${pathColorMap[applicant.applicationPath] || ''} font-bold text-[10px]`}>
                      {applicant.applicationPath}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusColorMap[applicant.verificationStatus] || ''} font-bold text-[10px]`}>
                      {applicant.verificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/applicants/${applicant.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
