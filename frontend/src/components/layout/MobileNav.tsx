/**
 * Mobile navigation component with hamburger menu
 */

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
  Upload,
  X
} from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  { path: '/upload', icon: Upload, labelKey: 'navigation.upload' },
  { path: '/graph', icon: Network, labelKey: 'Knowledge Graph' },
  { path: '/analytics', icon: BarChart3, labelKey: 'navigation.analytics' },
  { path: '/settings', icon: Settings, labelKey: 'navigation.settings' },
];

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`mobile-nav-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Mobile Sidebar */}
      <div className={`mobile-sidebar ${isOpen ? 'active' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Knowledge Graph
            </h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-target"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group touch-target ${
                  isActive 
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'group-hover:text-gray-900 dark:group-hover:text-white'
                }`} />
                <span className="font-medium text-base">
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

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            AI Knowledge Graph Platform
          </p>
        </div>
      </div>
    </>
  );
};
