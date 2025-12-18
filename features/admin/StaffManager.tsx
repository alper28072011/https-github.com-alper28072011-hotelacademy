
import React from 'react';
import { Navigate } from 'react-router-dom';

// This component is deprecated and replaced by OrganizationManager.
// Keeping file to prevent import errors during transition, but redirecting.
export const StaffManager: React.FC = () => {
  return <Navigate to="/admin/organization" replace />;
};
