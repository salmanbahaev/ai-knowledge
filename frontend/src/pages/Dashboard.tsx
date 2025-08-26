import React, { useEffect, useState } from 'react';
import { FileText, Users, MessageCircle, TrendingUp, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dashboardService } from '../services/dashboardService';
import { DashboardData, StatCard as StatCardType, ActivityItem } from '../types/api';
import { useErrorTranslation } from '../utils/errorTranslation';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ComponentType<any>;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon: Icon }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        <p className={`text-sm mt-1 ${
          changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {change}
        </p>
      </div>
      <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
      </div>
    </div>
  </div>
);

// Icon mapping helper
const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.ComponentType<any>> = {
    FileText,
    Users,
    MessageCircle,
    TrendingUp,
  };
  return icons[iconName] || FileText;
};

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const translateError = useErrorTranslation(t);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const data = await dashboardService.getStats();
        setDashboardData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white i18n-card-title">{t('dashboard.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('common.loading')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white i18n-card-title">{t('dashboard.title')}</h1>
          <p className="text-red-600 dark:text-red-400 mt-1">{t('common.error')}: {translateError(error || '')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="responsive-margin">
        <h1 className="responsive-title text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="responsive-subtitle text-gray-600 dark:text-gray-400">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="responsive-grid responsive-grid-4 responsive-margin">
        {dashboardData?.stats.map((stat: StatCardType, index: number) => (
          <div key={index} className="responsive-card">
            <StatCard
              title={stat.title}
              value={stat.value}
              change={stat.change}
              changeType={stat.change_type}
              icon={getIconComponent(stat.icon)}
            />
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="responsive-grid responsive-margin">
        {/* Recent Activity */}
        <div className="responsive-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {dashboardData?.recent_activities.map((activity: ActivityItem) => (
              <div key={activity.id} className="flex items-start space-x-3 touch-spacing">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  activity.type === 'upload' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                  activity.type === 'search' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                  activity.type === 'chat' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {activity.user.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{activity.user} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="responsive-card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="responsive-button-group">
            <button className="i18n-secondary-button responsive-button">
              <div className="i18n-button-content">
                <FileText className="w-5 h-5 i18n-button-icon" />
                <span className="text-sm font-medium">Upload Document</span>
              </div>
            </button>
            <button className="i18n-secondary-button responsive-button">
              <div className="i18n-button-content">
                <MessageCircle className="w-5 h-5 i18n-button-icon" />
                <span className="text-sm font-medium">Ask AI</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
