
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AtSign, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const loginFormSchema = z.object({
  username: z.string().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    
    try {
      // TODO: Replace with actual API call to authenticate users
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Simulate validation for non-existent user
      if (data.username !== 'demo') {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'Username not found',
        });
        return;
      }
      
      // Simulate validation for incorrect password
      if (data.password !== 'password123') {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'Incorrect password',
        });
        return;
      }
      
      toast({
        title: 'Login successful!',
        description: 'Welcome back to PixelChat.',
      });
      
      // Redirect to dashboard after successful login
      // navigate('/dashboard');
      console.log('Login successful', data);
      
      // Set mock JWT token
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: '1',
        name: 'Demo User',
        username: 'demo',
        email: 'demo@example.com',
        avatar: 'https://i.pravatar.cc/150?u=demo'
      }));
      
      // Force reload to update auth state
      window.location.href = '/dashboard';
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: 'Something went wrong. Please try again.',
      });
      console.error('Login error', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold social-gradient bg-clip-text text-transparent">Welcome Back</h1>
        <p className="text-muted-foreground mt-2">Sign in to your account</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <div className="flex items-center border rounded-md bg-muted/40 focus-within:ring-1 focus-within:ring-ring">
                    <AtSign className="ml-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Enter your username" 
                      className="border-0 bg-transparent focus-visible:ring-0" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="flex items-center border rounded-md bg-muted/40 focus-within:ring-1 focus-within:ring-ring">
                    <Lock className="ml-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="password" 
                      placeholder="Enter your password" 
                      className="border-0 bg-transparent focus-visible:ring-0" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          
          <Button 
            type="submit" 
            className="w-full mt-6 btn-gradient"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Form>
      
      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Don't have an account?</span>{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </div>

      <div className="mt-8 p-4 bg-muted/30 rounded-lg border">
        <p className="text-sm text-center text-muted-foreground">
          <strong>Demo credentials:</strong> username: demo, password: password123
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
