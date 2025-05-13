'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useBalance } from '@/lib/BalanceContext';
import ChatSupport from '@/components/ChatSupport';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { userBalance, updateBalance, refreshBalance, isLoadingBalance } = useBalance();
  
  // Referência para o input de detalhes de saque
  const withdrawDetailsRef = React.useRef<HTMLInputElement>(null);
  
  // Estados para os modais
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  
  // Estados para os formulários
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDetailsValue, setWithdrawDetailsValue] = useState('');
  
  // Estados para feedback
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estado para as transações do usuário
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Atualizar formulário quando a sessão for carregada
  useEffect(() => {
    if (session && session.user) {
      setEditForm({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '',
        address: '',
      });
      
      // Carregar transações do usuário
      fetchTransactions();
    }
  }, [session]);
  
  // Função utilitária para tentar uma operação várias vezes
  const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`Tentativa ${attempt + 1} falhou:`, error);
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };
  
  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);
  
  // Função para buscar transações
  const fetchTransactions = async () => {
    if (!session) return;
    
    try {
      setLoadingTransactions(true);
      
      const response = await fetch('/api/transactions');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro ao processar resposta do servidor' }));
        console.error('Erro ao carregar transações:', errorData.message);
        setErrorMessage(errorData.message || 'Erro ao carregar transações');
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }
      
      const data = await response.json();
      
      // Validar se a resposta é um array
      if (!Array.isArray(data)) {
        console.error('Resposta inválida - esperado um array de transações:', data);
        setErrorMessage('Formato de dados inválido recebido do servidor');
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }
      
      console.log('Transações carregadas com sucesso:', data.length);
      setTransactions(data);
      
      // Atualizar o saldo do usuário após buscar transações
      await refreshBalance();
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      setErrorMessage('Erro ao carregar transações. Por favor, tente novamente.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  // Se estiver carregando ou não autenticado, mostrar loading ou nada
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }
  
  if (status === 'unauthenticated' || !session) {
    return null;
  }
  
  // Funções para lidar com os formulários
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      console.log('Enviando dados para atualização:', editForm);
      
      // Usando o endpoint temporário
      const response = await fetch('/api/user/temp-update', { 
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm) 
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Erro na resposta da API:', responseData);
        throw new Error(responseData.message || 'Erro ao atualizar perfil');
      }
      
      console.log('Perfil atualizado com sucesso:', responseData);
      
      // Atualizar os dados da sessão para refletir as mudanças
      if (session && session.user) {
        session.user.name = responseData.name || session.user.name;
      }
      
      setSuccessMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      setErrorMessage(error.message || 'Erro ao atualizar perfil. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Aqui você implementaria a chamada de API para recarregar o saldo
      // const response = await fetch('/api/transactions/recharge', { method: 'POST', body: JSON.stringify({ amount: rechargeAmount }) });
      
      // Simulando sucesso
      const amount = parseFloat(rechargeAmount);
      updateBalance(userBalance + amount);
      setSuccessMessage(`Recarga de R$ ${amount.toFixed(2)} realizada com sucesso!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowRechargeModal(false);
      setRechargeAmount('');
    } catch (error) {
      setErrorMessage('Erro ao processar recarga. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };
  
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const amount = parseFloat(withdrawAmount);
    
    // Limpar mensagens anteriores
    setErrorMessage('');
    setSuccessMessage('');
    
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Valor de saque inválido. Por favor, insira um valor positivo.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    
    if (amount > userBalance) {
      setErrorMessage('Saldo insuficiente para realizar este saque.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    if (!withdrawDetailsValue) {
      setErrorMessage('Por favor, informe os dados para o saque (chave PIX ou dados bancários).');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    
    try {
      setLoading(true);
      
      // Obter o método de saque selecionado
      const methodElement = document.querySelector('input[name="withdrawMethod"]:checked') as HTMLInputElement;
      const method = methodElement ? methodElement.id : 'pixWithdraw';
      
      console.log('Enviando solicitação de saque:', {
        amount,
        type: 'WITHDRAWAL',
        pixKey: withdrawDetailsValue,
        method
      });
      
      // Usar o mecanismo de retry para transações
      const response = await retryOperation(async () => {
        const resp = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            amount: amount,
            type: 'WITHDRAWAL',
            pixKey: withdrawDetailsValue,
            method: method
          }),
        });
        
        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({ message: 'Erro ao processar resposta do servidor' }));
          console.error('Resposta de erro completa:', errorData);
          throw new Error(errorData.message || 'Erro ao processar saque');
        }
        
        return resp;
      }, 2); // tentar no máximo 2 vezes
      
      // Se chegou aqui, o saque foi processado com sucesso
      const transactionData = await response.json();
      console.log('Saque processado com sucesso:', transactionData);
      
      // Limpar formulário
      setWithdrawAmount('');
      setWithdrawDetailsValue('');
      
      // Atualizar o saldo imediatamente
      updateBalance(userBalance - amount);
      
      // Mostrar mensagem de sucesso
      setSuccessMessage(`Saque de R$ ${amount.toFixed(2)} solicitado com sucesso! Status: Pendente`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Fechar modal
      setShowWithdrawModal(false);
      
      // Recarregar transações para mostrar o novo saque
      fetchTransactions();
    } catch (error: any) {
      console.error('Erro ao processar saque:', error);
      setErrorMessage(error.message || 'Erro ao processar saque. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para formatação de dados de transação
  const getTransactionDescription = (transaction: any) => {
    if (!transaction) return 'Desconhecido';
    
    try {
      // Tentar extrair detalhes se existirem e forem uma string JSON válida
      let details = {};
      
      if (transaction.details) {
        if (typeof transaction.details === 'string') {
          details = JSON.parse(transaction.details);
        } else if (typeof transaction.details === 'object') {
          details = transaction.details;
        }
      }
      
      if (transaction.type === 'DEPOSIT') {
        const methodName = (details as any)?.method || 'PIX';
        return `Depósito via ${methodName === 'pix' ? 'PIX' : methodName}`;
      } else {
        const pixKey = (details as any)?.pixKey || 'conta bancária';
        const methodName = (details as any)?.method || 'pixWithdraw';
        return `Saque para ${pixKey} via ${methodName === 'pixWithdraw' ? 'PIX' : methodName === 'bankAccount' ? 'Conta Bancária' : methodName}`;
      }
    } catch (error) {
      console.error('Erro ao analisar detalhes da transação:', error);
      // Em caso de erro na análise JSON, retornar descrição padrão
      return transaction.type === 'DEPOSIT' ? 'Depósito' : 'Saque';
    }
  };
  
  // Componente para mostrar mensagens de sucesso/erro
  const AlertMessage = ({ message, type }: { message: string, type: 'success' | 'error' }) => {
    if (!message) return null;
    
    return (
      <div className={`p-3 rounded-md mb-4 ${type === 'success' ? 'bg-[#3bc37a]' : 'bg-red-500'} bg-opacity-10 border ${type === 'success' ? 'border-[#3bc37a]' : 'border-red-500'}`}>
        <p className={`text-sm ${type === 'success' ? 'text-[#3bc37a]' : 'text-red-400'}`}>{message}</p>
      </div>
    );
  };
  
  // Componente de carregamento
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
    </div>
  );
  
  // Componente de Modal
  const Modal = ({ title, isOpen, onClose, children }: { title: string, isOpen: boolean, onClose: () => void, children: React.ReactNode }) => {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 transition-all duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      >
        <div
          className="bg-[#121212] rounded-lg shadow-xl max-w-md w-full border border-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-medium">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Mensagens de alerta */}
      {successMessage && <AlertMessage message={successMessage} type="success" />}
      {errorMessage && <AlertMessage message={errorMessage} type="error" />}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cartão de informações do usuário */}
        <Card variant="bordered" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Seus dados e configurações de conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row">
              <div className="mb-6 md:mb-0 md:mr-8">
                <div className="w-32 h-32 bg-[#1e1e1e] rounded-full mx-auto md:mx-0 flex items-center justify-center overflow-hidden">
                  {/* Avatar placeholder ou imagem do usuário */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Nome</p>
                    <p className="font-medium">{session.user.name || 'Não informado'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="font-medium">{session.user.email}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Telefone</p>
                    <p className="font-medium">{'Não informado'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Tipo de Conta</p>
                    <p className="font-medium">{session.user.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setShowEditModal(true)}>Editar Perfil</Button>
          </CardFooter>
        </Card>
        
        {/* Cartão de informações financeiras */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Informações Financeiras</CardTitle>
            <CardDescription>Seu saldo e transações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-1">Saldo Disponível</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] bg-clip-text text-transparent">
                {isLoadingBalance ? (
                  <span className="flex items-center">
                    <span className="mr-2 animate-spin h-4 w-4 border-t-2 border-b-2 border-green-500 rounded-full"></span>
                    Carregando...
                  </span>
                ) : `R$ ${userBalance.toFixed(2)}`}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Saques Realizados</p>
                <p className="font-medium">R$ 0,00</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-1">Recargas Feitas</p>
                <p className="font-medium">R$ 0,00</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2">
            <Button variant="primary" onClick={() => setShowChatModal(true)}>
              Fazer Recarga
            </Button>
            <Button variant="secondary" onClick={() => setShowWithdrawModal(true)}>
              Realizar Saque
            </Button>
          </CardFooter>
        </Card>
        
        {/* Histórico de Transações */}
        <Card variant="bordered" className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>Seus depósitos e saques recentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {loadingTransactions ? (
                <LoadingSpinner />
              ) : transactions.length === 0 ? (
                <div className="py-8 text-center text-gray-500">Nenhuma transação encontrada</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-sm text-gray-400">Data</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-400">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-400">Descrição</th>
                      <th className="px-4 py-3 text-right text-sm text-gray-400">Valor</th>
                      <th className="px-4 py-3 text-right text-sm text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-800">
                        <td className="px-4 py-3 text-sm">{new Date(transaction.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          {transaction.type === 'DEPOSIT' ? 'Depósito' : 'Saque'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getTransactionDescription(transaction)}
                        </td>
                        <td className={`px-4 py-3 text-sm ${transaction.type === 'DEPOSIT' ? 'text-green-400' : 'text-red-400'} text-right`}>
                          {transaction.type === 'DEPOSIT' ? '+ ' : '- '}
                          R$ {transaction.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span 
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.status === 'COMPLETED' 
                                ? 'bg-green-100 text-green-800' 
                                : transaction.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {transaction.status === 'COMPLETED' 
                              ? 'Concluído' 
                              : transaction.status === 'REJECTED'
                              ? 'Rejeitado'
                              : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" onClick={fetchTransactions}>
              Atualizar Transações
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Modal de Edição de Perfil - Reimplementado */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 transition-all duration-200 ${showEditModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowEditModal(false)}
      >
        <div
          className="bg-[#121212] rounded-lg shadow-xl max-w-md w-full border border-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-medium">Editar Perfil</h3>
            <button
              onClick={() => setShowEditModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="p-6">
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                  Nome Completo
                </label>
                <input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Seu nome completo"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="seu@email.com"
                  disabled
                  className="w-full bg-gray-700 border border-gray-700 rounded-md py-2 px-3 text-gray-400 focus:outline-none cursor-not-allowed"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-1">
                  Telefone
                </label>
                <input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="address" className="block text-sm font-medium text-gray-400 mb-1">
                  Endereço
                </label>
                <input
                  id="address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Seu endereço completo"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex justify-end mt-6 space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Modal de Recarga */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 transition-all duration-200 ${showRechargeModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowRechargeModal(false)}
      >
        <div
          className="bg-[#121212] rounded-lg shadow-xl max-w-md w-full border border-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-medium">Fazer Recarga</h3>
            <button
              onClick={() => setShowRechargeModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="p-6">
            <form onSubmit={handleRechargeSubmit}>
              <div className="mb-4">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">
                  Valor da Recarga
                </label>
                <input
                  id="amount"
                  type="number"
                  min="10"
                  step="0.01"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="mt-4 mb-4">
                <p className="text-sm text-gray-400 mb-2">Método de Pagamento</p>
                
                <div className="space-y-2">
                  <div className="flex items-center p-3 border border-gray-800 rounded-md">
                    <input
                      type="radio"
                      id="pix"
                      name="paymentMethod"
                      className="h-4 w-4 text-[#3bc37a] border-gray-600 focus:ring-[#3bc37a]"
                      defaultChecked
                    />
                    <label htmlFor="pix" className="ml-3 block text-sm">
                      PIX
                    </label>
                  </div>
                  
                  <div className="flex items-center p-3 border border-gray-800 rounded-md">
                    <input
                      type="radio"
                      id="creditCard"
                      name="paymentMethod"
                      className="h-4 w-4 text-[#3bc37a] border-gray-600 focus:ring-[#3bc37a]"
                    />
                    <label htmlFor="creditCard" className="ml-3 block text-sm">
                      Cartão de Crédito
                    </label>
                  </div>
                  
                  <div className="flex items-center p-3 border border-gray-800 rounded-md">
                    <input
                      type="radio"
                      id="bankTransfer"
                      name="paymentMethod"
                      className="h-4 w-4 text-[#3bc37a] border-gray-600 focus:ring-[#3bc37a]"
                    />
                    <label htmlFor="bankTransfer" className="ml-3 block text-sm">
                      Transferência Bancária
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-4 space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowRechargeModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors"
                >
                  Confirmar Recarga
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Modal de Saque */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 transition-all duration-200 ${showWithdrawModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowWithdrawModal(false)}
      >
        <div
          className="bg-[#121212] rounded-lg shadow-xl max-w-md w-full border border-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-medium">Realizar Saque</h3>
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="p-6">
            <form onSubmit={handleWithdrawSubmit}>
              <div className="mb-4">
                <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-400 mb-1">
                  Valor do Saque
                </label>
                <input
                  id="withdrawAmount"
                  type="number"
                  min="10"
                  max={userBalance.toString()}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="mt-4 mb-4">
                <p className="text-sm text-gray-400 mb-2">Método de Saque</p>
                
                <div className="space-y-2">
                  <div className="flex items-center p-3 border border-gray-800 rounded-md">
                    <input
                      type="radio"
                      id="pixWithdraw"
                      name="withdrawMethod"
                      className="h-4 w-4 text-[#3bc37a] border-gray-600 focus:ring-[#3bc37a]"
                      defaultChecked
                    />
                    <label htmlFor="pixWithdraw" className="ml-3 block text-sm">
                      PIX
                    </label>
                  </div>
                  
                  <div className="flex items-center p-3 border border-gray-800 rounded-md">
                    <input
                      type="radio"
                      id="bankAccount"
                      name="withdrawMethod"
                      className="h-4 w-4 text-[#3bc37a] border-gray-600 focus:ring-[#3bc37a]"
                    />
                    <label htmlFor="bankAccount" className="ml-3 block text-sm">
                      Conta Bancária
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="withdrawDetails" className="block text-sm font-medium text-gray-400 mb-1">
                  Chave PIX ou Dados Bancários
                </label>
                <input
                  id="withdrawDetails"
                  value={withdrawDetailsValue}
                  onChange={(e) => setWithdrawDetailsValue(e.target.value)}
                  placeholder="CPF, Email, Telefone ou Dados da Conta"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex justify-end mt-4 space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors disabled:bg-gray-800 disabled:text-gray-500"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors disabled:bg-gray-800 disabled:text-gray-500"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <span className="mr-2 animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Processando...
                    </span>
                  ) : 'Confirmar Saque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Modal de Chat de Suporte */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 transition-all duration-200 ${showChatModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowChatModal(false)}
      >
        <div
          className="bg-[#121212] rounded-lg shadow-xl max-w-4xl w-full border border-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-medium">Chat de Suporte - Realizar Depósito</h3>
            <button
              onClick={() => setShowChatModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="p-6">
            <ChatSupport 
              isAdmin={false} 
              title="Chat de Suporte - Realizar Depósito"
              height="400px"
              autoFocus={true}
            />
            <div className="mt-6 text-sm text-gray-400">
              <p>Entre em contato com nosso suporte para receber instruções de depósito e enviar comprovantes.</p>
              <p className="mt-2">Nosso atendimento está disponível das 8h às 22h todos os dias.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 