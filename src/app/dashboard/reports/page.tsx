
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
  FileCode,
  CheckCircle2,
  Settings2,
  CalendarDays
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Applicant } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'

const COLORS = ['#4361EE', '#4CC9F0', '#F72585', '#7209B7', '#3A0CA3']

const EXPORT_COLUMNS = [
  { id: 'registrationSequence', label: 'No. Urut' },
  { id: 'registrationNumber', label: 'No. Registrasi' },
  { id: 'NISN', label: 'NISN' },
  { id: 'NIK', label: 'NIK' },
  { id: 'fullName', label: 'Nama Lengkap' },
  { id: 'gender', label: 'Jenis Kelamin' },
  { id: 'originSchool', label: 'Sekolah Asal' },
  { id: 'applicationPath', label: 'Jalur Masuk' },
  { id: 'academicScore', label: 'Skor Akademik' },
  { id: 'distanceToSchoolKm', label: 'Jarak (Km)' },
  { id: 'verificationStatus', label: 'Status Verifikasi' },
  { id: 'admissionStatus', label: 'Hasil Seleksi' },
  { id: 'parentName', label: 'Nama Orang Tua' },
  { id: 'parentPhone', label: 'No. Telepon' },
  { id: 'address', label: 'Alamat Lengkap' },
  { id: 'birthDate', label: 'Tanggal Lahir' },
  { id: 'religion', label: 'Agama' },
]

