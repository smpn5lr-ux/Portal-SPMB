
"use client"

import { useState, useMemo } from 'react'
import { 
  UserPlus, 
  Trash2, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Search, 
  Loader2,
  ShieldAlert
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, addDoc, doc, deleteDoc } from 'firebase/firestore'
import { Staff } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

const staffFormSchema = z.object({
  fullName: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  role: z.enum(['Admin', 'Pegawai']),
  phone: z.string().optional(),
})

export default function StaffManagementPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const { toast } = useToast()
  const db = useFirestore()

  const staffQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'staff'), orderBy('createdAt', 'desc'))
  }, [db])

  const { data: staffList, loading } = useCollection<Staff>(staffQuery)

  const form = useForm<z.infer<typeof staffFormSchema>>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "Pegawai",
      phone: "",
    },
  })

  const filteredStaff = useMemo(() => {
    if (!staffList) return []
    return staffList.filter(s => 
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [staffList, searchTerm])

  const onSubmit = async (values: z.infer<typeof staffFormSchema>) => {
    if (!db || submitting) return
    setSubmitting(true)
    try {
      const newStaff = {
        ...values,
        createdAt: new Date().toISOString(),
      }
      await addDoc(collection(db, 'staff'), newStaff)
      toast({
        title: "Pegawai Ditambahkan",
        description: `${values.fullName} telah didaftarkan ke sistem.`,
      })
      setIsDialogOpen(false)
      form.reset()
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'staff',
        operation: 'create',
      }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteStaffConfirm = (staff: Staff) => {
    setStaffToDelete(staff)
    setIsDeleteDialogOpen(true)
  }

  const executeDeleteStaff = async () => {
    if (!db || !staffToDelete) return
    
    try {
      await deleteDoc(doc(db, 'staff', staffToDelete.id))
      toast({ title: "Akses Dicabut", description: "Pegawai telah dihapus dari sistem." })
      setStaffToDelete(null)
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `staff/${staffToDelete.id}`,
        operation: 'delete',
      }))
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Manajemen Pegawai</h1>
          <p className="text-muted-foreground mt-1">Kelola akun staf yang memiliki izin operasional sistem.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <UserPlus className="w-4 h-4" /> Tambah Pegawai
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Pendaftaran Pegawai Baru</DialogTitle>
              <DialogDescription>
                Daftarkan email pegawai agar mereka bisa masuk ke sistem.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl><Input placeholder="Contoh: Ahmad Sulaiman" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="pegawai@sekolah.sch.id" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon (Opsional)</FormLabel>
                    <FormControl><Input placeholder="0812xxxx" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hak Akses (Role)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Pilih Role" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pegawai">Pegawai (Operasional)</SelectItem>
                        <SelectItem value="Admin">Admin (Penuh)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Simpan Akun Pegawai
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/10 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Cari Nama atau Email..." 
                className="pl-9 bg-card" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead className="font-bold text-primary">Pegawai</TableHead>
                <TableHead className="font-bold text-primary">Email & Kontak</TableHead>
                <TableHead className="font-bold text-primary">Hak Akses</TableHead>
                <TableHead className="font-bold text-primary">Terdaftar</TableHead>
                <TableHead className="text-right font-bold text-primary">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">Tidak ada pegawai ditemukan.</TableCell></TableRow>
              ) : filteredStaff.map((staff) => (
                <TableRow key={staff.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {staff.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{staff.fullName}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">STAF SEKOLAH</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Mail className="w-3 h-3 text-muted-foreground" /> {staff.email}
                      </div>
                      {staff.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" /> {staff.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={staff.role === 'Admin' ? 'default' : 'outline'} className="text-[10px] font-bold uppercase">
                      <ShieldCheck className="w-3 h-3 mr-1" /> {staff.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(staff.createdAt).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteStaffConfirm(staff)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" /> Cabut Akses Pegawai?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus akses untuk <strong>{staffToDelete?.fullName}</strong>? Pegawai ini tidak akan bisa masuk ke sistem lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteStaff} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Cabut Akses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
