import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import Header from './Header';

const AppShell = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const location = useLocation();
  const isFullBleedRoute = location.pathname.includes('/sales/quotes/new') || location.pathname.includes('/sales/quotes/edit');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const { data } = await axios.get('http://localhost:5000/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          localStorage.setItem('user', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Failed to refresh user profile:', error);
        // If token is totally invalid, you might log out here, but we let ProtectedRoute handle basic auth
      } finally {
        setUserLoaded(true);
      }
    };
    fetchMe();
  }, []);

  if (!userLoaded) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto print:overflow-visible bg-background custom-scrollbar ${isFullBleedRoute ? 'print:p-0' : 'p-4 md:p-8 print:p-0'}`}>
          <div className={isFullBleedRoute ? '' : 'max-w-7xl mx-auto'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;