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
  console.log('Test connection API called');
  console.log('Environment variables:', {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
    supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing',
  });
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing Supabase connection...');
    // Test basic connection with rooms table
    const { data: tables, error: tablesError } = await supabase
      .from('rooms')
      .select('count', { count: 'exact', head: true });

    if (tablesError) {
      return res.status(500).json({
        error: 'Database connection failed',
        details: tablesError.message
      });
    }

    // Test authentication
    const { data: authTest, error: authError } = await supabase.auth.admin.listUsers();

    const authWorking = !authError;

    // Test new tables
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('count', { count: 'exact', head: true });

    const { data: sessions, error: sessionsError } = await supabase
      .from('backend_execution_sessions')
      .select('count', { count: 'exact', head: true });

    return res.status(200).json({
      status: 'success',
      database: {
        connected: true,
        tables: {
          rooms: !tablesError,
          backend_execution_sessions: !sessionsError
        }
      },
      authentication: {
        working: authWorking,
        error: authError?.message
      },
      realtime: {
        available: false,
        note: 'Using polling fallback for room messages'
      },
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
        supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
        openai_key: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}