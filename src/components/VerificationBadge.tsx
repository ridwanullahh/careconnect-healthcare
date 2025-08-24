// Verification Badge Component
import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { CheckCircle, Shield, Star } from 'lucide-react';
import VerificationService, { EntityVerification } from '../lib/verification';

interface VerificationBadgeProps {
  entityId: string;
  showLevel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ 
  entityId, 
  showLevel = false, 
  size = 'md' 
}) => {
  const [verification, setVerification] = useState<EntityVerification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVerification();
  }, [entityId]);

  const loadVerification = async () => {
    try {
      const data = await VerificationService.getEntityVerification(entityId);
      setVerification(data);
    } catch (error) {
      console.error('Failed to load verification:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!verification || verification.status !== 'verified') return null;

  const getIcon = () => {
    switch (verification.verificationLevel) {
      case 'premium':
        return <Star className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
      case 'standard':
        return <Shield className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
      default:
        return <CheckCircle className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />;
    }
  };

  const getColor = () => {
    switch (verification.verificationLevel) {
      case 'premium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'standard':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getLabel = () => {
    if (showLevel) {
      return `${verification.verificationLevel.charAt(0).toUpperCase() + verification.verificationLevel.slice(1)} Verified`;
    }
    return 'Verified';
  };

  return (
    <Badge className={`${getColor()} flex items-center gap-1 ${size === 'sm' ? 'text-xs px-2 py-1' : size === 'lg' ? 'text-sm px-3 py-2' : 'text-xs px-2 py-1'}`}>
      {getIcon()}
      {getLabel()}
    </Badge>
  );
};

export default VerificationBadge;