import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useState, useEffect, ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

export default function TutorialPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Verificar autenticação
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-2xl">Carregando...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  // Componente para cada seção do tutorial
  const TutorialSection = ({ 
    title, 
    description, 
    children 
  }: { 
    title: string; 
    description: string; 
    children: ReactNode; 
  }) => (
    <Card variant="bordered" className="mb-8">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] bg-clip-text text-transparent">{title}</h3>
        <p className="text-gray-300 mb-4">{description}</p>
        <div className="mt-4">{children}</div>
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Como Jogar no din-din</h1>
          <p className="text-gray-400">Aprenda as regras e dicas para jogar e maximizar seus ganhos</p>
        </div>

        <TutorialSection 
          title="Introdução ao Jogo" 
          description="O din-din oferece um jogo de apostas dinâmico. Entenda os conceitos básicos para começar."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#121212] p-4 rounded-lg border border-gray-800">
              <h4 className="font-medium mb-2">O que é o jogo?</h4>
              <p className="text-sm text-gray-300">
                O din-din é um jogo de apostas onde você precisa prever se a linha gráfica irá 
                terminar acima ou abaixo de um determinado valor. Uma nova rodada acontece a cada 
                poucos segundos, dando múltiplas oportunidades para apostar.
              </p>
            </div>
            <div className="bg-[#121212] p-4 rounded-lg border border-gray-800">
              <h4 className="font-medium mb-2">Como funciona?</h4>
              <p className="text-sm text-gray-300">
                Cada rodada tem três fases:
                <br />1. Fase de apostas (30 segundos)
                <br />2. Fase de execução (10 segundos)
                <br />3. Fase de resultados (alguns segundos)
              </p>
            </div>
          </div>
        </TutorialSection>

        <TutorialSection
          title="Como Apostar"
          description="Siga estes passos para fazer suas apostas e participar do jogo."
        >
          <div className="space-y-4">
            <div className="flex items-center bg-[#121212] p-4 rounded-lg border border-gray-800">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] mr-3">
                <span className="font-bold">1</span>
              </div>
              <div>
                <h4 className="font-medium">Escolha sua Direção</h4>
                <p className="text-sm text-gray-300">
                  Selecione "Acima" se você acha que o valor final será maior, ou "Abaixo" se acha que 
                  será menor. Sua previsão é sobre para onde o valor irá no final da rodada.
                </p>
              </div>
            </div>

            <div className="flex items-center bg-[#121212] p-4 rounded-lg border border-gray-800">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] mr-3">
                <span className="font-bold">2</span>
              </div>
              <div>
                <h4 className="font-medium">Defina seu Valor</h4>
                <p className="text-sm text-gray-300">
                  Escolha quanto quer apostar. Você verá opções rápidas (R$5, R$10, R$20, etc) ou 
                  pode definir um valor personalizado. Lembre-se de apostar com responsabilidade!
                </p>
              </div>
            </div>

            <div className="flex items-center bg-[#121212] p-4 rounded-lg border border-gray-800">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] mr-3">
                <span className="font-bold">3</span>
              </div>
              <div>
                <h4 className="font-medium">Confirme a Aposta</h4>
                <p className="text-sm text-gray-300">
                  Clique em "Fazer Aposta" para confirmar. Sua aposta será registrada e você 
                  poderá ver o resultado ao final da rodada. Você pode fazer apenas uma aposta por rodada.
                </p>
              </div>
            </div>
          </div>
        </TutorialSection>

        <TutorialSection
          title="Resultados e Ganhos"
          description="Entenda como funcionam os resultados e como calcular seus ganhos potenciais."
        >
          <div className="space-y-6">
            <div className="bg-[#121212] p-4 rounded-lg border border-gray-800">
              <h4 className="font-medium mb-2">Como são determinados os resultados?</h4>
              <p className="text-sm text-gray-300">
                Ao final de cada rodada, o sistema determina um valor final. Se o valor estiver 
                abaixo de 50, o resultado é "Acima". Se estiver acima de 50, o resultado é "Abaixo". 
                O jogo é totalmente transparente e os resultados são gerados aleatoriamente.
              </p>
            </div>

            <div className="bg-[#121212] p-4 rounded-lg border border-gray-800">
              <h4 className="font-medium mb-2">Cálculo de Ganhos</h4>
              <p className="text-sm text-gray-300">
                Se você acertar sua previsão, ganhará 1.8x o valor apostado. Por exemplo:
                <br />• Aposta de R$10 = Ganho potencial de R$18
                <br />• Aposta de R$50 = Ganho potencial de R$90
                <br />• Aposta de R$100 = Ganho potencial de R$180
              </p>
            </div>

            <div className="bg-[#121212] p-4 rounded-lg border border-gray-800">
              <h4 className="font-medium mb-2">Estratégias</h4>
              <p className="text-sm text-gray-300">
                Embora o jogo seja baseado em aleatoriedade, alguns jogadores preferem desenvolver 
                estratégias de gestão de banca para maximizar ganhos e minimizar perdas. Lembre-se 
                de jogar com responsabilidade e definir limites para suas apostas.
              </p>
            </div>
          </div>
        </TutorialSection>

        <TutorialSection
          title="FAQ - Perguntas Frequentes"
          description="Respostas para as dúvidas mais comuns sobre o jogo."
        >
          <div className="space-y-4">
            <div className="border-b border-gray-800 pb-3">
              <h4 className="font-medium mb-1">Posso cancelar uma aposta?</h4>
              <p className="text-sm text-gray-300">
                Não, uma vez confirmada, a aposta não pode ser cancelada. Por isso, sempre 
                verifique os valores antes de confirmar.
              </p>
            </div>
            <div className="border-b border-gray-800 pb-3">
              <h4 className="font-medium mb-1">O que acontece se o sistema falhar durante uma rodada?</h4>
              <p className="text-sm text-gray-300">
                Em caso de falhas técnicas, a rodada pode ser cancelada e as apostas devolvidas 
                aos jogadores. Nossa equipe técnica monitora o sistema constantemente.
              </p>
            </div>
            <div className="border-b border-gray-800 pb-3">
              <h4 className="font-medium mb-1">Como faço para depositar ou sacar?</h4>
              <p className="text-sm text-gray-300">
                Você pode gerenciar seu saldo na página de perfil. Oferecemos métodos como PIX, 
                transferência bancária e outros meios de pagamento para facilitar suas operações.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Qual o valor mínimo para apostar?</h4>
              <p className="text-sm text-gray-300">
                O valor mínimo para apostas é de R$5,00. Recomendamos sempre apostar com responsabilidade.
              </p>
            </div>
          </div>
        </TutorialSection>

        <div className="text-center">
          <Button 
            onClick={() => router.push('/')} 
            variant="primary" 
            size="lg"
          >
            Jogar Agora
          </Button>
        </div>
      </div>
    </div>
  );
} 