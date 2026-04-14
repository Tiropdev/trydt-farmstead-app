import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarmData } from '@/contexts/FarmDataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Calendar, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EmptyState } from '@/components/EmptyState';

const Reports = () => {
  const navigate = useNavigate();

  const {
    cows,
    milkRecords: farmMilkRecords,
    feedRecords: farmFeedRecords,
    healthRecords: farmHealthRecords,
  } = useFarmData();

  const [milkRecords, setMilkRecords] = useState(farmMilkRecords);
  const [feedRecords, setFeedRecords] = useState(farmFeedRecords);
  const [healthRecords, setHealthRecords] = useState(farmHealthRecords);

  useEffect(() => setMilkRecords(farmMilkRecords), [farmMilkRecords]);
  useEffect(() => setFeedRecords(farmFeedRecords), [farmFeedRecords]);
  useEffect(() => setHealthRecords(farmHealthRecords), [farmHealthRecords]);

  const [selectedCowId, setSelectedCowId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const isAllCows = selectedCowId === 'all';

  const selectedCow = cows.find(c => c.id === selectedCowId);

  // ---------------- FILTERS ----------------
  const todayMilk = milkRecords.filter(
    r => (isAllCows || r.cowId === selectedCowId) && r.date === selectedDate
  );

  const todayFeed = feedRecords.filter(
    r => (isAllCows || r.cowId === selectedCowId) && r.date === selectedDate
  );

  const todayHealth = healthRecords.filter(
    r => (isAllCows || r.cowId === selectedCowId) && r.date === selectedDate
  );

  const totalMilkToday = todayMilk.reduce((sum, r) => sum + r.totalLitres, 0);
  const totalFeedToday = todayFeed.reduce((sum, r) => sum + r.quantity, 0);

  // ---------------- DELETE (SAFE STATE UPDATE) ----------------
  const deleteMilkRecord = (id: string) => {
    setMilkRecords(prev => prev.filter(r => r.id !== id));
  };

  const deleteFeedRecord = (id: string) => {
    setFeedRecords(prev => prev.filter(r => r.id !== id));
  };

  const deleteHealthRecord = (id: string) => {
    setHealthRecords(prev => prev.filter(r => r.id !== id));
  };

  // ---------------- ALL COWS ----------------
  const cowReports = isAllCows
    ? cows.map(cow => {
        const cowMilk = milkRecords.filter(
          r => r.cowId === cow.id && r.date === selectedDate
        );

        const cowFeed = feedRecords.filter(
          r => r.cowId === cow.id && r.date === selectedDate
        );

        const cowHealth = healthRecords.filter(
          r => r.cowId === cow.id && r.date === selectedDate
        );

        return {
          cow,
          milk: cowMilk.reduce((sum, r) => sum + r.totalLitres, 0),
          milkDetails: cowMilk[0],   // ✅ FIXED BACK TO ORIGINAL
          feed: cowFeed.reduce((sum, r) => sum + r.quantity, 0),
          feedDetails: cowFeed,
          health: cowHealth[0],
        };
      })
    : [];

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <div className="max-w-3xl mx-auto">

        <Breadcrumb />

        {/* HEADER */}
        <header className="mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-6 w-6" />
          </Button>

          <h1 className="text-3xl font-bold">Daily Report</h1>
          <p className="text-muted-foreground">
            View daily summary for any cow
          </p>
        </header>

        {/* FILTERS */}
        <Card className="p-6 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">

            <div>
              <Label>Cow</Label>
              <Select value={selectedCowId} onValueChange={setSelectedCowId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cows</SelectItem>
                  {cows.map(cow => (
                    <SelectItem key={cow.id} value={cow.id}>
                      {cow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

          </div>
        </Card>

        {/* ================= ALL COWS VIEW ================= */}
        {isAllCows ? (
          <div className="space-y-4">

            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">All Cows Report</h2>
              <p className="text-primary font-bold">
                {totalMilkToday.toFixed(1)} L
              </p>
            </div>

            {cowReports.map(report => (
              <Card key={report.cow.id} className="p-4 space-y-3">

                {/* COW HEADER */}
                <div className="flex justify-between border-b pb-2">
                  <div>
                    <h3 className="font-bold">{report.cow.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {report.cow.breed}
                    </p>
                  </div>
                </div>

                {/* MILK */}
                <div>
                  <p className="font-medium">Milk</p>
                  <p className="text-primary font-bold">
                    {report.milk.toFixed(1)} L
                  </p>

                  {report.milkDetails && (
                    <div className="flex justify-between text-xs">
                      <span>
                        M:{report.milkDetails.morningLitres} N:
                        {report.milkDetails.noonLitres} E:
                        {report.milkDetails.eveningLitres}
                      </span>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMilkRecord(report.milkDetails.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* FEED */}
                <div>
                  <p className="font-medium">Feed</p>
                  <p>{report.feed.toFixed(1)} kg</p>

                  {report.feedDetails.map(f => (
                    <div key={f.id} className="flex justify-between text-xs">
                      <span>{f.feedType}: {f.quantity}</span>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteFeedRecord(f.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* HEALTH */}
                <div>
                  <p className="font-medium">Health</p>

                  {report.health ? (
                    <div className="flex justify-between text-xs">
                      <span>{report.health.healthStatus}</span>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteHealthRecord(report.health.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No records</p>
                  )}
                </div>

              </Card>
            ))}
          </div>

        ) : !selectedCow ? (
          <EmptyState
            icon={FileText}
            title="Select cow"
            description="Choose cow to view report"
          />
        ) : (

          /* ================= SINGLE COW ================= */
          <div className="space-y-4">

            <Card className="p-4">
              <h2 className="font-bold">{selectedCow.name}</h2>

              <div className="mt-3">
                <p className="font-medium">Milk</p>
                {todayMilk.map(m => (
                  <div key={m.id} className="flex justify-between text-xs">
                    <span>{m.totalLitres} L</span>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMilkRecord(m.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <p className="font-medium">Feed</p>
                {todayFeed.map(f => (
                  <div key={f.id} className="flex justify-between text-xs">
                    <span>{f.feedType}</span>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteFeedRecord(f.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <p className="font-medium">Health</p>
                {todayHealth.map(h => (
                  <div key={h.id} className="flex justify-between text-xs">
                    <span>{h.healthStatus}</span>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteHealthRecord(h.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

            </Card>

          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;