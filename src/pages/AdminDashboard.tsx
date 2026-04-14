import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarmData } from '@/contexts/FarmDataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Download, FileText, TrendingUp, Package, Activity, BarChart3, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';



type ModalType = 'totalMilk' | 'avgPerCow' | 'activeCows' | 'records' | null;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { cows, milkRecords, feedRecords, healthRecords } = useFarmData();
  const [isGenerating, setIsGenerating] = useState(false);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [selectedCowId, setSelectedCowId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const isAllCows = selectedCowId === 'all';
  const isSingleDayView = dateRange.from.toDateString() === dateRange.to.toDateString();

  // Filter data by date range and cow selection
  const filteredMilkRecords = useMemo(() => 
    milkRecords.filter(r => {
      const recordDate = new Date(r.date);
      const dateMatch = recordDate >= dateRange.from && recordDate <= dateRange.to;
      const cowMatch = isAllCows || r.cowId === selectedCowId;
      return dateMatch && cowMatch;
    }), [milkRecords, dateRange, isAllCows, selectedCowId]
  );

  const filteredFeedRecords = useMemo(() =>
    feedRecords.filter(r => {
      const recordDate = new Date(r.date);
      const dateMatch = recordDate >= dateRange.from && recordDate <= dateRange.to;
      const cowMatch = isAllCows || r.cowId === selectedCowId;
      return dateMatch && cowMatch;
    }), [feedRecords, dateRange, isAllCows, selectedCowId]
  );

  const filteredHealthRecords = useMemo(() =>
    healthRecords.filter(r => {
      const recordDate = new Date(r.date);
      const dateMatch = recordDate >= dateRange.from && recordDate <= dateRange.to;
      const cowMatch = isAllCows || r.cowId === selectedCowId;
      return dateMatch && cowMatch;
    }), [healthRecords, dateRange, isAllCows, selectedCowId]
  );

  // Calculate statistics
  const selectedCow = cows.find(c => c.id === selectedCowId);
  const totalMilkProduction = filteredMilkRecords.reduce((sum, record) => sum + record.totalLitres, 0);
  const activeCowCount = isAllCows ? cows.filter(cow => cow.status === 'active').length : (selectedCow?.status === 'active' ? 1 : 0);
  const averageMilkPerCow = activeCowCount > 0 ? (totalMilkProduction / activeCowCount).toFixed(2) : '0';
  const totalFeedRecords = filteredFeedRecords.length;
  const healthyCows = isAllCows ? cows.filter(cow => cow.status === 'active').length : activeCowCount;
  const pregnantCows = isAllCows ? cows.filter(cow => cow.status === 'pregnant').length : (selectedCow?.status === 'pregnant' ? 1 : 0);

  // Chart data
  const milkProductionOverTime = useMemo(() => {
    const grouped = filteredMilkRecords.reduce((acc, record) => {
      const date = record.date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += record.totalLitres;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, litres]) => ({ date, litres: parseFloat(litres.toFixed(2)) }));
  }, [filteredMilkRecords]);

  const milkPerCowData = useMemo(() => {
    const cowProduction = filteredMilkRecords.reduce((acc, record) => {
      if (!acc[record.cowId]) acc[record.cowId] = 0;
      acc[record.cowId] += record.totalLitres;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(cowProduction)
      .map(([cowId, litres]) => {
        const cow = cows.find(c => c.id === cowId);
        return {
          name: cow?.name || 'Unknown',
          litres: parseFloat(litres.toFixed(2))
        };
      })
      .sort((a, b) => b.litres - a.litres)
      .slice(0, 10);
  }, [filteredMilkRecords, cows]);

  const cowStatusData = useMemo(() => [
    { name: 'Active', value: cows.filter(c => c.status === 'active').length, color: 'hsl(var(--primary))' },
    { name: 'Pregnant', value: cows.filter(c => c.status === 'pregnant').length, color: 'hsl(var(--accent))' },
    { name: 'Dry', value: cows.filter(c => c.status === 'dry').length, color: 'hsl(var(--muted))' },
    { name: 'Sick', value: cows.filter(c => c.status === 'sick').length, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0), [cows]);

  const recordTypesData = useMemo(() => [
    { name: 'Milk Records', value: filteredMilkRecords.length, color: 'hsl(var(--primary))' },
    { name: 'Feed Records', value: filteredFeedRecords.length, color: 'hsl(var(--accent))' },
    { name: 'Health Records', value: filteredHealthRecords.length, color: 'hsl(var(--secondary))' },
  ], [filteredMilkRecords, filteredFeedRecords, filteredHealthRecords]);

  // Report Generation
const generateCSVReport = async () => {
  setIsGenerating(true);

  try {
    const reportDate = new Date();
    const dateRangeStr = isSingleDayView
      ? format(dateRange.from, "MMMM d, yyyy")
      : `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;
    const cowFilter = isAllCows ? "All Cows" : selectedCow?.name || "Unknown Cow";

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // === HEADER ===
    doc.setFontSize(16);
    doc.text("TRYDT FARMSTEAD", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("Farm Analytics Report", 105, 22, { align: "center" });
    doc.setFontSize(9);
    doc.text(`Generated: ${format(reportDate, "MMMM d, yyyy h:mm:ss a")}`, 14, 32);
    doc.text(`Report Period: ${dateRangeStr}`, 14, 38);
    doc.text(`Data Scope: ${cowFilter}`, 14, 44);
    doc.text(
      `Total Days Analyzed: ${
        Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      }`,
      14,
      50
    );

    // === KEY METRICS ===
    doc.setFontSize(11);
    doc.text("Key Metrics", 14, 58);
    autoTable(doc, {
      startY: 62,
      theme: "striped",
      head: [["Metric", "Value", "Unit"]],
      body: [
        ["Total Milk Production", totalMilkProduction.toFixed(2), "Litres"],
        [`Average per ${isAllCows ? "Cow" : "Day"}`, averageMilkPerCow, "Litres"],
        [`${isAllCows ? "Active" : "Total"} Cows`, activeCowCount, "Count"],
        ["Feed Distribution Events", totalFeedRecords, "Count"],
        ["Health Check Records", filteredHealthRecords.length, "Count"],
      ],
    });

    // === HERD STATUS (if viewing all cows) ===
    let nextY = (doc as any).lastAutoTable.finalY + 10;
    if (isAllCows) {
      const total = cows.length;
      doc.text("Herd Status Breakdown", 14, nextY);
      autoTable(doc, {
        startY: nextY + 4,
        theme: "striped",
        head: [["Status", "Count", "Percentage"]],
        body: [
          ["Active", healthyCows, `${((healthyCows / total) * 100).toFixed(1)}%`],
          ["Pregnant", pregnantCows, `${((pregnantCows / total) * 100).toFixed(1)}%`],
          [
            "Dry",
            cows.filter((c) => c.status === "dry").length,
            `${((cows.filter((c) => c.status === "dry").length / total) * 100).toFixed(1)}%`,
          ],
          [
            "Sick",
            cows.filter((c) => c.status === "sick").length,
            `${((cows.filter((c) => c.status === "sick").length / total) * 100).toFixed(1)}%`,
          ],
        ],
      });
      nextY = (doc as any).lastAutoTable.finalY + 10;
    }

// === MILK PRODUCTION ===
doc.text("Milk Production Records", 14, nextY);
const sortedMilkRecords = [...filteredMilkRecords].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);
autoTable(doc, {
  startY: nextY + 4,
  theme: "grid",
  head: [["Date", "Cow Name", "Breed", "Morning (L)", "Midday (L)", "Evening (L)", "Total (L)", "Recorded By"]],
  body: sortedMilkRecords.map((record) => {
    const cow = cows.find((c) => c.id === record.cowId);
    return [
      format(new Date(record.date), "MMM d, yyyy"),
      cow?.name || "Unknown",
      cow?.breed || "N/A",
      record.morningLitres.toFixed(1),
      record.noonLitres.toFixed(1),
      record.eveningLitres.toFixed(1),
      record.totalLitres.toFixed(1),
      record.recordedBy || "N/A",
    ];
  }),
  styles: { fontSize: 8 },
  headStyles: {
    fillColor: [46, 125, 50], // 🌿 Farm green
    textColor: [255, 255, 255],
    fontStyle: "bold",
    halign: "center",
  },
  alternateRowStyles: { fillColor: [245, 245, 245] },
});

// === FEED RECORDS ===
nextY = (doc as any).lastAutoTable.finalY + 10;
doc.text("Feed Distribution Records", 14, nextY);
const sortedFeedRecords = [...filteredFeedRecords].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);
autoTable(doc, {
  startY: nextY + 4,
  theme: "grid",
  head: [["Date", "Cow Name", "Feed Type", "Quantity", "Unit"]],
  body: sortedFeedRecords.map((record) => {
    const cow = cows.find((c) => c.id === record.cowId);
    return [
      format(new Date(record.date), "MMM d, yyyy"),
      cow?.name || "Unknown",
      record.feedType,
      record.quantity.toFixed(1),
      record.unit,
    ];
  }),
  styles: { fontSize: 8 },
  headStyles: {
    fillColor: [67, 160, 71], // 🟩 lighter green for variation
    textColor: [255, 255, 255],
    fontStyle: "bold",
    halign: "center",
  },
  alternateRowStyles: { fillColor: [250, 250, 250] },
});

// === HEALTH RECORDS ===
nextY = (doc as any).lastAutoTable.finalY + 10;
doc.text("Health Management Records", 14, nextY);
const sortedHealthRecords = [...filteredHealthRecords].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);
autoTable(doc, {
  startY: nextY + 4,
  theme: "grid",
  head: [["Date", "Cow Name", "Health Status", "Vaccination", "Spray", "Deworming", "Attended By", "Notes"]],
  body: sortedHealthRecords.map((record) => {
    const cow = cows.find((c) => c.id === record.cowId);
    return [
      format(new Date(record.date), "MMM d, yyyy"),
      cow?.name || "Unknown",
      record.healthStatus,
      record.vaccinationDate ? format(new Date(record.vaccinationDate), "MMM d, yyyy") : "N/A",
      record.sprayDate ? format(new Date(record.sprayDate), "MMM d, yyyy") : "N/A",
      record.dewormingDate ? format(new Date(record.dewormingDate), "MMM d, yyyy") : "N/A",
      record.attendedBy || "N/A",
      record.illness || "No issues",
    ];
  }),
  styles: { fontSize: 8 },
  headStyles: {
    fillColor: [27, 94, 32], // 🌲 deeper green for health
    textColor: [255, 255, 255],
    fontStyle: "bold",
    halign: "center",
  },
  alternateRowStyles: { fillColor: [245, 245, 245] },
});


    // === FOOTER ===
    nextY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFontSize(10);
    doc.text('----------------------------------------------------------------------------------------------------------------------------------------------------------', 14, nextY);
    doc.text("END OF REPORT", 105, nextY + 6, { align: "center" });
    doc.text("TRYDT Farmstead Management System", 105, nextY + 12, { align: "center" });

    doc.save(`TRYDT_Report_${format(dateRange.from, "yyyy-MM-dd")}_${cowFilter.replace(/\s+/g, "-")}.pdf`);
    toast.success("✅ PDF Report exported successfully!");
  } catch (error) {
    console.error(error);
    toast.error("❌ Failed to generate PDF report.");
  } finally {
    setIsGenerating(false);
  }
};


  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6 animate-fade-in">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          
          <Card className="p-4 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cow-select" className="text-sm mb-2 block">View Data For</Label>
                <Select value={selectedCowId} onValueChange={setSelectedCowId}>
                  <SelectTrigger id="cow-select" className="h-10">
                    <SelectValue placeholder="Choose a cow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="font-semibold">All Cows</span>
                    </SelectItem>
                    {cows.map(cow => (
                      <SelectItem key={cow.id} value={cow.id}>
                        {cow.name} ({cow.breed})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full h-10 justify-start text-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4 space-y-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Quick Select</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setDateRange({ from: new Date(), to: new Date() })}
                          >
                            Today
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                          >
                            Last 7 Days
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                          >
                            Last 30 Days
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">From Date</p>
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                          disabled={(date) => date > new Date()}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">To Date</p>
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                          disabled={(date) => date < dateRange.from || date > new Date()}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {!isAllCows && selectedCow && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Viewing: <span className="font-semibold text-foreground">{selectedCow.name}</span> 
                  {' • '}{selectedCow.breed}
                  {' • '}Status: <span className="capitalize">{selectedCow.status}</span>
                </p>
              </div>
            )}
          </Card>
        </header>

        {/* Main Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-6 animate-fade-in-up">
          <Card 
            className="p-5 hover-lift cursor-pointer"
            onClick={() => setOpenModal('totalMilk')}
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Milk</span>
            </div>
            <p className="text-3xl font-bold text-primary">{totalMilkProduction.toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isSingleDayView ? format(dateRange.from, 'MMM dd') : `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`}
            </p>
          </Card>

          <Card 
            className="p-5 hover-lift cursor-pointer"
            onClick={() => setOpenModal('avgPerCow')}
          >
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Avg/Cow</span>
            </div>
            <p className="text-3xl font-bold text-accent">{averageMilkPerCow}L</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAllCows ? `${activeCowCount} cows` : selectedCow?.name}
            </p>
          </Card>

          <Card 
            className="p-5 hover-lift cursor-pointer"
            onClick={() => setOpenModal('activeCows')}
          >
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-foreground" />
              <span className="text-sm text-muted-foreground">{isAllCows ? 'Active Cows' : 'Status'}</span>
            </div>
            <p className="text-3xl font-bold text-foreground capitalize">
              {isAllCows ? (
                <>{healthyCows}<span className="text-lg text-muted-foreground">/{cows.length}</span></>
              ) : (
                selectedCow?.status || '-'
              )}
            </p>
          </Card>

          <Card 
            className="p-5 hover-lift cursor-pointer"
            onClick={() => setOpenModal('records')}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Records</span>
            </div>
            <p className="text-3xl font-bold text-primary">{filteredMilkRecords.length + filteredFeedRecords.length + filteredHealthRecords.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredMilkRecords.length} milk • {filteredFeedRecords.length} feed • {filteredHealthRecords.length} health
            </p>
          </Card>
        </div>

        {/* Export Section */}
        <Card className="p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Data
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <Button 
              onClick={generateCSVReport}
              disabled={isGenerating}
              variant="default"
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF Report
            </Button>

            <Button 
              onClick={generateCSVReport}
              disabled={isGenerating}
              variant="secondary"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON Data
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• {cows.length} cow profiles</p>
            <p>• {milkRecords.length} milk records</p>
            <p>• {feedRecords.length} feed records</p>
            <p>• {healthRecords.length} health records</p>
          </div>
        </Card>
      </div>

      {/* Total Milk Modal */}
      <Dialog open={openModal === 'totalMilk'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Milk Production Over Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-1">{totalMilkProduction.toFixed(1)}L</p>
              <p className="text-sm text-muted-foreground">
                {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={milkProductionOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Line type="monotone" dataKey="litres" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>

      {/* Average Per Cow Modal */}
      <Dialog open={openModal === 'avgPerCow'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Production by Cow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-accent mb-1">{averageMilkPerCow}L</p>
              <p className="text-sm text-muted-foreground">Average per cow ({cows.length} cows)</p>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={milkPerCowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="litres" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Cows Modal */}
      <Dialog open={openModal === 'activeCows'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cow Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {cowStatusData.map((status) => (
                <div key={status.name} className="p-4 bg-secondary/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">{status.name}</p>
                  <p className="text-3xl font-bold" style={{ color: status.color }}>{status.value}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={cowStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {cowStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>

      {/* Records Modal */}
      <Dialog open={openModal === 'records'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Records Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Milk</p>
                <p className="text-2xl font-bold text-primary">{filteredMilkRecords.length}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Feed</p>
                <p className="text-2xl font-bold text-accent">{filteredFeedRecords.length}</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Health</p>
                <p className="text-2xl font-bold text-foreground">{filteredHealthRecords.length}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={recordTypesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="value">
                  {recordTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
