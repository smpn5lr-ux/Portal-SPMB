
"use client"

import { useState, useMemo } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Search, 
  Eye,
  Loader2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import Link from 'next/link'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, doc, updateDoc, limit } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'

export default function VerificationPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const db = useFirestore()
  const { toast } = useToast()

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, 'applicants'), 
      orderBy('createdAt', 'desc'),
      limit(2000)
    )
  }, [db])

  const { data: allApplicants, loading } = useCollection<Applicant>(applicantsQuery)

  const filteredApplicants = useMemo(() => {
    if (!allApplicants) return []
    return allApplicants.filter(a => {
      if (a.isDeleted) return false
      const matchesSearch = (a.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || (a.NISN || "").includes(searchTerm)
      if (activeTab === 'pending') return matchesSearch && a.verificationStatus === 'Belum Diverifikasi'
      if (activeTab === 'revision') return matchesSearch && a.verificationStatus === 'Perlu Perbaikan'
      if (activeTab === 'completed') return matchesSearch && (a.verificationStatus === 'Lengkap' || a.verificationStatus === 'Ditolak')
      return matchesSearch
    })
  }, [allApplicants, searchTerm, activeTab])

  const handleQuickVerify = (id: string, status: string) => {
    if (!db) return
    const docRef = doc(db, 'applicants', id)
    
    // Jika status disetel Lengkap, otomatis jadikan Diterima (Accepted)
    const updateData: any = { 
      verificationStatus: status,
      updatedAt: new Date().toISOString()
    }
    
    if (status === 'Lengkap') {
      updateData.admissionStatus = 'accepted'
    }

    updateDoc(docRef, updateData)
      .then(() => {
        toast({ title: `Berhasil`, description: `Status diperbarui menjadi ${status}` })
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updateData
        })
        errorEmitter.emit('permission-error', permissionError)
      })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-headline font-bold">Verifikasi Berkas</h1>
        <p className="text-muted-foreground mt-1">Validasi dokumen murid aktif.</p>
      </div>

      <Tabs defaultValue="pending" onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/50 p-1 border border-border/50">
            <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Belum Diperiksa
            </TabsTrigger>
            <TabsTrigger value="revision" className="gap-2">
              Perlu Perbaikan
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Selesai
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama atau NISN..." 
              className="pl-9 bg-card border-border/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-primary/5 border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold w-[60px] text-primary">No.</TableHead>
                  <TableHead className="font-bold text-primary">No. Registrasi</TableHead>
                  <TableHead className="font-bold text-primary">Nama Calon Murid</TableHead>
                  <TableHead className="font-bold text-primary">Jalur Masuk</TableHead>
                  <TableHead className="font-bold text-primary">Status</TableHead>
                  <TableHead className="font-bold text-right text-primary">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex justify-center items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredApplicants.length > 0 ? (
                  filteredApplicants.map((applicant, idx) => (
                    <TableRow key={applicant.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs text-muted-foreground font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {applicant.registrationNumber || applicant.registrationSequence}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{applicant.fullName}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{applicant.originSchool}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {applicant.applicationPath}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold ${
                          applicant.verificationStatus === 'Lengkap' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          applicant.verificationStatus === 'Perlu Perbaikan' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          applicant.verificationStatus === 'Ditolak' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          {applicant.verificationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/applicants/${applicant.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          {activeTab === 'pending' && (
                            <>
                              <Button 
                                onClick={() => handleQuickVerify(applicant.id, 'Lengkap')}
                                title="Setujui & Terima"
                                variant="outline" size="icon" className="h-8 w-8 text-green-500 border-green-500/20 hover:bg-green-500/5"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                onClick={() => handleQuickVerify(applicant.id, 'Ditolak')}
                                title="Tolak Berkas"
                                variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/5"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="w-12 h-12 opacity-20 mb-4" />
                        <p>Tidak ada data pendaftar murid untuk kriteria ini.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
