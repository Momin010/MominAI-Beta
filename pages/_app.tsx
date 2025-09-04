import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'

export default function App({ Component, pageProps }: AppProps) {
  console.log('App component rendered');
  return (
    <ThemeProvider attribute="class">
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
          },
        }}
      />
    </ThemeProvider>
  )
}