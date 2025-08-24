// Dashboard Layout Wrapper Component
import React from 'react';
import { useAuth } from '../../lib/auth';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      
      <div className="flex flex-1 pt-16">
        <Sidebar />
        
        <main className="flex-1 transition-all duration-300 lg:ml-64">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      
      <DashboardFooter />
    </div>
  );
};

export default DashboardLayout;