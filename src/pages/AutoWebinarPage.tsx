import React from 'react';
import { Navigate } from 'react-router-dom';

const AutoWebinarPage: React.FC = () => {
  return <Navigate to="/events/webinars" replace />;
};

export default AutoWebinarPage;
