import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BreadcrumbProps {
  className?: string;
}

const routeNames: Record<string, string> = {
  '/': 'Home',
  '/cow-profiles': 'Cow Profiles',
  '/record': 'Record Data',
  '/feed-records': 'Feed Records',
  '/health-records': 'Health Records',
  '/reports': 'Reports',
  '/sales': 'Milk Sales',
  '/receipts': 'Sales Receipts',
  '/admin': 'Admin Dashboard',
};

export const Breadcrumb = ({ className }: BreadcrumbProps) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className={cn('flex items-center space-x-1 text-sm text-muted-foreground mb-4', className)}>
      <Link
        to="/"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {pathnames.map((_, index) => {
        const path = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = routeNames[path] || pathnames[index];

        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1" />
            {isLast ? (
              <span className="font-medium text-foreground">{name}</span>
            ) : (
              <Link
                to={path}
                className="hover:text-foreground transition-colors"
              >
                {name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};
