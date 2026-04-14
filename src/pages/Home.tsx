import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const menuItems = [
    { icon: '🐮', title: 'Cow Profiles', path: '/cows', color: 'bg-primary/10 hover:bg-primary/20' },
    { icon: '🥛', title: 'Record Data', path: '/record', color: 'bg-accent/10 hover:bg-accent/20' },
    { icon: '🌾', title: 'Feed Records', path: '/feed', color: 'bg-secondary hover:bg-secondary/80' },
    { icon: '💊', title: 'Health Records', path: '/health', color: 'bg-primary/10 hover:bg-primary/20' },
    { icon: '💰', title: 'Milk Sales', path: '/sales', color: 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50' },
    { icon: '🧾', title: 'Sales Receipts', path: '/receipts', color: 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50' },
    { icon: '📊', title: 'Reports', path: '/reports', color: 'bg-muted hover:bg-muted/80' },
    { icon: '📈', title: 'Admin Dashboard', path: '/admin', color: 'bg-accent/10 hover:bg-accent/20' },
  ];

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <header className="mb-8 pt-6 animate-fade-in">
        <div className="flex items-center justify-between max-w-md mx-auto mb-4">
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <div className="text-6xl mb-4 animate-bounce-subtle">🏡</div>
          </div>
          <div className="flex-1 flex justify-end gap-2">
            {isAdmin && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Admin</span>
              </div>
            )}
            <Button onClick={signOut} variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">TRYDT Farmstead</h1>
          <p className="text-muted-foreground">Daily Farm Records</p>
        </div>
      </header>

      <div className="max-w-md mx-auto space-y-4">
        {menuItems.map((item, index) => (
          <Card
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`${item.color} border-2 border-border cursor-pointer card-interactive hover-lift p-6 animate-fade-in-up`}
            style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
          >
            <div className="flex items-center gap-4">
              <div className="text-5xl transition-transform duration-200 group-hover:scale-110">{item.icon}</div>
              <h2 className="text-2xl font-semibold text-foreground">{item.title}</h2>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;
