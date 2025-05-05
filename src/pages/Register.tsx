
import React from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { RegisterForm } from '@/components/auth/RegisterForm';

export function Register() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}

export default Register;
