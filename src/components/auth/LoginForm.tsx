
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AtSign, Lock, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '@/utils/authUtils';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    
    try {
      await loginUser(data.email, data.password);
      
      toast({
        title: 'Login successful!',
        description: 'Welcome back to SocialChat.',
      });
      
      // Redirect to dashboard after successful login
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error', error);
      
      // Handle specific error cases
      if (error.message.includes('Invalid login')) {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'Incorrect email or password',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: error.message || 'Something went wrong. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4 animate-pulse-dot">
          <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-20 w-auto" />
        </div>
        <h1 className="text-3xl font-bold font-pixelated social-gradient bg-clip-text text-transparent">Welcome Back</h1>
        <p className="text-muted-foreground mt-2 font-pixelated">Sign in to your account</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-pixelated">Email</FormLabel>
                <FormControl>
                  <div className="flex items-center border rounded-md bg-muted/40 focus-within:ring-1 focus-within:ring-ring pixel-border">
                    <Mail className="ml-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Enter your email address" 
                      className="border-0 bg-transparent focus-visible:ring-0 font-pixelated" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage className="font-pixelated" />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-pixelated">Password</FormLabel>
                <FormControl>
                  <div className="flex items-center border rounded-md bg-muted/40 focus-within:ring-1 focus-within:ring-ring pixel-border">
                    <Lock className="ml-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="password" 
                      placeholder="Enter your password" 
                      className="border-0 bg-transparent focus-visible:ring-0 font-pixelated" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage className="font-pixelated" />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline font-pixelated">
              Forgot password?
            </Link>
          </div>
          
          <Button 
            type="submit" 
            className="w-full mt-6 btn-gradient font-pixelated pixel-shadow"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Form>
      
      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground font-pixelated">Don't have an account?</span>{' '}
        <Link to="/register" className="font-medium text-primary hover:underline font-pixelated">
          Sign up
        </Link>
      </div>
    </div>
  );
}

export default LoginForm;
