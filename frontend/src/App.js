import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import CustomerDashboard from './pages/CustomerDashboard';
import ServiceCenterDashboard from './pages/ServiceCenterDashboard';
import MechanicDashboard from './pages/MechanicDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, getRole } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const role = getRole();
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Role-based main dashboard router
const DashboardRouter = () => {
  const { getRole } = useAuth();
  const role = getRole();

  switch (role) {
    case 'CUSTOMER':
      return <CustomerDashboard />;
    case 'SERVICE_CENTER':
      return <ServiceCenterDashboard />;
    case 'MECHANIC':
      return <MechanicDashboard />;
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-vh-100 d-flex flex-column bg-dark">
          <Navbar />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardRouter />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/book-service"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mechanics"
                element={
                  <ProtectedRoute allowedRoles={['SERVICE_CENTER']}>
                    <ServiceCenterDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/packages"
                element={
                  <ProtectedRoute allowedRoles={['SERVICE_CENTER']}>
                    <ServiceCenterDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          <footer className="bg-dark text-muted text-center py-3 border-top border-secondary small">
            &copy; 2026 WheelConnect – Smart Vehicle Service Management System. All rights reserved.
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
