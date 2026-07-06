
"use client"

import { useState, useMemo } from 'react'
import { 
  Search, Loader2, RotateCcw, Trash2, ShieldAlert, AlertCircle
} from "lucide-react"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'

export default function TrashPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [applicantToDelete, setApplicantToDelete] = useState<Applicant | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleteAllPermanentlyDialogOpen, setIsDeleteAllPermanentlyDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { toast } = useToast()
  const db = useFirestore()

  const trashQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'applicants')
  }, [db])

  const { data: allApplicants, loading } = useCollection<Applicant>(trashQuery)

  const deletedApplicants = useMemo(() => {
    if (!allApplicants) return []
    return allApplicants.filter(a => 
      a.isDeleted &&
      ((a.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || (a.NISN || "").includes(searchTerm))
    )
  }, [allApplicants, searchTerm])

  const handleRestore = async (applicant: Applicant) => {
    if (!db) return
    const docRef = doc(db, 'applicants', applicant.id)
    updateDoc(docRef, { 
      isDeleted: false,
      restoredAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Data dipulihkan", description: `${applicant.fullName} kembali ke daftar aktif.` })
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' }))
    })
  }

  const handleDeleteConfirm = (applicant: Applicant) => {
    setApplicantToDelete(applicant)
    setIsDeleteDialogOpen(true)
  }

  const executePermanentDelete = async () => {
    if (!db || !applicantToDelete) return
    
    const docRef = doc(db, 'applicants', applicantToDelete.id)
    deleteDoc(docRef).then(() => {
      toast({ title: "Data dihapus permanen" })
      setApplicantToDelete(null)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }))
    })
  }

  const executeDeleteAllPermanently = async () => {
    if (!db || !deletedApplicants.length) return
    setIsProcessing(true)
    const batch = writeBatch(db)

    try {
      deletedApplicants.forEach((applicant) => {
        const docRef = doc(db, 'applicants', applicant.id)
        batch.delete(docRef)
      })
      await batch.commit()
      toast({ title: "Sampah Dikosongkan", description: `${deletedApplicants.length} data dihapus selamanya.` })
      setIsDeleteAllPermanentlyDialogOpen(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal mengosongkan sampah" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Tempat Sampah</h1>
          <p className="text-muted-foreground mt-1">Data murid yang dihapus sementara. Pulihkan atau hapus permanen.</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
          onClick={() => setIsDeleteAllPermanentlyDialogOpen(true)}
          disabled={deletedApplicants.length === 0}
        >
          <Trash2 className="w-4 h-4" /> Kosongkan Sampah
        </Button>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari di sampah..." className="pl-9 bg-muted/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-destructive/5">
            <TableRow>
              <TableHead className="font-bold text-destructive">Nama Lengkap</TableHead>
              <TableHead className="font-bold text-destructive">NISN</TableHead>
              <TableHead className="font-bold text-destructive">Dihapus Pada</TableHead>
              <TableHead className="text-right font-bold text-destructive">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : deletedApplicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                  <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  Tempat sampah kosong.
                </TableCell>
              </TableRow>
            ) : deletedApplicants.map((applicant) => (
              <TableRow key={applicant.id} className="hover:bg-destructive/5 transition-colors">
                <TableCell className="font-medium">{applicant.fullName}</TableCell>
                <TableCell className="font-mono text-xs">{applicant.NISN || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {applicant.deletedAt ? new Date(applicant.deletedAt).toLocaleString('id-ID') : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="gap-2 text-green-500 border-green-500/20 hover:bg-green-500/5" onClick={() => handleRestore(applicant)}>
                      <RotateCcw className="w-4 h-4" /> Pulihkan
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => handleDeleteConfirm(applicant)}>
                      <Trash2 className="w-4 h-4" /> Hapus Permanen
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Hapus Permanen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data <strong>{applicantToDelete?.fullName}</strong> akan dihapus selamanya dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApplicantToDelete(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executePermanentDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus Selamanya
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAllPermanentlyDialogOpen} onOpenChange={setIsDeleteAllPermanentlyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> Kosongkan Semua Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus secara permanen <strong>{deletedApplicants.length}</strong> data murid. Tindakan ini <strong>tidak dapat dibatalkan</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteAllPermanently} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ya, Kosongkan Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
