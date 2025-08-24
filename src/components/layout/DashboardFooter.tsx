// Dashboard-specific Footer Component
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Shield, HelpCircle, FileText } from 'lucide-react';

const DashboardFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        {/* Left Section - Copyright */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Heart className="w-4 h-4 text-primary" />
          <span>© 2024 CareConnect Healthcare Platform</span>
        </div>

        {/* Center Section - Quick Links */}
        <div className="flex items-center space-x-6 text-sm">
          <Link 
            to="/help" 
            className="text-gray-600 hover:text-primary flex items-center space-x-1 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help Center</span>
          </Link>
          
          <Link 
            to="/privacy" 
            className="text-gray-600 hover:text-primary flex items-center space-x-1 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>Privacy</span>
          </Link>
          
          <Link 
            to="/terms" 
            className="text-gray-600 hover:text-primary flex items-center space-x-1 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Terms</span>
          </Link>
        </div>

        {/* Right Section - Status */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>All systems operational</span>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;