
import React from 'react';
import { Navigate } from 'react-router-dom';

export const StaffManager: React.FC = () => {
  return <Navigate to="/admin/organization" replace />;
};
