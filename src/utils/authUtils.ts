
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

/**
 * Checks if a user is authenticated based on the supabase session
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
};

/**
 * Retrieves the current user from supabase
 */
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

/**
 * Log out the current user
 */
export const logoutUser = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};

/**
 * Register a new user
 */
export const registerUser = async (email: string, password: string, name: string, username: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        username
      }
    }
  });

  if (error) throw error;
  return data;
};

/**
 * Login a user
 */
export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

/**
 * Get user profile data
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select();

  if (error) throw error;
  return data;
};
