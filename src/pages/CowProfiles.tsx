import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarmData } from '@/contexts/FarmDataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';
import { CowProfile } from '@/types/farm';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

const CowProfiles = () => {
  const navigate = useNavigate();
  const { cows, addCow, updateCow, loading } = useFarmData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCow, setEditingCow] = useState<CowProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    dob: '',
    numberOfCalves: 0,
    lastCalvingDate: '',
    status: 'active' as CowProfile['status'],
    remarks: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCow) {
      updateCow(editingCow.id, formData);
      toast.success(`${formData.name} updated successfully! 🐄`);
    } else {
      addCow(formData);
      toast.success(`${formData.name} added successfully! 🐄`);
    }
    setIsDialogOpen(false);
    setEditingCow(null);
    setFormData({
      name: '',
      breed: '',
      dob: '',
      numberOfCalves: 0,
      lastCalvingDate: '',
      status: 'active',
      remarks: '',
    });
  };

  const handleEdit = (cow: CowProfile) => {
    setEditingCow(cow);
    setFormData({
      name: cow.name,
      breed: cow.breed,
      dob: cow.dob,
      numberOfCalves: cow.numberOfCalves,
      lastCalvingDate: cow.lastCalvingDate || '',
      status: cow.status,
      remarks: cow.remarks || '',
    });
    setIsDialogOpen(true);
  };

  const getStatusEmoji = (status: CowProfile['status']) => {
    const statusMap = {
      active: '✅',
      pregnant: '🤰',
      dry: '💤',
      sick: '🤒'
    };
    return statusMap[status];
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
              <Users className="h-6 w-6 text-primary" />
              Cow Profiles
            </h1>
            <p className="text-sm text-muted-foreground">{cows.length} cows registered</p>
          </div>
        </header>

        <div className="mb-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                ➕ Add New Cow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCow ? 'Edit Cow' : 'Add New Cow'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Cow Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="breed">Breed *</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="numberOfCalves">Number of Calves</Label>
                  <Input
                    id="numberOfCalves"
                    type="number"
                    min="0"
                    value={formData.numberOfCalves}
                    onChange={(e) => setFormData({ ...formData, numberOfCalves: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastCalvingDate">Last Calving Date</Label>
                  <Input
                    id="lastCalvingDate"
                    type="date"
                    value={formData.lastCalvingDate}
                    onChange={(e) => setFormData({ ...formData, lastCalvingDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as CowProfile['status'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pregnant">Pregnant</SelectItem>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg">
                  Save Cow Profile
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 border-2 border-border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full col-span-2" />
                </div>
              </Card>
            ))}
          </div>
        ) : cows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No cows registered yet"
            description="Add your first cow to start tracking milk production, health records, and more."
            action={{
              label: 'Add First Cow',
              onClick: () => setIsDialogOpen(true),
            }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cows.map((cow, index) => (
              <Card key={cow.id} className="p-4 border-2 border-border hover-lift animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'backwards' }}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">{cow.name}</h3>
                    <p className="text-sm text-muted-foreground">{cow.breed}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(cow)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <span className="text-2xl">{getStatusEmoji(cow.status)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">DOB:</span>
                    <p className="font-medium">{new Date(cow.dob).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Calves:</span>
                    <p className="font-medium">{cow.numberOfCalves}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium capitalize">{cow.status}</p>
                  </div>
                  {cow.remarks && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Remarks:</span>
                      <p className="font-medium text-sm">{cow.remarks}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CowProfiles;
