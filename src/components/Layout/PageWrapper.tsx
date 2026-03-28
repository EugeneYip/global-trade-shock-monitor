import type { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main
      className="max-w-7xl mx-auto px-4 sm:px-6 w-full"
      style={{
        backgroundColor: '#FCFAF2',
        minHeight: 'calc(100vh - 68px)',
        paddingTop: '68px', // offset for fixed header
      }}
    >
      {children}
    </main>
  );
}
