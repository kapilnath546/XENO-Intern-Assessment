import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { DashboardPage } from './pages/Dashboard';
import { SegmentsPage } from './pages/Segments';
import { CampaignsPage } from './pages/Campaigns';
import { AnalyticsPage } from './pages/Analytics';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="pl-64">
        <TopNavbar />
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50/50 p-8">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/segments" element={<SegmentsPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
