
"use client"

import { useState, useMemo } from "react"
import { 
  FileDown, 
  TrendingUp, 
  Users, 
  School, 
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Download,
  Loader2,
  FileSpreadsheet,
  FileText as FilePdf,
  FileCode
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from "recharts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Applicant } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLORS = ['#4361EE', '#4CC9F0', '#F72585', '#7209B7', '#3A0CA3']

export default function ReportsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'applicants'), orderBy('createdAt', 'desc'))
  }, [db])

  const { data: applicants, loading } = useCollection<Applicant>(applicantsQuery)

  const stats = useMemo(() => {
    if (!applicants) return { total: 0, avgScore: 0, remainingQuota: 0, acceptedCount: 0, totalQuota: 250 }
    const total = applicants.length
    const prestasiApplicants = applicants.filter(a => a.applicationPath === 'Prestasi' && a.academicScore)
    const avgScore = prestasiApplicants.length 
      ? (prestasiApplicants.reduce((acc, curr) => acc + (curr.academicScore || 0), 0) / prestasiApplicants.length).toFixed(1)
      : 0
    const acceptedCount = applicants.filter(a => a.admissionStatus === 'accepted').length
    const totalQuota = 250
    const remainingQuota = Math.max(0, totalQuota - acceptedCount)
    
    return { total, avgScore, remainingQuota, acceptedCount, totalQuota }
  }, [applicants])

  const schoolData = useMemo(() => {
    if (!applicants) return []
    const counts: Record<string, number> = {}
    applicants.forEach(a => {
      counts[a.originSchool] = (counts[a.originSchool] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [applicants])

  const ageData = useMemo(() => {
    if (!applicants) return []
    const ages: Record<string, number> = {}
    applicants.forEach(a => {
      const label = `${a.ageYears || 12} Tahun`
      ages[label] = (ages[label] || 0) + 1
    })
    const total = applicants.length
    return Object.entries(ages).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100)
    }))
  }, [applicants])

  const getExportData = () => {
    if (!applicants) return []
    return applicants.map(a => ({
      "No. Registrasi": a.registrationNumber,
      "NISN": a.NISN,
      "NIK": a.NIK,
      "Nama Lengkap": a.fullName,
      "Gender": a.gender,
      "Asal Sekolah": a.originSchool,
      "Jalur": a.applicationPath,
      "Skor Akademik": a.academicScore || 0,
      "Jarak (Km)": a.distanceToSchoolKm || 0,
      "Status Verifikasi": a.verificationStatus,
      "Status Seleksi": a.admissionStatus,
      "Wali Murid": a.parentName,
      "No. Telepon": a.parentPhone
    }))
  }

  const handleExportCSV = () => {
    if (!applicants?.length) return
    setIsExporting(true)
    try {
      const data = getExportData()
      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(","),
        ...data.map(row => Object.values(row).map(v => `"${v}"`).join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `Laporan_Pendaftaran_${new Date().toISOString().split('T')[0]}.csv`)
      link.click()
      toast({ title: "CSV Berhasil", description: "Laporan CSV telah diunduh." })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal ekspor CSV." })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = () => {
    if (!applicants?.length) return
    setIsExporting(true)
    try {
      const data = getExportData()
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pendaftar")
      XLSX.writeFile(workbook, `Laporan_Pendaftaran_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast({ title: "Excel Berhasil", description: "Laporan Excel telah diunduh." })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal ekspor Excel." })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = () => {
    if (!applicants?.length) return
    setIsExporting(true)
    try {
      const doc = new jsPDF('landscape')
      const data = getExportData()
      const headers = [Object.keys(data[0])]
      const body = data.map(item => Object.values(item))

      doc.text("Laporan Penerimaan Peserta Didik Baru (PPDB)", 14, 15)
      doc.setFontSize(10)
      doc.text(`Tanggal Cetak: ${new Date().toLocaleString()}`, 14, 22)
      
      autoTable(doc, {
        head: headers,
        body: body,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [67, 97, 238] }
      })

      doc.save(`Laporan_Pendaftaran_${new Date().toISOString().split('T')[0]}.pdf`)
      toast({ title: "PDF Berhasil", description: "Laporan PDF telah diunduh." })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal ekspor PDF." })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Laporan & Analitik</h1>
          <p className="text-muted-foreground mt-1">Visualisasi data pendaftaran dan statistik kelulusan secara real-time.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filter Periode
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isExporting || loading} className="gap-2 bg-primary hover:bg-primary/90">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Download Laporan
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                <FileCode className="w-4 h-4" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                <FilePdf className="w-4 h-4" /> Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Total Pendaftar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{loading ? "..." : stats.total}</div>
            <p className="text-xs text-green-500 mt-1 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Data Real-time Firestore
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <School className="w-4 h-4 text-accent" /> Rata-rata Skor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{loading ? "..." : stats.avgScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Berdasarkan pendaftar jalur prestasi</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-500" /> Sisa Kuota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{loading ? "..." : stats.remainingQuota}</div>
            <p className="text-xs text-amber-500 mt-1 font-bold">
              Kuota Terisi: {stats.acceptedCount} / {stats.totalQuota}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg">Asal Sekolah Terbanyak</CardTitle>
                <CardDescription>Penyebaran pendaftar berdasarkan sekolah dasar asal.</CardDescription>
              </div>
              <BarChart3 className="w-5 h-5 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={schoolData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={120}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg">Demografi Usia</CardTitle>
                <CardDescription>Distribusi umur calon siswa baru.</CardDescription>
              </div>
              <PieIcon className="w-5 h-5 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {ageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4 pr-8">
                  {ageData.map((age, i) => (
                    <div key={age.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <div>
                        <p className="text-xs font-bold whitespace-nowrap">{age.name}</p>
                        <p className="text-[10px] text-muted-foreground">{age.value}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-headline text-lg">Log Ekspor Data</CardTitle>
          <CardDescription>Riwayat pengunduhan data untuk laporan dinas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: 'Laporan Master Pendaftar', type: 'Excel', date: 'Real-time Live', user: 'Admin Pusat' },
              { label: 'Rekapitulasi Verifikasi', type: 'PDF', date: 'Real-time Live', user: 'Operator 01' },
            ].map((file) => (
              <div key={file.label} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Download className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{file.label} ({file.type})</p>
                    <p className="text-xs text-muted-foreground">Oleh {file.user} • {file.date}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleExportExcel}
                    disabled={isExporting || loading}
                    variant="ghost" 
                    size="sm" 
                    className="text-primary font-bold gap-2"
                  >
                    <FileSpreadsheet className="w-3 h-3" /> Excel
                  </Button>
                  <Button 
                    onClick={handleExportPDF}
                    disabled={isExporting || loading}
                    variant="ghost" 
                    size="sm" 
                    className="text-primary font-bold gap-2"
                  >
                    <FilePdf className="w-3 h-3" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
