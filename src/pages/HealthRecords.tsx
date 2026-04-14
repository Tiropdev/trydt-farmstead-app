import { useNavigate } from 'react-router-dom';
import { useFarmData } from '@/contexts/FarmDataContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileHeart } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';

const HealthRecords = () => {
  const navigate = useNavigate();
  const { healthRecords, cows } = useFarmData();

  const getCowName = (cowId: string) => {
    return cows.find(c => c.id === cowId)?.name || 'Unknown';
  };

  const tableData = healthRecords.map(record => ({
    ...record,
    cowName: getCowName(record.cowId),
  }));

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
              <FileHeart className="h-6 w-6 text-primary" />
              Health Records
            </h1>
            <p className="text-sm text-muted-foreground">{healthRecords.length} records</p>
          </div>
        </header>

        <div className="mb-6">
          <Button 
            onClick={() => navigate('/record')}
            className="w-full"
            size="lg"
          >
            ➕ Add Health Record
          </Button>
        </div>

        {healthRecords.length === 0 ? (
          <EmptyState
            icon={FileHeart}
            title="No health records yet"
            description="Start recording your cows' health data to track vaccinations, treatments, and wellness."
            action={{
              label: 'Add First Record',
              onClick: () => navigate('/record'),
            }}
          />
        ) : (
          <DataTable
            data={tableData}
            searchKeys={['cowName', 'healthStatus', 'illness', 'attendedBy']}
            columns={[
              {
                key: 'cowName',
                label: 'Cow',
                render: (record) => `🐮 ${record.cowName}`,
              },
              {
                key: 'date',
                label: 'Date',
                render: (record) => new Date(record.date).toLocaleDateString(),
              },
              {
                key: 'healthStatus',
                label: 'Status',
                render: (record) => (
                  <span className="capitalize">
                    {record.healthStatus === 'healthy' ? '✅' : '🤒'} {record.healthStatus}
                  </span>
                ),
              },
              {
                key: 'illness',
                label: 'Details',
                render: (record) => (
                  <div className="text-left space-y-1">
                    {record.illness && <div>Illness: {record.illness}</div>}
                    {record.attendedBy && <div>Vet: {record.attendedBy}</div>}
                    {record.vaccinationDate && (
                      <div>Vaccination: {new Date(record.vaccinationDate).toLocaleDateString()}</div>
                    )}
                  </div>
                ),
              },
            ]}
            pageSize={8}
            emptyMessage="No health records found"
          />
        )}
      </div>
    </div>
  );
};

export default HealthRecords;
