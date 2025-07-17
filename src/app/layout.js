
import './globals.css';

import { AuthProvider } from '../app/contexts/AuthContext'; // Importa o AuthProvider
import { app } from '../app/lib/firebase'; // Garante que o Firebase app seja inicializado
import { Toaster } from 'react-hot-toast'; // Importa o Toaster para mensagens



export const metadata = {
  title: 'Zenith - DevConnect Social',
  description: 'Plataforma social para desenvolvedores e profissionais de tecnologia.',
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          
          <div className="flex flex-col min-h-screen">
            
            
            <main className="flex-grow">
              
              {children}
            </main>
            
          </div>
          <Toaster /> 
        </AuthProvider>
      </body>
    </html>
  );
}