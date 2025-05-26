
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { registerUser } from '@/utils/authUtils';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

export function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return false;
    }

    if (formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return false;
    }

    if (!formData.username.trim()) {
      setError('Please choose a username');
      return false;
    }

    if (formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      setError('Username can only contain letters, numbers, and underscores');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.password.trim()) {
      setError('Please enter a password');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      await registerUser(
        formData.email.trim(),
        formData.password,
        formData.name.trim(),
        formData.username.trim()
      );
      
      toast({
        title: 'Account created successfully!',
        description: 'Welcome to SocialChat! You can now start connecting with friends.',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Provide specific error messages
      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        setError('An account with this email already exists. Please try logging in instead.');
      } else if (error.message?.includes('password')) {
        setError('Password must be at least 6 characters long');
      } else if (error.message?.includes('email')) {
        setError('Please enter a valid email address');
      } else if (error.message?.includes('Username') || error.message?.includes('username')) {
        setError('This username is already taken. Please choose a different one.');
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Registration failed. Please try again or contact support@socialchat.site if the problem persists.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user starts typing
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '' };
    if (password.length < 6) return { strength: 1, text: 'Too short' };
    if (password.length < 8) return { strength: 2, text: 'Weak' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: 4, text: 'Strong' };
    }
    return { strength: 3, text: 'Good' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center font-pixelated social-gradient bg-clip-text text-transparent">
          Join SocialChat
        </CardTitle>
        <p className="text-center text-muted-foreground font-pixelated text-sm">
          Create your account to start connecting
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="font-pixelated text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-pixelated">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="font-pixelated"
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="font-pixelated">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Choose a username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
              className="font-pixelated"
              disabled={loading}
              autoComplete="username"
            />
            {formData.username && formData.username.length >= 3 && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span className="font-pixelated">Username available</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="font-pixelated">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="font-pixelated"
              disabled={loading}
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="font-pixelated">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="font-pixelated pr-10"
                disabled={loading}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {formData.password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        level <= passwordStrength.strength
                          ? level <= 2
                            ? 'bg-red-500'
                            : level === 3
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs font-pixelated text-muted-foreground">
                  Password strength: {passwordStrength.text}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="font-pixelated">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="font-pixelated pr-10"
                disabled={loading}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span className="font-pixelated">Passwords match</span>
              </div>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full btn-gradient font-pixelated"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground font-pixelated">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <div className="bg-muted p-3 rounded-lg">
          <p className="text-xs font-pixelated text-muted-foreground text-center">
            Need help? Contact{' '}
            <a href="mailto:support@socialchat.site" className="text-primary underline">
              support@socialchat.site
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
