// BYOK Key Management Admin Interface
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { KeyManagementService, KeyType, EncryptedKey } from '../../lib/key-management';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { Key, Shield, Trash2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { logger } from '../../lib/observability';

const KeyManagementModule: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<Omit<EncryptedKey, 'encrypted_value'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({
    type: '' as KeyType,
    value: '',
    rateLimit: 1000
  });

  useEffect(() => {
    loadKeys();
  }, [user]);

  const loadKeys = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userKeys = await KeyManagementService.listKeys(user.id);
      setKeys(userKeys);
      await logger.info('key_management_loaded', 'User keys loaded successfully', { count: userKeys.length }, user.id);
    } catch (error) {
      await logger.error('key_management_load_failed', 'Failed to load user keys', { error: error.message }, user.id);
      toast({
        title: 'Error',
        description: 'Failed to load API keys',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!user || !newKey.type || !newKey.value) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Validate key format
    if (!KeyManagementService.validateKeyFormat(newKey.type, newKey.value)) {
      toast({
        title: 'Invalid Key Format',
        description: `The ${newKey.type} key format is invalid. Please check the key and try again.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      await KeyManagementService.storeKey(
        newKey.type,
        newKey.value,
        user.id,
        undefined,
        newKey.rateLimit
      );

      await logger.info('api_key_stored', 'API key stored successfully', { keyType: newKey.type }, user.id);

      toast({
        title: 'Success',
        description: 'API key stored securely',
      });

      setNewKey({ type: '' as KeyType, value: '', rateLimit: 1000 });
      setShowAddForm(false);
      loadKeys();
    } catch (error) {
      await logger.error('api_key_store_failed', 'Failed to store API key', { keyType: newKey.type, error: error.message }, user.id);
      toast({
        title: 'Error',
        description: 'Failed to store API key',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteKey = async (keyId: string, keyType: string) => {
    if (!user) return;

    if (!confirm(`Are you sure you want to delete the ${keyType} key? This action cannot be undone.`)) {
      return;
    }

    try {
      await KeyManagementService.deleteKey(keyId, user.id);
      
      await logger.info('api_key_deleted', 'API key deleted successfully', { keyType }, user.id);
      
      toast({
        title: 'Success',
        description: 'API key deleted successfully',
      });

      loadKeys();
    } catch (error) {
      await logger.error('api_key_delete_failed', 'Failed to delete API key', { keyType, error: error.message }, user.id);
      toast({
        title: 'Error',
        description: 'Failed to delete API key',
        variant: 'destructive'
      });
    }
  };

  const handleRefreshQuota = async (keyId: string, keyType: string) => {
    if (!user) return;

    const newQuota = prompt('Enter new quota limit:', '1000');
    if (!newQuota || isNaN(Number(newQuota))) return;

    try {
      await KeyManagementService.refreshQuota(keyId, user.id, Number(newQuota));
      
      toast({
        title: 'Success',
        description: 'Quota refreshed successfully',
      });

      loadKeys();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh quota',
        variant: 'destructive'
      });
    }
  };

  const getKeyTypeDisplay = (type: string) => {
    const displays = {
      [KeyType.GEMINI_AI]: 'Gemini AI',
      [KeyType.GOOGLE_MAPS]: 'Google Maps',
      [KeyType.STRIPE]: 'Stripe',
      [KeyType.PAYSTACK]: 'Paystack',
      [KeyType.FLUTTERWAVE]: 'Flutterwave',
      [KeyType.RAZORPAY]: 'Razorpay',
      [KeyType.PAYPAL]: 'PayPal'
    };
    return displays[type as KeyType] || type;
  };

  const getKeyDescription = (type: string) => {
    const descriptions = {
      [KeyType.GEMINI_AI]: 'For AI-powered health tools and chat support',
      [KeyType.GOOGLE_MAPS]: 'For directory map views and geolocation',
      [KeyType.STRIPE]: 'For payment processing (US/EU)',
      [KeyType.PAYSTACK]: 'For payment processing (Africa)',
      [KeyType.FLUTTERWAVE]: 'For payment processing (Africa)',
      [KeyType.RAZORPAY]: 'For payment processing (India)',
      [KeyType.PAYPAL]: 'For global payment processing'
    };
    return descriptions[type as KeyType] || 'API integration key';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-6 h-6 mr-2" />
            API Key Management (BYOK)
          </CardTitle>
          <p className="text-sm text-gray-600">
            Securely store your own API keys for third-party integrations. All keys are encrypted before storage.
          </p>
        </CardHeader>
        <CardContent>
          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Security Notice</p>
                <p className="text-blue-700">
                  Your API keys are encrypted using AES-256-GCM before being stored. They are never transmitted or stored in plain text.
                  Only you can decrypt and use your keys.
                </p>
              </div>
            </div>
          </div>

          {/* Add New Key Button */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Your API Keys</h3>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : 'Add New Key'}
            </Button>
          </div>

          {/* Add Key Form */}
          {showAddForm && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Service Type</Label>
                    <Select value={newKey.type} onValueChange={(value: KeyType) => setNewKey({...newKey, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(KeyType).map(type => (
                          <SelectItem key={type} value={type}>
                            {getKeyTypeDisplay(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={newKey.value}
                      onChange={(e) => setNewKey({...newKey, value: e.target.value})}
                      placeholder="Enter your API key"
                    />
                  </div>
                  <div>
                    <Label>Rate Limit</Label>
                    <Input
                      type="number"
                      value={newKey.rateLimit}
                      onChange={(e) => setNewKey({...newKey, rateLimit: Number(e.target.value)})}
                      placeholder="1000"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleAddKey} disabled={!newKey.type || !newKey.value}>
                    Store Key Securely
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Keys List */}
          {keys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No API keys configured</p>
              <p className="text-sm">Add your first API key to start using integrated services</p>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map(key => (
                <Card key={key.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <h4 className="font-medium">{getKeyTypeDisplay(key.key_type)}</h4>
                          {key.quota_remaining !== undefined && key.quota_remaining <= 10 && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500 ml-2" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{getKeyDescription(key.key_type)}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Usage: {key.usage_count}</span>
                          {key.quota_remaining !== undefined && (
                            <span>Quota: {key.quota_remaining}/{key.rate_limit}</span>
                          )}
                          <span>Added: {new Date(key.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefreshQuota(key.id, key.key_type)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteKey(key.id, key.key_type)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyManagementModule;