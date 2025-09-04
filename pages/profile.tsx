import Head from 'next/head';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Profile() {
  const session = useSession();
  const router = useRouter();
  const [vercelToken, setVercelToken] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('vercel_token');
    if (token) {
      setVercelToken(token);
    }
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  const handleSaveToken = () => {
    localStorage.setItem('vercel_token', vercelToken);
    toast.success('Vercel token saved!');
  };

  const user = session?.user;
  const username = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'N/A';
  const email = user?.email || 'N/A';
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Head>
        <title>Profile - MominAI Sandbox</title>
      </Head>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8"
            >
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                  <p className="mt-1 text-lg text-gray-900 dark:text-white">{username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <p className="mt-1 text-lg text-gray-900 dark:text-white">{email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Created</label>
                  <p className="mt-1 text-lg text-gray-900 dark:text-white">{createdAt}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vercel Token</label>
                  <input
                    type="password"
                    value={vercelToken}
                    onChange={(e) => setVercelToken(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter your Vercel token"
                  />
                  <button
                    onClick={handleSaveToken}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save Token
                  </button>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                className="mt-8 w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                Log Out
              </motion.button>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}