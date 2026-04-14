import { useNavigate } from 'react-router-dom';
import { useFarmData } from '@/contexts/FarmDataContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wheat } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';

const FeedRecords = () => {
  const navigate = useNavigate();
  const { feedRecords, cows } = useFarmData();

  const getCowName = (cowId: string) => {
    return cows.find(c => c.id === cowId)?.name || 'Unknown';
  };

  const tableData = feedRecords.map(record => ({
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
              <Wheat className="h-6 w-6 text-primary" />
              Feed Records
            </h1>
            <p className="text-sm text-muted-foreground">{feedRecords.length} records</p>
          </div>
        </header>

        <div className="mb-6">
          <Button 
            onClick={() => navigate('/record')}
            className="w-full"
            size="lg"
          >
            ➕ Add Feed Record
          </Button>
        </div>

        {feedRecords.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title="No feed records yet"
            description="Start tracking your cows' daily feed to optimize nutrition and costs."
            action={{
              label: 'Add First Record',
              onClick: () => navigate('/record'),
            }}
          />
        ) : (
          <DataTable
            data={tableData}
            searchKeys={['cowName', 'feedType', 'unit']}
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
                key: 'feedType',
                label: 'Feed Type',
                render: (record) => (
                  <span className="capitalize">🌾 {record.feedType}</span>
                ),
              },
              {
                key: 'quantity',
                label: 'Quantity',
                render: (record) => `${record.quantity} ${record.unit}`,
              },
            ]}
            pageSize={8}
            emptyMessage="No feed records found"
          />
        )}
      </div>
    </div>
  );
};

export default FeedRecords;
