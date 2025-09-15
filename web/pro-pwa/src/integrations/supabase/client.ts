// REMOVED: Supabase completely removed - USE MICROSERVICES ONLY

// This file now throws an error if any code tries to use Supabase
// All authentication MUST go through our microservices

const throwError = (method: string) => {
  throw new Error(`Supabase ${method} removed. Use AuthService microservice instead.`);
};

export const supabase = {
  auth: {
    getSession: () => throwError('auth.getSession'),
    signOut: () => throwError('auth.signOut'),
    signInWithPassword: () => throwError('auth.signInWithPassword'),
    signUp: () => throwError('auth.signUp'),
    updateUser: () => throwError('auth.updateUser'),
    resetPasswordForEmail: () => throwError('auth.resetPasswordForEmail'),
    admin: {
      deleteUser: () => throwError('auth.admin.deleteUser')
    }
  },
  functions: {
    invoke: (fn: string) => throwError(`functions.invoke('${fn}')`)
  }
} as any;