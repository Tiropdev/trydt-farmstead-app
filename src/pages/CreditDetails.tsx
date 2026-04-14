import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * CreditDetails.tsx
 *
 * - Preserves your working UI/PDF logic
 * - Adds: advance balances (customer_advance), advance history (advance_history)
 * - Deducts advance from outstanding credit when computing balance
 * - Includes customers who only have advance
 * - Converts payment > balance into advance (updates customer_advance + advance_history)
 * - PDF includes totals (total credit, total paid, balance, advance) and all transactions:
 *    - credit milk_sales
 *    - credit_payments
 *    - advance_history (as Advance usage/changes)
 */

interface CustomerRow {
  name: string;
  totalCredit: number; // sum of credit milk_sales amounts
  totalPaid: number; // sum of credit_payments amounts
  balance: number; // effective balance after using advance
  rawBalance: number; // totalCredit - totalPaid (before advance)
  advance_balance: number; // remaining advance after applying to balance
}

export default function CreditDetails() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa" | "bank">("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "owe" | "zero" | "advance">("all");

  // --- Utility: safe number parse for numeric fields returned as strings ---
  const toNumber = (v: any) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return v;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  // --- Fetch all relevant tables and compute customer rows ---
  const fetchCustomers = async () => {
    try {
      // 1. credit sales (milk_sales with payment_method = 'credit')
      const { data: salesData, error: salesError } = await supabase
        .from("milk_sales")
        .select("*")
        .eq("payment_method", "credit");

      if (salesError) throw salesError;

      // 2. credit payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("credit_payments")
        .select("*");

      if (paymentsError) throw paymentsError;

      // 3. customer advance table (customer_advance)
      const { data: advancesData, error: advancesError } = await supabase
        .from("customer_advance")
        .select("*");

      if (advancesError) throw advancesError;

      // Group sales by customer_name
      const grouped: Record<string, any> = {};

      (salesData ?? []).forEach((s: any) => {
        const cname = s.customer_name;
        if (!grouped[cname]) {
          grouped[cname] = {
            name: cname,
            totalCredit: 0,
            totalPaid: 0,
            advance_balance: 0,
          };
        }
        grouped[cname].totalCredit += toNumber(s.amount);
      });

      // Add payments totals
      (paymentsData ?? []).forEach((p: any) => {
        const cname = p.customer_name;
        if (!grouped[cname]) {
          grouped[cname] = {
            name: cname,
            totalCredit: 0,
            totalPaid: 0,
            advance_balance: 0,
          };
        }
        grouped[cname].totalPaid += toNumber(p.amount_paid);
      });

      // Ensure customers who ONLY have advance (no sales/payments) are included
      (advancesData ?? []).forEach((a: any) => {
        const cname = a.customer_name;
        if (!grouped[cname]) {
          grouped[cname] = {
            name: cname,
            totalCredit: 0,
            totalPaid: 0,
            advance_balance: toNumber(a.advance_balance),
          };
        } else {
          grouped[cname].advance_balance = toNumber(a.advance_balance);
        }
      });

      // For any grouped entry missing advance_balance default to 0
      Object.values(grouped).forEach((g: any) => {
        if (g.advance_balance === undefined) g.advance_balance = 0;
      });

      // Now compute balance after applying advance
      const customerRows: CustomerRow[] = Object.values(grouped).map((g: any) => {
        const rawBalance = (toNumber(g.totalCredit) - toNumber(g.totalPaid)); // before advance
        let advance_balance = toNumber(g.advance_balance || 0);
        let balance = rawBalance;

        // If there's advance, apply to outstanding balance (only if rawBalance > 0)
        if (advance_balance > 0 && balance > 0) {
          if (advance_balance >= balance) {
            advance_balance = Number((advance_balance - balance).toFixed(2));
            balance = 0;
          } else {
            balance = Number((balance - advance_balance).toFixed(2));
            advance_balance = 0;
          }
        }

        return {
          name: g.name,
          totalCredit: Number(toNumber(g.totalCredit).toFixed(2)),
          totalPaid: Number(toNumber(g.totalPaid).toFixed(2)),
          rawBalance: Number(rawBalance.toFixed(2)),
          balance: Number(balance.toFixed(2)),
          advance_balance: Number(advance_balance.toFixed(2)),
        };
      });

      // Default filter: show all customers who owe, have advance, or all - we'll handle UI filter separately
      setCustomers(customerRows);
    } catch (err: any) {
      console.error("fetchCustomers err", err);
      toast.error("Failed to fetch customer credit data");
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Download PDF statement for a customer ---
  const downloadStatement = async (customer: CustomerRow) => {
    try {
      // fetch payments, sales, advance_history for the customer
      const { data: payments } = await supabase
        .from("credit_payments")
        .select("*")
        .eq("customer_name", customer.name);

      const { data: sales } = await supabase
        .from("milk_sales")
        .select("*")
        .eq("customer_name", customer.name)
        .eq("payment_method", "credit");

      const { data: advHistory } = await supabase
        .from("advance_history")
        .select("*")
        .eq("customer_name", customer.name)
        .order("created_at", { ascending: true });

      // Prepare PDF
      const doc = new jsPDF();
      const logoImg = new Image();
      logoImg.src = `${window.location.origin}/farmLogo.png`;

      logoImg.onload = () => {
        const pageWidth = doc.internal.pageSize.width;
        const logoWidth = 30;
        const logoHeight = 20;
        const x = (pageWidth - logoWidth) / 2;
        doc.addImage(logoImg, "PNG", x, 10, logoWidth, logoHeight);

        doc.setFontSize(16);
        doc.text(`${customer.name} - Credit Statement`, 14, 40);

        doc.setFontSize(11);
        doc.text(`Total Credit: KES ${customer.totalCredit.toFixed(2)}`, 14, 50);
        doc.text(`Total Paid: KES ${customer.totalPaid.toFixed(2)}`, 14, 58);
        doc.text(`Balance: KES ${customer.balance.toFixed(2)}`, 14, 66);
        doc.text(`Advance: KES ${customer.advance_balance.toFixed(2)}`, 14, 74);

        // Combine transactions: credits, payments, advance history
        const txs: Array<{ date: string; type: string; description: string; amount: string }> = [];

        (sales ?? []).forEach((s: any) =>
          txs.push({
            date: (s.date ? new Date(s.date).toLocaleDateString() : new Date(s.created_at).toLocaleDateString()),
            type: "Credit",
            description: `Milk Sale (litres: ${s.litres ?? "-"})`,
            amount: toNumber(s.amount).toFixed(2),
          })
        );

        (payments ?? []).forEach((p: any) =>
          txs.push({
            date: (p.payment_date ? new Date(p.payment_date).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()),
            type: "Payment",
            description: p.description || p.payment_method || "Payment",
            amount: (-toNumber(p.amount_paid)).toFixed(2),
          })
        );

        (advHistory ?? []).forEach((a: any) =>
          txs.push({
            date: a.created_at ? new Date(a.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
            type: `Advance (${a.type})`,
            description: a.note || "",
            amount: (toNumber(a.change_amount)).toFixed(2) * (a.type === "deduct" ? -1 : 1) ? (toNumber(a.change_amount) * (a.type === "deduct" ? -1 : 1)).toFixed(2) : toNumber(a.change_amount).toFixed(2),
          })
        );

        // Sort transactions by date (ascending)
        txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Table header
        autoTable(doc, {
          startY: 84,
          head: [["Date", "Type", "Description", "Amount (KES)"]],
          body: txs.map((t) => [t.date, t.type, t.description, t.amount]),
          styles: { cellPadding: 2, fontSize: 10 },
        });

        // Footer page numbers
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(9);
          doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
        }

        doc.save(`${customer.name}_credit_statement.pdf`);
      };

      if (logoImg.complete) {
        logoImg.onload?.(null as any);
      }
    } catch (err: any) {
      console.error("downloadStatement err", err);
      toast.error("Failed to prepare PDF");
    }
  };

  // --- Handle recording a payment ---
  // Behavior:
  // - Insert into credit_payments always.
  // - If payment amount is greater than customer's current balance => extra becomes advance.
  // - Upsert into customer_advance to increase advance_balance when necessary.
  // - Record advance changes into advance_history when creating/updating advance.
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error("Select a customer");
      return;
    }
    const amt = parseFloat(paymentAmount || "0");
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert payment
      const { error: payErr } = await supabase.from("credit_payments").insert([
        {
          customer_name: selectedCustomer.name,
          amount_paid: amt,
          payment_date: new Date(),
          payment_method: paymentMethod,
        },
      ]);

      if (payErr) throw payErr;

      // Recalculate customer's raw balance (totalCredit - totalPaid before applying advance)
      // We fetch totals fresh to be safe
      const { data: salesForCustomer } = await supabase
        .from("milk_sales")
        .select("amount")
        .eq("customer_name", selectedCustomer.name)
        .eq("payment_method", "credit");

      const { data: paymentsForCustomer } = await supabase
        .from("credit_payments")
        .select("amount_paid")
        .eq("customer_name", selectedCustomer.name);

      const totalCredit = (salesForCustomer ?? []).reduce((s: number, r: any) => s + toNumber(r.amount), 0);
      const totalPaid = (paymentsForCustomer ?? []).reduce((s: number, r: any) => s + toNumber(r.amount_paid), 0);

      const rawBalance = Number((totalCredit - totalPaid).toFixed(2)); // could be negative if overpaid

      // If rawBalance < 0 -> overpayment -> create/increment advance
      if (rawBalance < 0) {
        const extra = Math.abs(rawBalance); // how much to add to advance

        // Upsert customer_advance: increment advance_balance by extra
        // Use Postgres upsert via supabase .upsert
        const { error: upsertErr } = await supabase
          .from("customer_advance")
          .upsert(
            { customer_name: selectedCustomer.name, advance_balance: extra, updated_at: new Date() },
            { onConflict: "customer_name", ignoreDuplicates: false }
          );

        if (upsertErr) throw upsertErr;

        // If we used upsert with a plain value, it would overwrite; better to increment existing value via RPC or a select-update.
        // To be safe and ensure increment, fetch current value and update:
        // (fetch)
        const { data: caExisting } = await supabase
          .from("customer_advance")
          .select("*")
          .eq("customer_name", selectedCustomer.name)
          .limit(1)
          .maybeSingle();

        if (caExisting) {
          const newAdvance = Number(toNumber(caExisting.advance_balance) + extra);
          const { error: updErr } = await supabase
            .from("customer_advance")
            .update({ advance_balance: newAdvance, updated_at: new Date() })
            .eq("customer_name", selectedCustomer.name);

          if (updErr) throw updErr;
        } else {
          // If it didn't exist, insert
          const { error: insErr } = await supabase
            .from("customer_advance")
            .insert([{ customer_name: selectedCustomer.name, advance_balance: extra }]);
          if (insErr) throw insErr;
        }

        // Record advance_history (type: 'credit' for adding advance via overpayment)
        const { error: ahErr } = await supabase
          .from("advance_history")
          .insert([
            {
              customer_name: selectedCustomer.name,
              change_amount: extra,
              type: "topup",
              related_id: null,
              note: "Overpayment converted to advance",
            },
          ]);
        if (ahErr) throw ahErr;
      }

      toast.success("Payment recorded successfully!");
      setPaymentAmount("");
      setSelectedCustomer(null);
      setIsDialogOpen(false);
      await fetchCustomers();
    } catch (err: any) {
      console.error("handleAddPayment err", err);
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Filtered customers for display/select ---
  const displayedCustomers = customers.filter((c) => {
    switch (filter) {
      case "owe":
        return c.balance > 0;
      case "zero":
        // rawBalance 0 and no advance
        return c.rawBalance === 0 && c.advance_balance === 0;
      case "advance":
        return c.advance_balance > 0;
      case "all":
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/receipts")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back Receipts
        </Button>

        <h1 className="text-2xl font-bold text-foreground">Customer Credit</h1>

        {/* Filters + Record Payment */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>
              All
            </Button>
            <Button size="sm" variant={filter === "owe" ? "default" : "ghost"} onClick={() => setFilter("owe")}>
              Owe
            </Button>
            <Button size="sm" variant={filter === "zero" ? "default" : "ghost"} onClick={() => setFilter("zero")}>
              Zero
            </Button>
            <Button size="sm" variant={filter === "advance" ? "default" : "ghost"} onClick={() => setFilter("advance")}>
              Advance
            </Button>
          </div>

          <div className="ml-auto">
            <Button disabled={customers.length === 0} onClick={() => setIsDialogOpen(true)}>
              Record Payment
            </Button>
          </div>
        </div>

        {/* Payment Modal */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Select
                  value={selectedCustomer?.name || ""}
                  onValueChange={(v) => setSelectedCustomer(customers.find((c) => c.name === v) || null)}
                >
                  <SelectTrigger className="h-12 mt-2">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayedCustomers.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name} – Balance: KES {c.balance.toFixed(2)} | Advance: KES {c.advance_balance.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Amount (KES)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-12 mt-2"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                  <SelectTrigger className="h-12 mt-2">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                {isSubmitting ? "Recording..." : "Record Payment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Customer Cards */}
        <div className="space-y-4 mt-4">
          {displayedCustomers.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">No customers for this filter</Card>
          ) : (
            displayedCustomers.map((c) => (
              <Card
                key={c.name}
                className="p-5 border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">Total Credit: KES {c.totalCredit.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Total Paid: KES {c.totalPaid.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Advance: KES {c.advance_balance.toFixed(2)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${c.balance > 0 ? "text-destructive" : "text-success"}`}>
                        Balance: KES {c.balance.toFixed(2)}
                      </span>

                      <Button size="sm" variant="outline" onClick={() => downloadStatement(c)} className="ml-2">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Raw: KES {c.rawBalance.toFixed(2)}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
