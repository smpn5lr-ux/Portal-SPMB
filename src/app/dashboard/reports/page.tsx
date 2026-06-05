
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
  Settings2
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

  const stats = useMemo(() => {
    if (!applicants) return { total: 0, avgScore: 0, remainingQuota: 0, acceptedCount: 0, totalQuota: systemSettings?.totalQuota || 250 }
    const total = applicants.length
    const prestasiApplicants = applicants.filter(a => a.applicationPath === 'Prestasi' && a.academicScore)
    const avgScore = prestasiApplicants.length 
      ? (prestasiApplicants.reduce((acc, curr) => acc + (curr.academicScore || 0), 0) / prestasiApplicants.length).toFixed(1)
      : 0
    const acceptedCount = applicants.filter(a => a.admissionStatus === 'accepted').length
    const totalQuota = systemSettings?.totalQuota || 250
    const remainingQuota = Math.max(0, totalQuota - acceptedCount)
    
    return { total, avgScore, remainingQuota, acceptedCount, totalQuota }
  }, [applicants, systemSettings])

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
    return applicants.map((a, idx) => {
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
      const data = getExportData()
      const headers = [Object.keys(data[0])]
      const body = data.map(item => Object.values(item))

      doc.setFontSize(18)
      doc.setTextColor(67, 97, 238)
      doc.text(`Laporan Penerimaan Murid Baru (${systemSettings?.schoolName || 'Portal SPMB'})`, 14, 15)
      
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Tahun Ajaran: ${systemSettings?.academicYear || '2024/2025'} | Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22)
      
      autoTable(doc, {
        head: headers,
        body: body,
        startY: 30,
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
      console.error(error)
      toast({ variant: "destructive", title: "Error", description: "Gagal ekspor PDF." })
    } finally {
      setIsExporting(false)
    }
  }

  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const selectAll = () => setSelectedColumns(EXPORT_COLUMNS.map(c => c.id))
  const selectNone = () => setSelectedColumns([])

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
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Kolom Tersedia ({selectedColumns.length})</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll} className="text-[10px] h-7">Pilih Semua</Button>
                    <Button variant="ghost" size="sm" onClick={selectNone} className="text-[10px] h-7 text-destructive">Hapus Semua</Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-muted/20 rounded-xl border border-border/50 max-h-[300px] overflow-y-auto">
                  {EXPORT_COLUMNS.map((col) => (
                    <div key={col.id} className="flex items-center space-x-2 p-1 hover:bg-background/50 rounded transition-colors">
                      <Checkbox 
                        id={`col-${col.id}`} 
                        checked={selectedColumns.includes(col.id)}
                        onCheckedChange={() => toggleColumn(col.id)}
                      />
                      <Label 
                        htmlFor={`col-${col.id}`}
                        className="text-xs font-medium cursor-pointer leading-none"
                      >
                        {col.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-6">
                <div className="flex-1 text-[10px] text-muted-foreground italic flex items-center">
                  * Laporan akan disusun secara profesional dalam Bahasa Indonesia.
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleExportCSV} disabled={isExporting || selectedColumns.length === 0} variant="outline" className="gap-2">
                    {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCode className="w-3 h-3" />}
                    CSV
                  </Button>
                  <Button onClick={handleExportExcel} disabled={isExporting || selectedColumns.length === 0} variant="outline" className="gap-2 border-green-500/20 text-green-500">
                    {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                    Excel
                  </Button>
                  <Button onClick={handleExportPDF} disabled={isExporting || selectedColumns.length === 0} className="gap-2">
                    {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FilePdf className="w-3 h-3" />}
                    PDF
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Total Murid Pendaftar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{loading ? "..." : stats.total}</div>
            <p className="text-xs text-green-500 mt-1 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Sinkron Firestore Live
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <School className="w-4 h-4 text-accent" /> Rata-rata Skor Murid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{loading ? "..." : stats.avgScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Berdasarkan pendaftar Jalur Prestasi</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-500" /> Sisa Kuota Sekolah
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
                <CardTitle className="font-headline text-lg">Asal Sekolah Dasar Terbanyak</CardTitle>
                <CardDescription>Penyebaran murid berdasarkan sekolah dasar asal mereka.</CardDescription>
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
                <CardTitle className="font-headline text-lg">Demografi Usia Murid</CardTitle>
                <CardDescription>Distribusi umur calon murid baru berdasarkan data kelahiran.</CardDescription>
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
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
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
          <CardTitle className="font-headline text-lg">Histori Ekspor Data</CardTitle>
          <CardDescription>Daftar riwayat unduhan laporan pendaftaran murid.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Download className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold">Laporan Master Murid PPDB</p>
                  <p className="text-xs text-muted-foreground">Oleh Sistem • Sinkron Firestore Real-time</p>
                </div>
              </div>
              <Button onClick={() => setIsDownloadDialogOpen(true)} variant="ghost" size="sm" className="text-primary font-bold">
                Unduh Sekarang
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
