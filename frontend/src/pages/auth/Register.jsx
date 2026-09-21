import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { ArrowRight } from 'lucide-react';

const Register = ({ onToggle }) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', tenantName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data } = await axios.post('http://localhost:5000/api/v1/auth/register', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ email: data.email, tenantId: data.tenantId }));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register tenant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Create Tenant</h2>
        <p className="text-sm font-semibold text-muted-foreground">Set up your company workspace and Super Admin account.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Company Name" required>
          <Input 
            type="text" 
            required
            placeholder="e.g. Acme Corp"
            value={formData.tenantName} 
            onChange={(e) => setFormData({...formData, tenantName: e.target.value})}
            disabled={loading}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" required>
            <Input 
              type="text" 
              required
              placeholder="First"
              value={formData.firstName} 
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              disabled={loading}
            />
          </FormField>
          
          <FormField label="Last Name" required>
            <Input 
              type="text" 
              required
              placeholder="Last"
              value={formData.lastName} 
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              disabled={loading}
            />
          </FormField>
        </div>

        <FormField label="Admin Email" required>
          <Input 
            type="email" 
            required
            placeholder="admin@company.com"
            value={formData.email} 
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            disabled={loading}
          />
        </FormField>

        <FormField label="Secure Password" required>
          <Input 
            type="password" 
            required
            placeholder="••••••••"
            value={formData.password} 
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            disabled={loading}
          />
        </FormField>

        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20"
          >
            {loading ? 'Provisioning...' : 'Create Workspace'}
            {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
          </Button>
        </div>
      </form>

      <p className="text-center text-xs font-semibold text-muted-foreground mt-8">
        Already have a tenant workspace?{' '}
        <button 
          type="button" 
          onClick={() => onToggle('/login')} 
          className="text-primary font-bold hover:underline underline-offset-4 ml-1"
        >
          Sign In Instead
        </button>
      </p>
    </div>
  );
};

export default Register;
