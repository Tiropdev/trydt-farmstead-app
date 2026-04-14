import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarmData } from '@/contexts/FarmDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ArrowLeft, FileInput, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/Breadcrumb';

const RecordCowData = () => {
  const navigate = useNavigate();
  const { cows, addMilkRecord, addFeedRecord, addHealthRecord } = useFarmData();

  const [selectedCowId, setSelectedCowId] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]); // default today
  const [milkData, setMilkData] = useState({ morning: 0, noon: 0, evening: 0 });
  const [feedData, setFeedData] = useState({ type: '', quantity: 0, unit: 'kg' as const });
  const [healthData, setHealthData] = useState<{
    vaccinationDate: string;
    sprayDate: string;
    dewormingDate: string;
    healthStatus: 'healthy' | 'sickness';
    attendedBy: string;
    illnessFrom: string;
    illnessTo: string;
    illness: string;
  }>({
    vaccinationDate: '',
    sprayDate: '',
    dewormingDate: '',
    healthStatus: 'healthy',
    attendedBy: '',
    illnessFrom: '',
    illnessTo: '',
    illness: '',
  });

  const selectedCow = cows.find(c => c.id === selectedCowId);
  const totalMilk = milkData.morning + milkData.noon + milkData.evening;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCowId) {
      toast.error('Please select a cow first');
      return;
    }

    // Save milk record
    addMilkRecord({
      cowId: selectedCowId,
      date: recordDate,
      morningLitres: milkData.morning,
      noonLitres: milkData.noon,
      eveningLitres: milkData.evening,
      totalLitres: totalMilk,
    });

    // Save feed record
    addFeedRecord({
      cowId: selectedCowId,
      date: recordDate,
      feedType: feedData.type,
      quantity: feedData.quantity,
      unit: feedData.unit,
    });

    // Save health record
    addHealthRecord({
      cowId: selectedCowId,
      date: recordDate,
      vaccinationDate: healthData.vaccinationDate || undefined,
      sprayDate: healthData.sprayDate || undefined,
      dewormingDate: healthData.dewormingDate || undefined,
      healthStatus: healthData.healthStatus,
      attendedBy: healthData.attendedBy || undefined,
      illness: healthData.illness || undefined,
      treatmentPeriod:
        healthData.illnessFrom && healthData.illnessTo
          ? { from: healthData.illnessFrom, to: healthData.illnessTo }
          : undefined,
    });

    toast.success(`Records for ${recordDate} saved successfully! ✅`);

    // Reset form
    setSelectedCowId('');
    setMilkData({ morning: 0, noon: 0, evening: 0 });
    setFeedData({ type: '', quantity: 0, unit: 'kg' });
    setHealthData({
      vaccinationDate: '',
      sprayDate: '',
      dewormingDate: '',
      healthStatus: 'healthy',
      attendedBy: '',
      illnessFrom: '',
      illnessTo: '',
      illness: '',
    });
    setRecordDate(new Date().toISOString().split('T')[0]); // reset to today
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb />

        <header className="flex items-center gap-4 mb-6 animate-fade-in">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileInput className="h-6 w-6 text-primary" />
              Record Cow Data
            </h1>
            <p className="text-sm text-muted-foreground">Daily milk, feed & health</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 📅 Step 0: Select Record Date */}
          <Card className="p-4 border-2 border-secondary/30 hover-lift animate-fade-in-up" style={{ animationDelay: '0s', animationFillMode: 'backwards' }}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Record Date
            </h2>
            <Input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">Select the date for which you’re recording data (defaults to today)</p>
          </Card>

          {/* Step 1: Select Cow */}
          <Card className="p-4 border-2 border-primary/20 hover-lift animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>🐮</span> Step 1: Select Cow
            </h2>
            <Select value={selectedCowId} onValueChange={setSelectedCowId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a cow..." />
              </SelectTrigger>
              <SelectContent>
                {cows.map((cow) => (
                  <SelectItem key={cow.id} value={cow.id}>
                    {cow.name} ({cow.breed})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCow && (
              <Card className="mt-3 p-3 bg-secondary/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Breed:</span> <strong>{selectedCow.breed}</strong></div>
                  <div><span className="text-muted-foreground">Calves:</span> <strong>{selectedCow.numberOfCalves}</strong></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Status:</span> <strong className="capitalize">{selectedCow.status}</strong></div>
                </div>
              </Card>
            )}
          </Card>

          {/* Step 2: Milk Production */}
          <Card className="p-4 border-2 border-accent/20 hover-lift animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>🥛</span> Step 2: Milk Production
            </h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="morning">Morning (litres)</Label>
                <Input
                  id="morning"
                  type="number"
                  step="0.1"
                  min="0"
                  value={milkData.morning}
                  onChange={(e) => setMilkData({ ...milkData, morning: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="noon">Noon (litres)</Label>
                <Input
                  id="noon"
                  type="number"
                  step="0.1"
                  min="0"
                  value={milkData.noon}
                  onChange={(e) => setMilkData({ ...milkData, noon: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="evening">Evening (litres)</Label>
                <Input
                  id="evening"
                  type="number"
                  step="0.1"
                  min="0"
                  value={milkData.evening}
                  onChange={(e) => setMilkData({ ...milkData, evening: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <span className="text-sm text-muted-foreground">Total: </span>
                <strong className="text-xl">{totalMilk.toFixed(1)} L</strong>
              </div>
            </div>
          </Card>

          {/* Step 3: Feed Data */}
          <Card className="p-4 border-2 border-secondary/40 hover-lift animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>🌾</span> Step 3: Daily Feeding
            </h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="feedType">Feed Type</Label>
                <Input
                  id="feedType"
                  value={feedData.type}
                  onChange={(e) => setFeedData({ ...feedData, type: e.target.value })}
                  placeholder="e.g., Green, Dry, Concentrated"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    min="0"
                    value={feedData.quantity}
                    onChange={(e) => setFeedData({ ...feedData, quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={feedData.unit}
                    onValueChange={(value) => setFeedData({ ...feedData, unit: value as typeof feedData.unit })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">KG</SelectItem>
                      <SelectItem value="bundles">Bundles</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 4: Health Update */}
          <Card className="p-4 border-2 border-primary/20 hover-lift animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>💊</span> Step 4: Health Update
            </h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="vaccination">Vaccination Date</Label>
                <Input
                  id="vaccination"
                  type="date"
                  value={healthData.vaccinationDate}
                  onChange={(e) => setHealthData({ ...healthData, vaccinationDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="spray">Spray Date</Label>
                <Input
                  id="spray"
                  type="date"
                  value={healthData.sprayDate}
                  onChange={(e) => setHealthData({ ...healthData, sprayDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="deworming">Deworming Date</Label>
                <Input
                  id="deworming"
                  type="date"
                  value={healthData.dewormingDate}
                  onChange={(e) => setHealthData({ ...healthData, dewormingDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="healthStatus">Health Status</Label>
                <Select
                  value={healthData.healthStatus}
                  onValueChange={(value) => setHealthData({ ...healthData, healthStatus: value as typeof healthData.healthStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="sickness">Sickness</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {healthData.healthStatus === 'sickness' && (
                <>
                  <div>
                    <Label htmlFor="illness">Illness Description</Label>
                    <Input
                      id="illness"
                      value={healthData.illness}
                      onChange={(e) => setHealthData({ ...healthData, illness: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="attendedBy">Attended By (Vet Name)</Label>
                    <Input
                      id="attendedBy"
                      value={healthData.attendedBy}
                      onChange={(e) => setHealthData({ ...healthData, attendedBy: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="illnessFrom">Treatment From</Label>
                      <Input
                        id="illnessFrom"
                        type="date"
                        value={healthData.illnessFrom}
                        onChange={(e) => setHealthData({ ...healthData, illnessFrom: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="illnessTo">Treatment To</Label>
                      <Input
                        id="illnessTo"
                        type="date"
                        value={healthData.illnessTo}
                        onChange={(e) => setHealthData({ ...healthData, illnessTo: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Button type="submit" size="lg" className="w-full text-lg py-6">
            Submit All Data ✅
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RecordCowData;
