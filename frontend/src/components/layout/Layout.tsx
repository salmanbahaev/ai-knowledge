import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-lang={i18n.language}>
      <Navbar 
        onMobileMenuToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
        isMobileMenuOpen={isMobileNavOpen}
      />
      
      {/* Unified Layout Wrapper */}
      <div className="layout-wrapper">
        {/* Desktop Sidebar */}
        <div className="sidebar-wrapper hidden md:block">
          <Sidebar />
        </div>
        
        {/* Mobile Navigation */}
        <MobileNav 
          isOpen={isMobileNavOpen} 
          onClose={() => setIsMobileNavOpen(false)} 
        />
        
        {/* Main Content */}
        <main className="content-wrapper">
          <div className="responsive-container responsive-spacing">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
