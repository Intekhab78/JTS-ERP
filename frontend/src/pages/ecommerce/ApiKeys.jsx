import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Key, Copy, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/common/EmptyState';
import { Input } from '../../components/ui/Input';

const ApiKeys = () => {
  const [keys, setKeys] = useState([]);
  const [copied, setCopied] = useState(null);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/ecommerce-admin/apikeys', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setKeys(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerate = async () => {
    try {
      await axios.post('http://localhost:5000/api/v1/ecommerce-admin/apikeys', { name: 'E-Commerce Storefront' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchKeys();
    } catch (error) {
      alert('Failed to generate key');
    }
  };

  const handleCopy = (keyText) => {
    navigator.clipboard.writeText(keyText);
    setCopied(keyText);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start mb-2">
        <PageHeader 
          title="API Keys"
          description="Manage secure access keys for your external e-commerce storefront."
          icon={<Key className="text-blue-600 h-8 w-8" />}
        />
        {hasPermission('CREATE_ECOMMERCE') && (
          <Button onClick={handleGenerate} size="lg" className="mt-2">
            Generate New Key
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="p-6">
          <Alert variant="info" title="Security Notice" className="mb-6">
            These keys provide direct access to your ERP's public catalog and allow order submission. Keep them secret and only use them in secure backend environments (like a Next.js API route), never expose them in client-side browser code.
          </Alert>

          {keys.map(k => (
            <div key={k._id} className="mb-6 last:mb-0 p-5 bg-muted/30 rounded-xl border border-border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-extrabold text-foreground text-lg">{k.name}</h4>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Created {format(new Date(k.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              
              <div className="relative mt-2">
                <Input 
                  type="text" 
                  readOnly 
                  value={k.key} 
                  className="font-mono pr-12"
                />
                <button 
                  onClick={() => handleCopy(k.key)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copied === k.key ? <CheckCircle size={18} className="text-emerald-500" /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          ))}

          {keys.length === 0 && (
            <EmptyState 
              icon={<Key size={48} className="text-muted-foreground" />}
              title="No API Keys Generated"
              description="Click the button above to generate your first API key for storefront integration."
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default ApiKeys;
