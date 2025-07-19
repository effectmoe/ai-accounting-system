import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const allItems = [
    { label: 'ホーム', href: '/' },
    ...items,
  ];

  return (
    <nav className={cn('flex items-center space-x-2 text-sm', className)}>
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        
        return (
          <React.Fragment key={index}>
            {index === 0 ? (
              <Link
                href={item.href || '/'}
                className="text-gray-500 hover:text-gray-700 flex items-center"
              >
                <Home className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                {isLast || !item.href ? (
                  <span className="text-gray-900 font-medium">{item.label}</span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {item.label}
                  </Link>
                )}
              </>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}