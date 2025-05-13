import { useState } from 'react';
import axios from 'axios';

export default function DebugCreateAdmin() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCreateAdmin = async () => {
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await axios.post('/api/debug/create-admin-direct');
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar usuário administrador');
      console.error('Erro ao criar usuário administrador:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Criar Usuário Administrador (Debug)</h1>
        
        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Esta página criará um usuário administrador com as seguintes credenciais:
          </p>
          
          <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <div className="mb-2">
              <span className="text-gray-400">Nome:</span> <span className="text-white">Financeiro</span>
            </div>
            <div className="mb-2">
              <span className="text-gray-400">Email:</span> <span className="text-white">financeiro@pedirsanto.com</span>
            </div>
            <div className="mb-2">
              <span className="text-gray-400">Senha:</span> <span className="text-white">sosederbelE@1</span>
            </div>
            <div>
              <span className="text-gray-400">Função:</span> <span className="text-green-400">ADMIN</span>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {result && (
          <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-300 px-4 py-2 rounded-lg mb-4">
            <div className="font-semibold mb-2">{result.message}</div>
            {result.user && (
              <div className="text-sm">
                <div>ID: {result.user.id}</div>
                <div>Nome: {result.user.name}</div>
                <div>Email: {result.user.email}</div>
                <div>Função: {result.user.role}</div>
              </div>
            )}
          </div>
        )}
        
        <button
          onClick={handleCreateAdmin}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-600"
        >
          {loading ? 'Criando...' : 'Criar Administrador (Debug)'}
        </button>
        
        <div className="mt-4 text-center">
          <a 
            href="/admin/debug-users" 
            className="text-green-400 hover:text-green-300"
          >
            Ver Usuários Cadastrados
          </a>
        </div>
      </div>
    </div>
  );
} 