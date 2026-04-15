import { useState, useEffect, useMemo } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, CalendarIcon, Download, Receipt, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MilkSale {
  id: string;
  date: string;
  customer_name: string;
  litres: number;
  amount: number;
  payment_method: string;
  recorded_by: string;
  created_at: string;
}

const SalesReceipts = () => {
  const navigate = useNavigate();

  const [sales, setSales] = useState<MilkSale[]>([]);
  const [milkProduced, setMilkProduced] = useState(0);
  const [loading, setLoading] = useState(true);

  const [remarks, setRemarks] = useState("");

  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date()
  });

  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  useEffect(() => {
    fetchAllData();
    loadRemarks();
  }, [dateRange]);

  // ---------------- FETCH ----------------
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('milk_sales')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);

      const { data: milkData } = await supabase
        .from('milk_records')
        .select('total_litres, date')
        .gte('date', from)
        .lte('date', to);

      const totalMilk =
        milkData?.reduce((sum, r) => sum + (r.total_litres || 0), 0) || 0;

      setMilkProduced(totalMilk);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ---------------- REMARKS (FIXED + SAFE) ----------------
  const loadRemarks = async () => {
    try {
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from("remarks")
        .select("*")
        .eq("date_from", from)
        .eq("date_to", to)
        .maybeSingle();

      if (error) throw error;

      if (data?.note) {
        setRemarks(data.note);
      } else {
        setRemarks("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveRemarks = async () => {
    try {
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');

      const { error } = await supabase
        .from("remarks")
        .upsert({
          date_from: from,
          date_to: to,
          note: remarks
        }, {
          onConflict: "date_from,date_to"
        });

      if (error) throw error;

      toast.success("Remarks saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save remarks");
    }
  };

  // ---------------- DELETE ----------------
  const deleteSale = async (id: string) => {
    if (!window.confirm("Delete this sale?")) return;

    try {
      const { error } = await supabase
        .from('milk_sales')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSales(prev => prev.filter(s => s.id !== id));
      toast.success("Sale deleted");

    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  // ---------------- FILTERED DATA ----------------
  const filteredSales = selectedCustomer
    ? sales.filter(s => s.customer_name === selectedCustomer)
    : sales;

  // ---------------- STATS ----------------
  const stats = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalLitres = filteredSales.reduce((sum, s) => sum + Number(s.litres), 0);

    const mpesa = filteredSales.filter(s => s.payment_method === 'mpesa')
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const cash = filteredSales.filter(s => s.payment_method === 'cash')
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const bank = filteredSales.filter(s => s.payment_method === 'bank')
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const credit = filteredSales.filter(s => s.payment_method === 'credit')
      .reduce((sum, s) => sum + Number(s.amount), 0);

    return {
      total: totalSales,
      litres: totalLitres,
      mpesa,
      cash,
      bank,
      credit,
      count: filteredSales.length
    };
  }, [filteredSales]);

  const remainingMilk = milkProduced - stats.litres;

  // ---------------- DOWNLOAD ----------------
  const downloadReceipt = () => {
    const doc = new jsPDF();

    doc.addImage("/farmLogo.png", "PNG", 14, 10, 30, 30);

    doc.setFontSize(16);
    doc.text("TRYDT FARMSTEAD", 50, 15);

    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(), "PPP")}`, 50, 22);

    const tableData = filteredSales.map(s => [
      format(new Date(s.date), 'PP'),
      s.customer_name,
      `${s.litres.toFixed(1)} L`,
      `KES ${s.amount.toFixed(2)}`,
      s.payment_method
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Date", "Customer", "Litres", "Amount", "Payment"]],
      body: tableData
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.text(`Total: KES ${stats.total.toFixed(2)}`, 14, finalY);

    if (remarks) {
      doc.text("Remarks:", 14, finalY + 10);
      doc.text(remarks, 14, finalY + 16);
    }

    doc.save(`receipt-${selectedCustomer || "all"}.pdf`);
  };

  // ---------------- TABLE ----------------
  const columns = [
    { key: 'date', label: 'Date', render: (item: MilkSale) => format(new Date(item.date), 'PP') },
    { key: 'customer_name', label: 'Customer' },
    { key: 'litres', label: 'Litres', render: (item: MilkSale) => `${item.litres.toFixed(1)} L` },
    { key: 'amount', label: 'Amount', render: (item: MilkSale) => `KES ${item.amount.toFixed(2)}` },
    { key: 'payment_method', label: 'Payment' },
    { key: 'recorded_by', label: 'Recorded By' },
    {
      key: 'actions',
      label: '',
      render: (item: MilkSale) => (
        <Button variant="ghost" size="icon" onClick={() => deleteSale(item.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <div className="max-w-6xl mx-auto">

        <Button onClick={() => navigate('/')} variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Breadcrumb />

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Sales Receipts</h1>
              <p className="text-muted-foreground">View and download payment records</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/credit-details")}>
              Credit Payments
            </Button>

            <Button onClick={downloadReceipt}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* FILTERS */}
        <Card className="p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">

            <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(d) => d && setDateRange({ ...dateRange, from: d })}
                />
              </PopoverContent>
            </Popover>

            <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.to, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(d) => d && setDateRange({ ...dateRange, to: d })}
                />
              </PopoverContent>
            </Popover>

            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="">All Customers</option>
              {[...new Set(sales.map(s => s.customer_name))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

          </div>
        </Card>

        {/* STATS */}
{/* STATS (COLORED) */}
<div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
  
  <Card className="p-4 bg-blue-50">
    <p className="text-sm">Total Litres Sold</p>
    <p className="text-xl font-bold">{stats.litres.toFixed(1)}</p>
  </Card>

  <Card className="p-4 bg-green-50">
    <p className="text-sm">Sales</p>
    <p className="text-xl font-bold">KES {stats.total.toFixed(2)}</p>
  </Card>

  <Card className="p-4 bg-purple-50">
    <p className="text-sm">M-Pesa</p>
    <p className="text-xl font-bold">{stats.mpesa.toFixed(2)}</p>
  </Card>

  <Card className="p-4 bg-yellow-50">
    <p className="text-sm">Cash</p>
    <p className="text-xl font-bold">{stats.cash.toFixed(2)}</p>
  </Card>

  {/* NEW */}
  <Card className="p-4 bg-indigo-50">
    <p className="text-sm">Bank</p>
    <p className="text-xl font-bold">{stats.bank.toFixed(2)}</p>
  </Card>

  {/* NEW */}
  <Card className="p-4 bg-pink-50">
    <p className="text-sm">Credit</p>
    <p className="text-xl font-bold">{stats.credit.toFixed(2)}</p>
  </Card>

  <Card className="p-4 bg-gray-100">
    <p className="text-sm">Milk Produced</p>
    <p className="text-xl font-bold">{milkProduced.toFixed(1)} L</p>
  </Card>

  <Card className="p-4 bg-red-100">
    <p className="text-sm">Remaining Milk
    </p>
    <p className="text-xl font-bold text-red-600">
      {remainingMilk.toFixed(1)} L
    </p>
  </Card>

</div>

        {/* REMARKS */}
        <Card className="p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm">Remarks</p>
            <Button size="sm" onClick={saveRemarks}>Save</Button>
          </div>

          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border p-2 rounded-md"
            placeholder="Write notes for this period..."
          />
        </Card>

        {/* TABLE */}
        {loading ? (
          <p className="text-center">Loading...</p>
        ) : sales.length === 0 ? (
          <EmptyState title="No sales records" description="No data found" />
        ) : (
          <Card className="p-6">
            <DataTable columns={columns} data={filteredSales} />
          </Card>
        )}

      </div>
    </div>
  );
};

export default SalesReceipts;