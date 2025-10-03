import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import PageContainer from '@/components/PageContainer'


export const metadata: Metadata = {
  title: 'Video Processor - Dashboard',
  description: 'Video processing and hosting platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gray-50">
              <PageContainer>
                {children}
              </PageContainer>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
