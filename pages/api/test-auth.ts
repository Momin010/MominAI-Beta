import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test Supabase connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('rooms')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      return res.status(500).json({
        error: 'Database connection failed',
        details: connectionError.message
      });
    }

    // Test authentication setup
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 10
    });

    const authWorking = !authError;

    // Check if there are any existing users
    const userCount = authUsers?.users?.length || 0;

    return res.status(200).json({
      status: 'success',
      database: {
        connected: true,
        tables: 'accessible'
      },
      authentication: {
        working: authWorking,
        userCount: userCount,
        error: authError?.message
      },
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
        supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      },
      instructions: {
        createAccount: userCount === 0 ? 'No users found. Try signing up first.' : 'Users exist. Try logging in.',
        checkSupabase: 'Verify email auth is enabled in Supabase dashboard'
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Auth test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}