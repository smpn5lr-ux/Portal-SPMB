
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
  Loader2
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
  originSchool: z.string().min(2, "Asal sekolah harus diisi"),
  applicationPath: z.enum(['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']),
  gender: z.enum(['Laki-laki', 'Perempuan']),
  academicScore: z.string().optional(),
  distanceToSchoolKm: z.string().optional(),
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
      originSchool: "",
      applicationPath: "Zonasi",
      gender: "Laki-laki",
    },
  })

  const filteredApplicants = useMemo(() => {
    if (!applicants) return []
    return applicants.filter(a => 
      a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.NISN.includes(searchTerm)
    )
  }, [applicants, searchTerm])

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!db || submitting) return

    setSubmitting(true)
    const registrationNumber = `REG-2024-${Math.floor(1000 + Math.random() * 9000)}`
    
    const newApplicant = {
      ...values,
      registrationNumber,
      academicScore: values.academicScore ? parseFloat(values.academicScore) : 0,
      distanceToSchoolKm: values.distanceToSchoolKm ? parseFloat(values.distanceToSchoolKm) : 0,
      verificationStatus: 'Belum Diverifikasi',
      admissionStatus: 'pending',
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
      documents: [],
      address: "Alamat belum diisi",
      parentName: "Belum diisi",
      parentPhone: "08",
      birthPlace: "Belum diisi",
      birthDate: "2012-01-01",
      religion: "Lainnya",
      familyCardNumber: "0000000000000000"
    }

    addDoc(collection(db, 'applicants'), newApplicant)
      .then(() => {
        setIsDialogOpen(false)
        form.reset()
        toast({
          title: "Berhasil!",
          description: `Data ${values.fullName} telah disimpan.`,
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
          <p className="text-muted-foreground mt-1">Kelola data pendaftar (Dibatasi 50 entri terbaru).</p>
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
                <Plus className="w-4 h-4" /> Tambah Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-border/50 bg-card">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">Tambah Calon Murid</DialogTitle>
                <DialogDescription>Masukkan data dasar pendaftar.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Lengkap</FormLabel>
                          <FormControl>
                            <Input placeholder="Budi Santoso" {...field} disabled={submitting} />
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
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="originSchool"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asal Sekolah (SD/MI)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih Sekolah Asal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {schoolSuggestions.length > 0 ? (
                              schoolSuggestions.map((school: string) => (
                                <SelectItem key={school} value={school}>{school}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="Lainnya" disabled>Atur daftar sekolah di Pengaturan</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Pendaftar'}
                    </Button>
                  </DialogFooter>
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
