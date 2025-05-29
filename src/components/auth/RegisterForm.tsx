import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | 'idle'>('idle');
  const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'taken' | 'idle'>('idle');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check username availability
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username.toLowerCase())
          .single();

        if (error && error.code === 'PGRST116') {
          // No rows returned - username is available
          setUsernameStatus('available');
        } else if (data) {
          // Username exists
          setUsernameStatus('taken');
        }
      } catch (error) {
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  // Check email availability
  useEffect(() => {
    if (!email.includes('@')) {
      setEmailStatus('idle');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setEmailStatus('checking');
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: 'dummy_password_for_check'
        });

        if (error?.message?.includes('Invalid login credentials')) {
          // Email not found - available
          setEmailStatus('available');
        } else if (error?.message?.includes('Email not confirmed')) {
          // Email exists but not confirmed
          setEmailStatus('taken');
        } else {
          // Other error or success means email exists
          setEmailStatus('taken');
        }
      } catch (error) {
        setEmailStatus('idle');
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Final validation
      if (!email || !password || !name || !username) {
        throw new Error('Please fill in all fields');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (usernameStatus === 'taken') {
        throw new Error('Username is already taken');
      }

      if (emailStatus === 'taken') {
        throw new Error('An account with this email already exists');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            username: username.toLowerCase().trim(),
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        setRegistrationSuccess(true);
        toast({
          title: 'Registration successful!',
          description: 'Please check your email to confirm your account before logging in.',
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration',
      });
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-pixelated social-gradient bg-clip-text text-transparent">
            Check Your Email
          </CardTitle>
          <CardDescription className="font-pixelated">
            We've sent you a confirmation email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="font-pixelated text-sm text-muted-foreground">
              Please check your email inbox (and spam folder) for a confirmation link.
            </p>
            <p className="font-pixelated text-sm text-muted-foreground">
              After confirming your email, you can log in to your account.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full font-pixelated"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-pixelated social-gradient bg-clip-text text-transparent">
          Create Account
        </CardTitle>
        <CardDescription className="font-pixelated">
          Join our social community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-pixelated">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="font-pixelated"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username" className="font-pixelated">Username</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                className="font-pixelated pr-10"
              />
              {username.length >= 3 && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {usernameStatus === 'taken' && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {username.length >= 3 && (
              <p className={`font-pixelated text-xs ${
                usernameStatus === 'available' ? 'text-green-600' :
                usernameStatus === 'taken' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {usernameStatus === 'checking' && 'Checking availability...'}
                {usernameStatus === 'available' && 'Username is available'}
                {usernameStatus === 'taken' && 'Username is already taken'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-pixelated">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-pixelated pr-10"
              />
              {email.includes('@') && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {emailStatus === 'checking' && (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  )}
                  {emailStatus === 'available' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {emailStatus === 'taken' && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {email.includes('@') && (
              <p className={`font-pixelated text-xs ${
                emailStatus === 'available' ? 'text-green-600' :
                emailStatus === 'taken' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {emailStatus === 'checking' && 'Checking availability...'}
                {emailStatus === 'available' && 'Email is available'}
                {emailStatus === 'taken' && 'Email is already registered'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-pixelated">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="font-pixelated pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {password.length > 0 && (
              <p className={`font-pixelated text-xs ${
                password.length >= 6 ? 'text-green-600' : 'text-red-600'
              }`}>
                Password must be at least 6 characters
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated" 
            disabled={loading || usernameStatus === 'taken' || emailStatus === 'taken' || usernameStatus === 'checking' || emailStatus === 'checking'}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="font-pixelated text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-social-green hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
