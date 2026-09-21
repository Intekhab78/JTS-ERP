import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Alert } from '../../components/ui/Alert';
import { ArrowRight } from 'lucide-react';

const Login = ({ onToggle }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data } = await axios.post('http://localhost:5000/api/v1/auth/login', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ 
        email: data.email, 
        tenantId: data.tenantId,
        permissions: data.permissions || [],
        roleName: data.roleName,
        branches: data.branches || []
      }));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Welcome Back</h2>
        <p className="text-sm font-semibold text-muted-foreground">Enter your credentials to access your workspace.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField label="Email Address" required>
          <Input 
            type="email" 
            required
            placeholder="name@company.com"
            value={formData.email} 
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            disabled={loading}
          />
        </FormField>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Password</label>
            <a href="#" className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors">Forgot Password?</a>
          </div>
          <Input 
            type="password" 
            required
            placeholder="••••••••"
            value={formData.password} 
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            disabled={loading}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="remember" />
          <label htmlFor="remember" className="text-sm font-semibold text-muted-foreground cursor-pointer select-none">
            Remember Me
          </label>
        </div>

        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
          </Button>
        </div>
      </form>

      <p className="text-center text-xs font-semibold text-muted-foreground mt-8">
        Don't have an account?{' '}
        <button 
          type="button" 
          onClick={() => onToggle('/register')} 
          className="text-primary font-bold hover:underline underline-offset-4 ml-1"
        >
          Request Access
        </button>
      </p>
    </div>
  );
};

export default Login;
