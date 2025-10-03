'use client';

import { usePathname } from 'next/navigation';

export default function PageContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't add padding on auth pages
  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
  const isAuthPage = authPages.includes(pathname);
  
  return (
    <div className={isAuthPage ? '' : 'p-8'}>
      {children}
    </div>
  );
}
