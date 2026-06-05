"use client"

import { useState } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Search, 
  Eye,
  Filter,
  Check
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { mockApplicants } from "@/lib/mock-data"
import Link from 'next/link'

export default function VerificationPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('pending')

  const filteredByStatus = mockApplicants.filter(a => {
    if (activeTab === 'pending') return a.verificationStatus === 'Belum Diverifikasi'
    if (activeTab === 'revision') return a.verificationStatus === 'Perlu Perbaikan'
    if (activeTab === 'completed') return a.verificationStatus === 'Lengkap' || a.verificationStatus === 'Ditolak'
    return true
  })

  const filteredApplicants = filteredByStatus.filter(a => 
    a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.NISN.includes(searchTerm)
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-headline font-bold">Verifikasi Berkas</h1>
        <p className="text-muted-foreground mt-1">Validasi dokumen persyaratan calon siswa baru.</p>
      </div>

      <Tabs defaultValue="pending" onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/50 p-1 border border-border/50">
            <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Belum Diperiksa
              <Badge variant="secondary" className="bg-primary/20 text-primary-foreground/90 border-none h-5 px-1.5 min-w-[1.25rem]">
                {mockApplicants.filter(a => a.verificationStatus === 'Belum Diverifikasi').length}
              </Badge>
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
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>No. Registrasi</TableHead>
                  <TableHead>Nama Calon Siswa</TableHead>
                  <TableHead>Jalur</TableHead>
                  <TableHead>Dokumen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplicants.length > 0 ? (
                  filteredApplicants.map((applicant) => (
                    <TableRow key={applicant.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {applicant.registrationNumber}
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
                        <div className="flex gap-1">
                          <div className="w-6 h-6 rounded bg-green-500/10 flex items-center justify-center text-green-500" title="KK: Verified">
                            <Check className="w-3 h-3" />
                          </div>
                          <div className="w-6 h-6 rounded bg-green-500/10 flex items-center justify-center text-green-500" title="Ijazah: Verified">
                            <Check className="w-3 h-3" />
                          </div>
                          <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-500" title="Akte: Pending">
                            <FileText className="w-3 h-3" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold ${
                          applicant.verificationStatus === 'Lengkap' ? 'bg-green-500/10 text-green-500' :
                          applicant.verificationStatus === 'Perlu Perbaikan' ? 'bg-amber-500/10 text-amber-500' :
                          applicant.verificationStatus === 'Ditolak' ? 'bg-destructive/10 text-destructive' :
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
                              <Button variant="outline" size="icon" className="h-8 w-8 text-green-500 border-green-500/20 hover:bg-green-500/5">
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/5">
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
                        <p>Tidak ada data pendaftar untuk kriteria ini.</p>
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
