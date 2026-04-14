import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, CalendarIcon, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';

const MilkSales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [date, setDate] = useState<Date>(new Date());
  const [customerName, setCustomerName] = useState('');
  const [litres, setLitres] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cash' | 'credit' | 'bank'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedCustomers, setSavedCustomers] = useState<string[]>([]);

  // Load saved customers on mount
  useEffect(() => {
    const stored = localStorage.getItem('savedCustomers');
    if (stored) setSavedCustomers(JSON.parse(stored));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !amount || parseFloat(amount) <= 0) {
      toast.error('Please fill in customer name and valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('milk_sales').insert({
        date: format(date, 'yyyy-MM-dd'),
        customer_name: customerName.trim(),
        litres: litres ? parseFloat(litres) : null,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        recorded_by: user?.email || 'Unknown'
      });

      if (error) throw error;

      // Save new customer locally
      if (customerName.trim() && !savedCustomers.includes(customerName.trim())) {
        const updated = [...savedCustomers, customerName.trim()];
        setSavedCustomers(updated);
        localStorage.setItem('savedCustomers', JSON.stringify(updated));
      }

      toast.success('Milk sale recorded successfully');
      setCustomerName('');
      setLitres('');
      setAmount('');
      setPaymentMethod('cash');
      setDate(new Date());
    } catch (error: any) {
      console.error('Error recording milk sale:', error);
      toast.error(error.message || 'Failed to record milk sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 pt-6">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <Breadcrumb />
        </div>

        <Card className="p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Record Milk Sale</h1>
              <p className="text-muted-foreground">Track customer purchases and payments</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="date">Sale Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Customer Name</Label>

              {savedCustomers.length > 0 && (
                <Select onValueChange={(v) => setCustomerName(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select saved customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedCustomers.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Or type new customer name…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="litres">Litres (Optional)</Label>
              <Input
                id="litres"
                type="number"
                step="0.1"
                min="0"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount Paid (KES)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Recording...' : 'Record Sale'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default MilkSales;
