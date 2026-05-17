import React from 'react';
import OverviewCards from './components/OverviewCards';
import CashBankOverview from './components/CashBankOverview';
import QuickStats from './components/QuickStats';
import RecentActivity from './components/RecentActivity';

const Dashboard: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Your financial overview</p>
      </div>

      <OverviewCards />
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <CashBankOverview />
        <QuickStats />
      </div>

      <RecentActivity />
    </div>
  );
};

export default Dashboard;