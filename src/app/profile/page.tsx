'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useBalance } from '@/lib/BalanceContext';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { userBalance, updateBalance } = useBalance();
  
  // Estados para os modais
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  // Estados para os formulários
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  // Estados para feedback
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Atualizar formulário quando a sessão for carregada
  useEffect(() => {
    if (session && session.user) {
      setEditForm({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '',
        address: '',
      });
    }
  }, [session]);
  
  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);
  
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
    try {
      // Aqui você implementaria a chamada de API para atualizar o perfil
      // const response = await fetch('/api/user/update', { method: 'POST', body: JSON.stringify(editForm) });
      
      // Simulando sucesso
      setSuccessMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowEditModal(false);
    } catch (error) {
      setErrorMessage('Erro ao atualizar perfil. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };
  
  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const amount = parseFloat(withdrawAmount);
    
    if (amount > userBalance) {
      setErrorMessage('Saldo insuficiente para realizar este saque.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    try {
      // Aqui você implementaria a chamada de API para sacar
      // const response = await fetch('/api/transactions/withdraw', { method: 'POST', body: JSON.stringify({ amount: withdrawAmount }) });
      
      // Simulando sucesso
      updateBalance(userBalance - amount);
      setSuccessMessage(`Saque de R$ ${amount.toFixed(2)} solicitado com sucesso!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    } catch (error) {
      setErrorMessage('Erro ao processar saque. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 3000);
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
  
  // Componente de Modal
  const Modal = ({ title, isOpen, onClose, children }: { title: string, isOpen: boolean, onClose: () => void, children: React.ReactNode }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
        <div className="bg-[#121212] rounded-lg shadow-xl max-w-md w-full border border-gray-800">
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
                R$ {userBalance.toFixed(2)}
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
            <Button variant="primary" onClick={() => setShowRechargeModal(true)}>
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
            <CardDescription>Seus movimentos financeiros recentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-3 text-sm">01/06/2023</td>
                    <td className="px-4 py-3 text-sm">Recarga</td>
                    <td className="px-4 py-3 text-sm">Depósito via PIX</td>
                    <td className="px-4 py-3 text-sm text-green-400 text-right">+ R$ 100,00</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Concluído
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-3 text-sm">03/06/2023</td>
                    <td className="px-4 py-3 text-sm">Saque</td>
                    <td className="px-4 py-3 text-sm">Transferência para conta</td>
                    <td className="px-4 py-3 text-sm text-red-400 text-right">- R$ 50,00</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Concluído
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">10/06/2023</td>
                    <td className="px-4 py-3 text-sm">Aposta</td>
                    <td className="px-4 py-3 text-sm">Jogo #1234</td>
                    <td className="px-4 py-3 text-sm text-red-400 text-right">- R$ 20,00</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Concluído
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" href="/transactions">
              Ver Todas as Transações
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Modal de Edição de Perfil */}
      <Modal
        title="Editar Perfil"
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      >
        <form onSubmit={handleEditSubmit}>
          <Input
            label="Nome Completo"
            id="name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Seu nome completo"
          />
          
          <Input
            label="Email"
            id="email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            placeholder="seu@email.com"
            disabled
          />
          
          <Input
            label="Telefone"
            id="phone"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
          
          <Input
            label="Endereço"
            id="address"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            placeholder="Seu endereço completo"
          />
          
          <div className="flex justify-end mt-4 space-x-2">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => setShowEditModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>
      
      {/* Modal de Recarga */}
      <Modal
        title="Fazer Recarga"
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
      >
        <form onSubmit={handleRechargeSubmit}>
          <Input
            label="Valor da Recarga"
            id="amount"
            type="number"
            min="10"
            step="0.01"
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            placeholder="0,00"
          />
          
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
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => setShowRechargeModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Confirmar Recarga</Button>
          </div>
        </form>
      </Modal>
      
      {/* Modal de Saque */}
      <Modal
        title="Realizar Saque"
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
      >
        <form onSubmit={handleWithdrawSubmit}>
          <Input
            label="Valor do Saque"
            id="withdrawAmount"
            type="number"
            min="10"
            max={userBalance.toString()}
            step="0.01"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="0,00"
          />
          
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
          
          <Input
            label="Chave PIX ou Dados Bancários"
            id="withdrawDetails"
            placeholder="CPF, Email, Telefone ou Dados da Conta"
          />
          
          <div className="flex justify-end mt-4 space-x-2">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => setShowWithdrawModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Confirmar Saque</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
} 