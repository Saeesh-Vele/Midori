// API Configuration for InnovateX
export const API_CONFIG = {
  // Supabase Server (Real Data)
  SUPABASE_SERVER: 'http://localhost:5002',
  
  // Simple Mock Server (Fallback)
  MOCK_SERVER: 'http://localhost:5001',
  
  // Current active server
  ACTIVE_SERVER: 'http://localhost:5001',
  
  // Supabase Configuration
  SUPABASE: {
    URL: 'https://uvvkxgcrdoocjhdptxfc.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dmt4Z2NyZG9vY2poZHB0eGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjU1MjQsImV4cCI6MjA3NDMwMTUyNH0.i0VetNrVePd82lu3UfE5UThUK6Fyw8Ntx5k8ZbdLNSg',
    PROJECT_ID: 'uvvkxgcrdoocjhdptxfc'
  }
};

// Helper function to get the current API base URL
export const getApiBaseUrl = () => API_CONFIG.ACTIVE_SERVER;
