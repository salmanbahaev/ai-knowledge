import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Search, 
  MessageCircle, 
  FileText, 
  Network, 
  Settings,
  BarChart3,
  Upload
} from 'lucide-react';

interface SidebarItem {
  path: string;
  icon: React.ComponentType<any>;
  labelKey: string;
  badge?: string;
}

const sidebarItems: SidebarItem[] = [
  { path: '/', icon: Home, labelKey: 'navigation.dashboard' },
  { path: '/search', icon: Search, labelKey: 'navigation.search' },
  { path: '/chat', icon: MessageCircle, labelKey: 'AI Chat', badge: 'AI' },
  { path: '/documents', icon: FileText, labelKey: 'navigation.documents' },
  { path: '/graph', icon: Network, labelKey: 'Knowledge Graph' },
  { path: '/upload', icon: Upload, labelKey: 'navigation.upload' },
  { path: '/analytics', icon: BarChart3, labelKey: 'navigation.analytics' },
  { path: '/settings', icon: Settings, labelKey: 'navigation.settings' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
      <nav className="p-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group
                ${isActive 
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Icon className={`w-5 h-5 transition-colors duration-200 ${
                isActive ? 'text-primary-600 dark:text-primary-400' : 'group-hover:text-gray-900 dark:group-hover:text-white'
              }`} />
              <span className="font-medium">
                {item.labelKey.includes('.') ? t(item.labelKey) : item.labelKey}
              </span>
              {item.badge && (
                <span className="ml-auto px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
