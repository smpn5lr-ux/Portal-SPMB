"use client"

import { useState } from 'react'
import { 
  Search, 
  FileDown, 
  FileUp, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  CheckCircle,
  FileText
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
import { mockApplicants } from "@/lib/mock-data"
import Link from 'next/link'

const statusColorMap = {
  'Belum Diverifikasi': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Lengkap': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Perlu Perbaikan': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Ditolak': 'bg-destructive/10 text-destructive border-destructive/20',
}

const pathColorMap = {
  'Zonasi': 'text-primary border-primary/20',
  'Prestasi': 'text-cyan-500 border-cyan-500/20',
  'Afirmasi': 'text-pink-500 border-pink-500/20',
  'Perpindahan Orang Tua': 'text-purple-500 border-purple-500/20',
}

export default function ApplicantsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredApplicants = mockApplicants.filter(a => 
    a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.NISN.includes(searchTerm)
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Data Calon Murid</h1>
          <p className="text-muted-foreground mt-1">Kelola dan sinkronisasi data pendaftar dengan format Dapodik.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2">
            <FileUp className="w-4 h-4" />
            Import Excel
          </Button>
          <Button variant="outline" className="gap-2">
            <FileDown className="w-4 h-4" />
            Export CSV
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Tambah Manual
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Cari NISN, Nama, atau Asal Sekolah..." 
            className="pl-10 h-11 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" className="h-11 w-11">
            <Filter className="w-4 h-4" />
          </Button>
          <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Menampilkan <span className="text-foreground font-bold">{filteredApplicants.length}</span> pendaftar
          </div>
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
              <TableHead className="font-bold">Status Verifikasi</TableHead>
              <TableHead className="font-bold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplicants.map((applicant) => (
              <TableRow key={applicant.id} className="hover:bg-muted/20 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono font-medium text-primary text-sm">{applicant.NISN}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                      {applicant.registrationNumber}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">{applicant.fullName}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{applicant.gender}</div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{applicant.originSchool}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${pathColorMap[applicant.applicationPath]} font-bold text-[10px]`}>
                    {applicant.applicationPath}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${statusColorMap[applicant.verificationStatus]} font-bold text-[10px]`}>
                    {applicant.verificationStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/applicants/${applicant.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Eye className="w-4 h-4" />
                          Lihat Detail
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Verifikasi Langsung
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                        <FileText className="w-4 h-4" />
                        Cetak Bukti
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
