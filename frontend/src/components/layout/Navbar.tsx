import React from 'react';
import { Search, Bell, User, Moon, Sun, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { CompactLanguageSwitcher } from '../common/CompactLanguageSwitcher';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle, isMobileMenuOpen }) => {
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-area-top">
      <div className="responsive-container">
        <div className="flex items-center justify-between py-3 md:py-4">
          {/* Mobile Menu Button + Logo */}
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <button
              onClick={onMobileMenuToggle}
              className={`md:hidden hamburger text-gray-600 dark:text-gray-300 ${isMobileMenuOpen ? 'active' : ''}`}
              aria-label="Toggle menu"
            >
              <div className="hamburger-line"></div>
              <div className="hamburger-line"></div>
              <div className="hamburger-line"></div>
            </button>
            
            {/* Logo */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs md:text-sm">AI</span>
              </div>
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white hidden sm:block">
                Knowledge Graph
              </h1>
            </div>
          </div>

          {/* Search Bar - Hidden on small screens */}
          <div className="hidden lg:flex flex-1 max-w-xl mx-8">
            <div className="relative responsive-search">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg 
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white mobile-text
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           transition-colors duration-200"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            {/* Language Switcher - Full on desktop, compact on mobile */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <div className="sm:hidden">
              <CompactLanguageSwitcher />
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 touch-target"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Moon className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
            
            {/* Notifications - Hidden on mobile */}
            <button className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 touch-target">
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300" />
            </button>
            
            {/* User Menu */}
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 touch-target">
              <User className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
