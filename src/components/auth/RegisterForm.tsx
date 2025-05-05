
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AtSign, Lock, Mail, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const registerFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers and underscores' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' })
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    
    try {
      // TODO: Replace with actual API call to register users
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Simulate validation for email already registered
      if (data.email === 'test@example.com') {
        toast({
          variant: 'destructive',
          title: 'Registration failed',
          description: 'Email is already registered',
        });
        return;
      }
      
      // Simulate validation for username taken
      if (data.username === 'admin') {
        toast({
          variant: 'destructive',
          title: 'Registration failed',
          description: 'Username is already taken',
        });
        return;
      }
      
      toast({
        title: 'Registration successful!',
        description: 'Your account has been created.',
      });
      
      // Redirect to login after successful registration
      // navigate('/login');
      console.log('Registration successful', data);
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: 'Something went wrong. Please try again.',
      });
      console.error('Registration error', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold social-gradient bg-clip-text text-transparent">Create Account</h1>
        <p className="text-muted-foreground mt-2">Join our social community today</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <div className="flex items-center border rounded-md bg-muted/40 focus-within:ring-1 focus-within:ring-ring">
                    <User className="ml-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Enter your full name" 
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="flex items-center border rounded-md bg-muted/40 focus-within:ring-1 focus-within:ring-ring">
                    <Mail className="ml-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Enter your email address" 
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
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <div className="flex items-center border rounded-md bg-muted/40 focus-within:ring-1 focus-within:ring-ring">
                    <AtSign className="ml-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Choose a unique username" 
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
                      placeholder="Create a strong password" 
                      className="border-0 bg-transparent focus-visible:ring-0" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full mt-6 btn-gradient"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>
      </Form>
      
      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Already have an account?</span>{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default RegisterForm;
