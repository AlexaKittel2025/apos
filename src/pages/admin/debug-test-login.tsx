import { useState } from 'react';
import axios from 'axios';

export default function DebugTestLogin() {
  const [email, setEmail] = useState('financeiro@pedirsanto.com');
  const [password, setPassword] = useState('sosederbelE@1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleTestLogin = async () => {
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await axios.post('/api/debug/test-login', {
        email,
        password
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro na autenticação');
      console.error('Erro na autenticação:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Testar Autenticação (Debug)</h1>
        
        <form className="space-y-4 mb-6" onSubmit={(e) => { e.preventDefault(); handleTestLogin(); }}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600"
          >
            {loading ? 'Testando...' : 'Testar Autenticação'}
          </button>
        </form>
        
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
        
        <div className="mt-4 text-center">
          <a 
            href="/admin/debug" 
            className="text-green-400 hover:text-green-300"
          >
            Voltar para ferramentas de depuração
          </a>
        </div>
      </div>
    </div>
  );
} 