export default function ReportsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(EXPORT_COLUMNS.map(c => c.id))
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false)

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'applicants'), orderBy('registrationSequence', 'asc'))
  }, [db])

  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'system')
  }, [db])

  const { data: applicants, loading } = useCollection<Applicant>(applicantsQuery)
  const { data: systemSettings } = useDoc<any>(settingsRef)

  const dinasName = systemSettings?.dinasName || "DINAS PENDIDIKAN"
  const schoolName = systemSettings?.schoolName || "PORTAL SPMB"
  const academicYear = systemSettings?.academicYear || "2024/2025"
  const npsn = systemSettings?.npsn || "-"

  const stats = useMemo(() => {
    const totalQuota = systemSettings?.totalQuota || 0
    if (!applicants) return { total: 0, avgScore: 0, remainingQuota: 0, acceptedCount: 0, totalQuota }
    const total = applicants.filter(a => !a.isDeleted).length
    const acceptedCount = applicants.filter(a => !a.isDeleted && a.admissionStatus === 'accepted').length
    // Sisa Kuota = Total Kuota - Total Pendaftar yang ada (aktif)
    const remainingQuota = Math.max(0, totalQuota - total)
    
    const prestasiApplicants = applicants.filter(a => !a.isDeleted && a.applicationPath === 'Prestasi' && a.academicScore)
    const avgScore = prestasiApplicants.length 
      ? (prestasiApplicants.reduce((acc, curr) => acc + (curr.academicScore || 0), 0) / prestasiApplicants.length).toFixed(1)
      : 0
      
    return { total, avgScore, remainingQuota, acceptedCount, totalQuota }
  }, [applicants, systemSettings])

  const schoolData = useMemo(() => {
    if (!applicants) return []
    const counts: Record<string, number> = {}
    applicants.filter(a => !a.isDeleted).forEach(a => {
      counts[a.originSchool] = (counts[a.originSchool] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ 
        name: name.length > 15 ? name.substring(0, 12) + "..." : name, 
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [applicants])

  const ageData = useMemo(() => {
    if (!applicants || applicants.length === 0) return []
    const ages: Record<string, number> = {}
    const filtered = applicants.filter(a => !a.isDeleted)
    filtered.forEach(a => {
      const label = `${a.ageYears || 12} Thn`
      ages[label] = (ages[label] || 0) + 1
    })
    const totalCount = filtered.length
    return Object.entries(ages).map(([name, count]) => ({
      name,
      value: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
    }))
  }, [applicants])

  const getExportData = () => {
    if (!applicants) return []
    return applicants.filter(a => !a.isDeleted).map((a, idx) => {
      const row: any = { "No.": idx + 1 }
      EXPORT_COLUMNS.forEach(col => {
        if (selectedColumns.includes(col.id)) {
          row[col.label] = (a as any)[col.id] || '-'
        }
      })
      return row
    })
  }

  const handleExportCSV = () => {
    if (!applicants?.length || selectedColumns.length === 0) return
    setIsExporting(true)
    try {
      const data = getExportData()
      if (data.length === 0) return;
      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(","),
        ...data.map(row => Object.values(row).map(v => `"${v}"`).join(","))
      ].join("\n")
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `Laporan_Murid_PPDB_${new Date().toISOString().split('T')[0]}.csv`)
      link.click()
      toast({ title: "Ekspor Berhasil", description: "Laporan CSV telah diunduh." })
      setIsDownloadDialogOpen(false)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal ekspor CSV." })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = () => {
    if (!applicants?.length || selectedColumns.length === 0) return
    setIsExporting(true)
    try {
      const data = getExportData()
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Murid")
      XLSX.writeFile(workbook, `Laporan_Murid_PPDB_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast({ title: "Ekspor Berhasil", description: "Laporan Excel telah diunduh." })
      setIsDownloadDialogOpen(false)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal ekspor Excel." })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = async () => {
    if (!applicants?.length || selectedColumns.length === 0) return
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF('landscape')
      
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text(dinasName.toUpperCase(), 148, 12, { align: "center" })
      doc.setFontSize(20)
      doc.text(schoolName.toUpperCase(), 148, 19, { align: "center" })
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`NPSN: ${npsn} | Tahun Ajaran ${academicYear}`, 148, 25, { align: "center" })
      doc.line(14, 28, 283, 28)

      const data = getExportData()
      if (data.length === 0) return;
      const headers = [Object.keys(data[0])]
      const body = data.map(item => Object.values(item))

      doc.setFontSize(14)
      doc.setTextColor(67, 97, 238)
      doc.setFont("helvetica", "bold")
      doc.text(`Laporan Rekapitulasi Penerimaan Murid Baru`, 14, 35)
      
      autoTable(doc, {
        head: headers,
        body: body,
        startY: 40,
        theme: 'striped',
        styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
        headStyles: { 
          fillColor: [67, 97, 238],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: { fillColor: [245, 247, 255] }
      })

      doc.save(`Laporan_Murid_PPDB_${new Date().toISOString().split('T')[0]}.pdf`)
      toast({ title: "Ekspor Berhasil", description: "Laporan PDF telah diunduh." })
      setIsDownloadDialogOpen(false)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal ekspor PDF." })
    } finally {
      setIsExporting(false)
    }
  }

  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Laporan & Analitik</h1>
          <p className="text-muted-foreground mt-1">Visualisasi data pendaftaran murid secara real-time dari Firestore.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={loading} className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <FileDown className="w-4 h-4" />
                Unduh Laporan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] border-border/50 bg-card">
              <DialogHeader>
                <DialogTitle className="font-headline text-xl flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  Kustomisasi Ekspor Laporan
                </DialogTitle>
                <DialogDescription>
                  Pilih kolom data murid yang ingin Anda sertakan dalam dokumen ekspor.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-muted/20 rounded-xl border border-border/50 max-h-[300px] overflow-y-auto">
                  {EXPORT_COLUMNS.map((col) => (
                    <div key={col.id} className="flex items-center space-x-2">
                      <Checkbox id={`col-${col.id}`} checked={selectedColumns.includes(col.id)} onCheckedChange={() => toggleColumn(col.id)} />
                      <Label htmlFor={`col-${col.id}`} className="text-xs font-medium cursor-pointer">{col.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button onClick={handleExportCSV} disabled={isExporting} variant="outline" className="gap-2"><FileCode className="w-3 h-3" /> CSV</Button>
                <Button onClick={handleExportExcel} disabled={isExporting} variant="outline" className="gap-2 border-green-500/20 text-green-500"><FileSpreadsheet className="w-3 h-3" /> Excel</Button>
                <Button onClick={handleExportPDF} disabled={isExporting} className="gap-2"><FilePdf className="w-3 h-3" /> PDF</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> Sisa Kuota Sekolah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : `${stats.remainingQuota} dari ${stats.totalQuota}`}</div>
            <p className="text-xs text-green-500 mt-1 font-bold flex items-center gap-1">Terisi: {stats.acceptedCount} Murid</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <School className="w-4 h-4 text-accent" /> Rata-rata Skor Murid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{loading ? "..." : stats.avgScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Berdasarkan Jalur Prestasi</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-500" /> Total Pendaftar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{loading ? "..." : stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total data masuk sistem</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Asal Sekolah Dasar Terbanyak</CardTitle>
            <CardDescription>Lima sekolah asal pendaftar terbanyak.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schoolData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.3)' }} 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} 
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Demografi Usia Murid</CardTitle>
            <CardDescription>Persentase persebaran usia calon murid baru.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] flex items-center justify-center">
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
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
