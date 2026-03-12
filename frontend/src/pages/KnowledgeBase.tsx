import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Search,
  Bot,
  Send,
  Loader2,
  BarChart3,
  Target,
  TrendingUp,
  Zap,
  Globe,
  Users,
  Image,
  FileText,
  Layers,
  X,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import ChatMessage from '../components/ai/ChatMessage';

// ═══════════════════════════════════════════════════════════════
// DATA: Todo o conhecimento organizado
// ═══════════════════════════════════════════════════════════════

interface SectionItem {
  term: string;
  definition: string;
  details?: string;
  formula?: string;
  goodRange?: string;
  tip?: string;
  videoUrl?: string;
  videoLabel?: string;
  imageUrl?: string;
}

interface Section {
  id: string;
  title: string;
  icon: any;
  color: string;
  items: SectionItem[];
}

const sections: Section[] = [
  // ─── METRICAS ESSENCIAIS ───────────────────────────
  {
    id: 'metricas',
    title: 'Metricas Essenciais',
    icon: BarChart3,
    color: 'text-blue-500',
    items: [
      {
        term: 'CTR (Click-Through Rate)',
        definition: 'Taxa de cliques. Percentual de pessoas que viram seu anuncio e clicaram nele.',
        formula: 'CTR = (Cliques / Impressoes) x 100',
        goodRange: 'Acima de 1% para a maioria dos nichos. Acima de 2% e excelente.',
        tip: 'CTR baixo indica que o criativo ou o publico nao estao alinhados. Teste novos criativos, mude o gancho (hook) ou refine a segmentacao.',
        details: 'O CTR e o termometro do seu anuncio. Se ninguem clica, o anuncio nao esta chamando atencao. Plataformas como Facebook penalizam anuncios com CTR muito baixo, aumentando seu custo.',
        videoUrl: 'https://www.youtube.com/watch?v=WcOiKnX7mGY',
        videoLabel: 'Entenda CTR e como melhorar (Meta)',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop',
      },
      {
        term: 'CPC (Cost Per Click)',
        definition: 'Custo por clique. Quanto voce paga, em media, por cada clique no seu anuncio.',
        formula: 'CPC = Gasto Total / Numero de Cliques',
        goodRange: 'Varia muito por nicho. E-commerce: R$0,30-R$2,00. Servicos: R$1,00-R$5,00. B2B: R$3,00-R$15,00.',
        tip: 'CPC alto pode significar muita concorrencia no leilao ou publico muito restrito. Amplie o publico ou teste novos criativos para melhorar o CTR (que reduz o CPC).',
        details: 'O CPC depende do leilao da plataforma. Quanto melhor seu Quality Score (relevancia do anuncio + experiencia da pagina de destino + CTR), menor o CPC.',
        videoUrl: 'https://www.youtube.com/results?search_query=o+que+e+CPC+custo+por+clique+como+reduzir',
        videoLabel: 'Videos sobre CPC e como reduzir',
      },
      {
        term: 'CPM (Cost Per Mille)',
        definition: 'Custo por mil impressoes. Quanto voce paga para que 1.000 pessoas vejam seu anuncio.',
        formula: 'CPM = (Gasto Total / Impressoes) x 1000',
        goodRange: 'Facebook/Instagram: R$5-R$30. Google Display: R$3-R$15. LinkedIn: R$30-R$80. TikTok: R$5-R$20.',
        tip: 'CPM alto indica alta concorrencia pelo mesmo publico ou epoca sazonal (Black Friday, Natal). Se o CPM subiu mas o resultado se mantem, esta ok.',
        details: 'O CPM e mais relevante para campanhas de alcance/reconhecimento. Para campanhas de conversao, foque mais no CPA e ROAS.',
        videoUrl: 'https://www.youtube.com/results?search_query=o+que+e+CPM+custo+por+mil+impressoes+anuncios',
        videoLabel: 'Videos sobre CPM',
      },
      {
        term: 'CPA (Cost Per Acquisition)',
        definition: 'Custo por aquisicao/conversao. Quanto custa para conseguir um cliente, lead ou venda.',
        formula: 'CPA = Gasto Total / Numero de Conversoes',
        goodRange: 'Depende do seu ticket medio. Regra: CPA deve ser no maximo 1/3 do valor do produto/servico.',
        tip: 'Se o CPA esta alto, otimize o funil: melhore a pagina de destino, simplifique o formulario, melhore a oferta. Nem sempre o problema e o anuncio.',
        details: 'O CPA e a metrica mais importante para campanhas de conversao. Um CPA saudavel garante que voce esta lucrando com cada venda.',
        videoUrl: 'https://www.youtube.com/results?search_query=CPA+custo+por+aquisicao+como+calcular+otimizar',
        videoLabel: 'Videos sobre CPA e otimizacao',
      },
      {
        term: 'ROAS (Return On Ad Spend)',
        definition: 'Retorno sobre investimento em anuncios. Quantos reais voce ganha para cada real investido.',
        formula: 'ROAS = Receita Gerada / Gasto com Anuncios',
        goodRange: 'Minimo: 2x (R$2 de receita para cada R$1 investido). Bom: 3x-5x. Excelente: acima de 5x.',
        tip: 'ROAS abaixo de 1x significa prejuizo. Entre 1x e 2x pode ser sustentavel dependendo da margem. Considere o LTV (valor vitalicio do cliente) na conta.',
        details: 'ROAS e o rei das metricas para e-commerce. Mas atencao: ROAS alto com volume baixo pode significar que voce esta sendo muito conservador. O ideal e ROAS bom COM escala.',
        videoUrl: 'https://www.youtube.com/watch?v=oelmEKMiSi4',
        videoLabel: 'O que e ROAS e como calcular',
      },
      {
        term: 'Impressoes',
        definition: 'Numero total de vezes que seu anuncio foi exibido na tela de alguem. Uma pessoa pode ver varias vezes.',
        goodRange: 'Depende do orcamento. Mais impressoes = mais alcance, mas fique de olho na frequencia.',
        tip: 'Se impressoes estao altas mas cliques baixos, seu criativo nao esta atraente. Se impressoes estao baixas, aumente o orcamento ou amplie o publico.',
      },
      {
        term: 'Alcance (Reach)',
        definition: 'Numero de pessoas UNICAS que viram seu anuncio. Diferente de impressoes (que conta repeticoes).',
        details: 'Se voce tem 10.000 impressoes e 5.000 de alcance, significa que cada pessoa viu seu anuncio em media 2 vezes (frequencia de 2).',
        tip: 'Frequencia ideal: entre 1.5 e 3. Acima de 5-7, as pessoas ja estao cansadas do seu anuncio (ad fatigue). Hora de trocar o criativo.',
      },
      {
        term: 'Taxa de Conversao',
        definition: 'Percentual de pessoas que clicaram e realizaram a acao desejada (compra, cadastro, etc).',
        formula: 'Taxa de Conversao = (Conversoes / Cliques) x 100',
        goodRange: 'E-commerce: 1%-3%. Landing pages: 5%-15%. Apps: 2%-5%.',
        tip: 'Se o CTR e bom mas a taxa de conversao e baixa, o problema esta na pagina de destino, nao no anuncio. Teste: velocidade da pagina, oferta, formulario, checkout.',
        videoUrl: 'https://www.youtube.com/results?search_query=como+aumentar+taxa+de+conversao+landing+page+ecommerce',
        videoLabel: 'Videos sobre taxa de conversao',
      },
      {
        term: 'Frequencia',
        definition: 'Numero medio de vezes que cada pessoa viu seu anuncio.',
        formula: 'Frequencia = Impressoes / Alcance',
        goodRange: 'Prospeccao: 1.5-3. Remarketing: 3-7. Acima de 10 = ad fatigue.',
        tip: 'Frequencia muito alta causa "cegueira de banner" - as pessoas ignoram seu anuncio. Renove criativos a cada 2-3 semanas.',
        videoUrl: 'https://www.youtube.com/results?search_query=frequencia+de+anuncios+ad+fatigue+facebook+ads',
        videoLabel: 'Videos sobre frequencia e ad fatigue',
      },
      {
        term: 'Spend (Gasto)',
        definition: 'Valor total investido em anuncios no periodo selecionado.',
        tip: 'Monitore o gasto diario para evitar surpresas. Use os Limites de Orcamento do HackrAds para controlar automaticamente.',
      },
      {
        term: 'Receita (Revenue)',
        definition: 'Valor total em vendas/receita gerada pelas campanhas no periodo.',
        details: 'Nem sempre a plataforma consegue rastrear 100% da receita (janela de atribuicao, bloqueadores). Considere uma margem de 10-20% a mais.',
      },
    ],
  },

  // ─── OBJETIVOS DE CAMPANHA ───────────────────────────
  {
    id: 'objetivos',
    title: 'Objetivos de Campanha',
    icon: Target,
    color: 'text-green-500',
    items: [
      {
        term: 'Conversao / Vendas',
        definition: 'O algoritmo otimiza para encontrar pessoas com maior probabilidade de comprar ou realizar uma acao.',
        details: 'USE QUANDO: Voce tem um produto/servico para vender, quer gerar leads qualificados, ou quer instalacoes de app. PRECISA de: pixel/API de conversoes instalado, historico de pelo menos 50 conversoes por semana para o algoritmo otimizar bem.',
        tip: 'Se voce nao tem historico de conversoes suficiente, comece com objetivo de Trafego e migre para Conversao quando tiver dados.',
        videoUrl: 'https://www.youtube.com/watch?v=YRXF2mKBhUo',
        videoLabel: 'Como criar campanha de Conversao no Meta Ads',
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop',
      },
      {
        term: 'Trafego',
        definition: 'O algoritmo otimiza para gerar o maior numero de cliques para seu site/landing page.',
        details: 'USE QUANDO: Voce quer levar pessoas ao site, esta comecando e nao tem dados de conversao, ou quer aquecer o pixel. CUIDADO: trafego ≠ vendas. Muita gente clica e sai sem comprar.',
        tip: 'Ideal para fase de aprendizado e coleta de dados. Depois de 50+ conversoes, mude para objetivo de Conversao.',
        videoUrl: 'https://www.youtube.com/results?search_query=campanha+de+trafego+meta+ads+tutorial+completo',
        videoLabel: 'Como criar campanha de Trafego',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop',
      },
      {
        term: 'Reconhecimento / Alcance',
        definition: 'Maximo de pessoas vendo seu anuncio pelo menor custo. Foco em branding.',
        details: 'USE QUANDO: Lancamento de marca, produto novo no mercado, evento, ou quando precisa de muito alcance rapido. NAO USE para vender diretamente.',
        tip: 'Combine com remarketing: primeiro alcance muita gente, depois faca retargeting para quem interagiu.',
        videoUrl: 'https://www.youtube.com/results?search_query=campanha+reconhecimento+alcance+meta+ads+branding',
        videoLabel: 'Videos sobre campanha de Reconhecimento',
        imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=200&fit=crop',
      },
      {
        term: 'Engajamento',
        definition: 'Curtidas, comentarios, compartilhamentos e salvamentos no seu post/anuncio.',
        details: 'USE QUANDO: Quer prova social (muitas curtidas/comentarios), quer viralizar um conteudo, ou quer construir audiencia. BOM PARA: restaurantes, moda, entretenimento.',
        tip: 'Um post com muito engajamento pode ser promovido depois com objetivo de conversao - a prova social ajuda na conversao.',
        videoUrl: 'https://www.youtube.com/results?search_query=campanha+engajamento+facebook+instagram+ads+tutorial',
        videoLabel: 'Videos sobre campanha de Engajamento',
        imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=200&fit=crop',
      },
      {
        term: 'Leads / Geracao de Cadastros',
        definition: 'Formulario nativo da plataforma (Lead Form) para capturar nome, email, telefone sem sair do app.',
        details: 'USE QUANDO: Quer capturar leads rapidamente, servicos como imoveis, seguros, cursos. VANTAGEM: usuario nao sai do Facebook/Instagram. DESVANTAGEM: leads podem ser menos qualificados que os do seu site.',
        tip: 'Adicione perguntas qualificadoras no formulario para filtrar curiosos. Integre com seu CRM para resposta rapida (lead esfria em minutos).',
        videoUrl: 'https://www.youtube.com/results?search_query=campanha+geracao+de+leads+facebook+ads+formulario+tutorial',
        videoLabel: 'Videos sobre campanha de Leads',
        imageUrl: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=200&fit=crop',
      },
      {
        term: 'Mensagens (WhatsApp/Messenger)',
        definition: 'Leva as pessoas diretamente para uma conversa no WhatsApp, Messenger ou Instagram Direct.',
        details: 'USE QUANDO: Venda consultiva (imoveis, carros, servicos), negocios locais, ou quando o cliente precisa tirar duvidas antes de comprar. MUITO POPULAR no Brasil.',
        tip: 'Tenha equipe pronta para responder rapido. Lead que manda mensagem e quente - responda em menos de 5 minutos para maxima conversao.',
        videoUrl: 'https://www.youtube.com/results?search_query=campanha+mensagens+whatsapp+meta+ads+tutorial',
        videoLabel: 'Videos sobre campanha de Mensagens/WhatsApp',
        imageUrl: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=400&h=200&fit=crop',
      },
      {
        term: 'Vendas do Catalogo',
        definition: 'Mostra produtos do seu catalogo automaticamente para pessoas que demonstraram interesse.',
        details: 'USE QUANDO: E-commerce com catalogo de produtos. O Facebook/Instagram mostra automaticamente os produtos mais relevantes para cada pessoa. PRECISA de: catalogo de produtos configurado, pixel instalado.',
        tip: 'Funciona muito bem com Dynamic Product Ads (DPA) para remarketing - mostra exatamente o produto que a pessoa viu no site.',
        videoUrl: 'https://www.youtube.com/results?search_query=catalogo+de+produtos+DPA+dynamic+product+ads+meta+ads',
        videoLabel: 'Videos sobre Vendas de Catalogo e DPA',
      },
      {
        term: 'Instalacao de App',
        definition: 'Otimiza para instalacoes do seu aplicativo mobile.',
        details: 'USE QUANDO: Tem um app e quer downloads. A plataforma direciona para a loja (App Store/Play Store). COMPLEMENTO: use eventos in-app para otimizar por usuarios que realmente usam o app, nao so instalam.',
      },
    ],
  },

  // ─── ESTRUTURA DE CAMPANHAS ───────────────────────────
  {
    id: 'estrutura',
    title: 'Estrutura de Campanhas',
    icon: Layers,
    color: 'text-purple-500',
    items: [
      {
        term: 'Campanha',
        definition: 'Nivel mais alto. Define o OBJETIVO (conversao, trafego, etc) e o orcamento geral.',
        details: 'Pense na campanha como a "pasta" que agrupa tudo. Uma campanha de conversao pode ter varios conjuntos de anuncios testando publicos diferentes.',
        tip: 'Nao crie campanhas demais. 2-5 campanhas ativas e o ideal para a maioria dos negocios. Muitas campanhas = orcamento fragmentado = resultados ruins.',
      },
      {
        term: 'Conjunto de Anuncios (Ad Set)',
        definition: 'Nivel intermediario. Define o PUBLICO-ALVO, posicionamentos, orcamento do conjunto e periodo.',
        details: 'Cada conjunto de anuncios tem sua propria segmentacao. Exemplo: um conjunto para Lookalike 1%, outro para Interesses, outro para Remarketing. Cada um compete separadamente no leilao.',
        tip: 'Use Advantage+ Audience (ASC) quando possivel - o algoritmo do Meta esta cada vez melhor em encontrar as pessoas certas automaticamente.',
      },
      {
        term: 'Anuncio (Ad)',
        definition: 'Nivel mais baixo. O CRIATIVO em si: imagem/video + texto + titulo + CTA.',
        details: 'E o que o usuario realmente ve. Pode ter varios anuncios dentro de um mesmo conjunto de anuncios para testar criativos diferentes.',
        tip: 'Regra dos 3-5: tenha pelo menos 3-5 anuncios por conjunto para o algoritmo otimizar. Mas nao exagere - 10+ anuncios dilui o orcamento.',
      },
      {
        term: 'CBO (Campaign Budget Optimization)',
        definition: 'Orcamento definido no nivel da CAMPANHA. O algoritmo distribui automaticamente entre os conjuntos de anuncios.',
        details: 'O Facebook decide qual conjunto de anuncios recebe mais verba baseado em performance. Voce define o total e ele otimiza.',
        tip: 'Use CBO quando tem 3+ conjuntos de anuncios e quer que o algoritmo otimize a distribuicao. Ideal para escala.',
        videoUrl: 'https://www.youtube.com/results?search_query=CBO+vs+ABO+meta+ads+qual+usar+orcamento+campanha',
        videoLabel: 'Videos sobre CBO vs ABO',
      },
      {
        term: 'ABO (Ad Set Budget Optimization)',
        definition: 'Orcamento definido no nivel do CONJUNTO DE ANUNCIOS. Voce controla manualmente quanto cada conjunto gasta.',
        details: 'Voce decide exatamente quanto cada publico recebe. Mais controle, mas exige mais gestao manual.',
        tip: 'Use ABO quando esta testando publicos novos e quer garantir que cada um tenha orcamento suficiente para gerar dados.',
      },
      {
        term: 'ASC (Advantage Shopping Campaign)',
        definition: 'Campanha automatizada do Meta para e-commerce. Minima configuracao, maximo algoritmo.',
        details: 'Voce define: pais, orcamento, criativos. O algoritmo faz o resto: encontra o publico, define posicionamentos, otimiza bids. Funciona muito bem para contas com historico.',
        tip: 'ASC e a evolucao do CBO. Comece com ASC se tem pixel maduro (50+ conversoes/semana). Para contas novas, comece com campanhas manuais.',
        videoUrl: 'https://www.youtube.com/results?search_query=advantage+shopping+campaign+ASC+meta+ads+tutorial',
        videoLabel: 'Videos sobre Advantage Shopping Campaign',
      },
      {
        term: 'Pixel / API de Conversoes (CAPI)',
        definition: 'Codigo de rastreamento que registra acoes no seu site (visualizacao, add to cart, compra).',
        details: 'O PIXEL e um JavaScript no site. A CAPI e server-side (mais confiavel). IDEAL: usar ambos juntos para maxima precisao. Sem pixel = voar no escuro.',
        tip: 'Configure TODOS os eventos: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase. Quanto mais dados, melhor o algoritmo otimiza.',
        videoUrl: 'https://www.youtube.com/results?search_query=como+configurar+pixel+facebook+API+conversoes+CAPI+2024',
        videoLabel: 'Videos sobre configuracao de Pixel e CAPI',
      },
    ],
  },

  // ─── PUBLICOS E SEGMENTACAO ───────────────────────────
  {
    id: 'publicos',
    title: 'Publicos e Segmentacao',
    icon: Users,
    color: 'text-orange-500',
    items: [
      {
        term: 'Publico Frio (Cold Audience)',
        definition: 'Pessoas que NUNCA ouviram falar de voce. Prospeccao pura.',
        details: 'Interesses, Lookalikes, publico amplo. Sao mais baratos de alcacar mas convertem menos. E o topo do funil.',
        tip: 'Dedique 60-70% do orcamento para publico frio. E de la que vem novos clientes. Use criativos de gancho forte e proposta de valor clara.',
      },
      {
        term: 'Publico Morno (Warm Audience)',
        definition: 'Pessoas que ja interagiram com sua marca mas nao compraram ainda.',
        details: 'Visitantes do site (ultimos 30-180 dias), quem engajou com posts/videos, quem seguiu a pagina, quem abriu lead form sem enviar.',
        tip: 'Use mensagens diferentes: relembre o beneficio, mostre depoimentos, ofereca desconto. Essas pessoas ja conhecem voce - nao precisa se apresentar de novo.',
      },
      {
        term: 'Publico Quente (Hot Audience)',
        definition: 'Pessoas que quase compraram. Remarketing de alta intencao.',
        details: 'Visitou pagina de produto, adicionou ao carrinho, iniciou checkout, ja comprou antes (upsell/cross-sell).',
        tip: 'Dedique 10-20% do orcamento aqui. Sao poucos mas convertem MUITO. Use urgencia, escassez, frete gratis, desconto exclusivo.',
      },
      {
        term: 'Lookalike (Publico Semelhante)',
        definition: 'O algoritmo encontra pessoas PARECIDAS com um publico fonte que voce fornece.',
        details: 'Lookalike 1% = mais similar (menor, mais preciso). Lookalike 5-10% = mais amplo (maior, menos preciso). Fonte ideal: clientes que compraram, leads de qualidade.',
        tip: 'Lookalike de compradores e o melhor publico de prospeccao. Comece com 1%, depois teste 1-3% e 3-5% para escalar.',
        videoUrl: 'https://www.youtube.com/results?search_query=publico+lookalike+semelhante+facebook+ads+como+criar',
        videoLabel: 'Videos sobre publico Lookalike',
      },
      {
        term: 'Publico por Interesses',
        definition: 'Segmentacao baseada em interesses, comportamentos e dados demograficos da plataforma.',
        details: 'Exemplos: "Empreendedorismo", "Compras online", "Fitness", "Marketing digital". Combinacao de interesses refina o publico.',
        tip: 'Interesses estao perdendo eficacia com restricoes de privacidade. Priorize Lookalikes e Advantage+ Audience.',
      },
      {
        term: 'Custom Audience (Publico Personalizado)',
        definition: 'Publico criado a partir de dados que VOCE fornece: lista de emails, visitantes do site, usuarios do app.',
        details: 'Tipos: lista de clientes (upload CSV), trafego do site (pixel), atividade no app, engajamento na plataforma (video, formulario, pagina).',
        tip: 'Exclua SEMPRE seus clientes atuais das campanhas de prospeccao para nao gastar dinheiro com quem ja comprou.',
        videoUrl: 'https://www.youtube.com/results?search_query=publico+personalizado+custom+audience+meta+ads+como+criar',
        videoLabel: 'Videos sobre Custom Audience',
      },
      {
        term: 'Broad Targeting (Publico Amplo)',
        definition: 'Nenhuma segmentacao especifica - voce deixa o algoritmo encontrar as pessoas certas.',
        details: 'Parece contra-intuitivo, mas funciona muito bem em contas com pixel maduro. O algoritmo usa seus dados de conversao para encontrar compradores.',
        tip: 'Funciona melhor com: 50+ conversoes/semana, criativos de alta qualidade, e objetivo de conversao. Nao funciona bem para contas novas.',
        videoUrl: 'https://www.youtube.com/results?search_query=broad+targeting+publico+aberto+meta+ads+advantage+audience',
        videoLabel: 'Videos sobre Broad Targeting e Advantage+',
      },
    ],
  },

  // ─── CRIATIVOS E FORMATOS ───────────────────────────
  {
    id: 'criativos',
    title: 'Criativos e Formatos',
    icon: Image,
    color: 'text-pink-500',
    items: [
      {
        term: 'Hook (Gancho)',
        definition: 'Os primeiros 3 segundos do video ou a primeira linha do texto. O que faz a pessoa PARAR de rolar o feed.',
        details: 'Voce tem menos de 3 segundos para capturar atencao. Se o gancho falhar, o resto nao importa.',
        tip: 'Formulas de gancho que funcionam: "Voce sabia que...", "Pare de fazer X...", "A maioria das pessoas erra nisso...", demonstracao visual impactante, resultado antes/depois.',
        videoUrl: 'https://www.youtube.com/results?search_query=hook+gancho+anuncio+video+primeiros+3+segundos+como+fazer',
        videoLabel: 'Videos sobre como criar Hooks poderosos',
      },
      {
        term: 'UGC (User Generated Content)',
        definition: 'Conteudo que parece feito por um usuario real, nao por uma marca. Depoimentos, unboxing, reviews.',
        details: 'UGC converte ate 4x mais que anuncios tradicionais porque gera confianca. Pode ser feito por criadores de conteudo contratados (nao precisa ser organico).',
        tip: 'Contrate micro-influenciadores para criar UGC. Custa R$200-R$800 por video e gera criativos muito mais autenticos que producao de estudio.',
        videoUrl: 'https://www.youtube.com/results?search_query=UGC+user+generated+content+anuncios+como+criar+contratar',
        videoLabel: 'Videos sobre UGC para anuncios',
      },
      {
        term: 'Carrossel',
        definition: 'Formato com multiplas imagens/videos que o usuario desliza. Ate 10 cards.',
        details: 'Ideal para: mostrar varios produtos, contar uma historia em etapas, mostrar beneficios um por um, antes/depois.',
        tip: 'Primeiro card e o mais importante - funciona como o gancho. Use CTA em cada card. Funciona muito bem para e-commerce.',
      },
      {
        term: 'Video (Reels/Stories/Feed)',
        definition: 'Conteudo em video. Formato dominante em todas as plataformas atualmente.',
        details: 'Formatos: vertical 9:16 (Stories/Reels/TikTok), quadrado 1:1 (Feed), horizontal 16:9 (YouTube). Video vertical domina mobile.',
        tip: 'Videos curtos (15-30s) para prospeccao. Videos longos (1-3min) para remarketing/explicacao. Sempre com legenda (80% das pessoas assistem sem som).',
        videoUrl: 'https://www.youtube.com/results?search_query=como+criar+video+anuncio+reels+stories+facebook+instagram',
        videoLabel: 'Videos sobre como criar Video Ads',
      },
      {
        term: 'Imagem Estatica',
        definition: 'Anuncio com uma unica imagem. Simples mas eficaz.',
        details: 'Funciona melhor que video em alguns nichos (B2B, servicos profissionais). Menos producao, mais rapido para testar.',
        tip: 'Imagens com rostos humanos performam melhor. Contraste forte chama atencao no feed. Menos texto na imagem = melhor (regra do 20% do Facebook).',
      },
      {
        term: 'CTA (Call to Action)',
        definition: 'Botao de acao do anuncio: "Comprar Agora", "Saiba Mais", "Cadastre-se", "Enviar Mensagem".',
        details: '"Comprar Agora" para e-commerce, "Saiba Mais" para conteudo/servicos, "Enviar Mensagem" para WhatsApp, "Cadastre-se" para leads.',
        tip: 'CTA deve corresponder ao nivel de compromisso. Publico frio: "Saiba Mais". Publico quente: "Comprar Agora". Nao peca o casamento no primeiro encontro.',
      },
      {
        term: 'Copy (Texto do Anuncio)',
        definition: 'O texto que acompanha o criativo visual. Titulo, descricao e texto principal.',
        details: 'Estrutura AIDA: Atencao (gancho) → Interesse (problema/dor) → Desejo (solucao/beneficio) → Acao (CTA). Ou PAS: Problema → Agitacao → Solucao.',
        tip: 'Textos curtos (1-3 linhas) para prospeccao. Textos longos com detalhes para remarketing. Sempre teste ambos.',
        videoUrl: 'https://www.youtube.com/results?search_query=copywriting+para+anuncios+facebook+instagram+AIDA+PAS',
        videoLabel: 'Videos sobre Copy para anuncios',
      },
    ],
  },

  // ─── PLATAFORMAS ───────────────────────────
  {
    id: 'plataformas',
    title: 'Plataformas de Anuncios',
    icon: Globe,
    color: 'text-cyan-500',
    items: [
      {
        term: 'Meta Ads (Facebook + Instagram)',
        definition: 'Maior plataforma de anuncios do mundo. 3 bilhoes de usuarios. Segmentacao por interesses, comportamentos e dados.',
        details: 'IDEAL PARA: e-commerce, negocios locais, infoprodutos, servicos. FORMATOS: Feed, Stories, Reels, Messenger, Audience Network. ORCAMENTO MINIMO: R$6/dia.',
        tip: 'Comece pelo Meta Ads. E a plataforma mais versatil e com melhor custo-beneficio para 90% dos negocios no Brasil.',
        videoUrl: 'https://www.youtube.com/results?search_query=meta+ads+tutorial+completo+2024+iniciante+facebook+instagram',
        videoLabel: 'Tutoriais completos de Meta Ads',
      },
      {
        term: 'Google Ads',
        definition: 'Anuncios no Google Search, YouTube, Display, Shopping e Maps. Captura demanda existente.',
        details: 'SEARCH: aparece quando alguem pesquisa. SHOPPING: mostra produtos com foto e preco. DISPLAY: banners em sites parceiros. YOUTUBE: antes/durante videos. PERFORMANCE MAX: combina tudo.',
        tip: 'Google Search captura quem JA esta procurando (intencao alta). Meta Ads cria demanda (prospeccao). Idealmente, use os dois juntos.',
        videoUrl: 'https://www.youtube.com/results?search_query=google+ads+tutorial+completo+2024+iniciante+search+shopping',
        videoLabel: 'Tutoriais completos de Google Ads',
      },
      {
        term: 'TikTok Ads',
        definition: 'Plataforma de videos curtos com 1 bilhao de usuarios. Publico jovem (18-34 anos) dominante.',
        details: 'FORMATOS: In-Feed, TopView, Spark Ads (promover posts organicos), Branded Effects. IDEAL PARA: moda, beleza, food, entretenimento, apps.',
        tip: 'No TikTok, anuncios que parecem anuncios nao funcionam. Faca conteudo nativo, UGC, trends. "Don\'t make ads, make TikToks".',
        videoUrl: 'https://www.youtube.com/results?search_query=tiktok+ads+tutorial+completo+como+anunciar+2024',
        videoLabel: 'Tutoriais de TikTok Ads',
      },
      {
        term: 'LinkedIn Ads',
        definition: 'Plataforma profissional. Ideal para B2B, recrutamento, servicos corporativos.',
        details: 'SEGMENTACAO: cargo, empresa, setor, tamanho da empresa, habilidades. CPC mais alto (R$5-R$20+) mas leads muito qualificados.',
        tip: 'Use LinkedIn para vender para empresas (SaaS, consultorias, cursos corporativos). Para B2C, o custo geralmente nao compensa.',
        videoUrl: 'https://www.youtube.com/results?search_query=linkedin+ads+tutorial+como+anunciar+B2B+2024',
        videoLabel: 'Tutoriais de LinkedIn Ads',
      },
      {
        term: 'Pinterest Ads',
        definition: 'Plataforma visual de descoberta. Ideal para decoracao, moda, receitas, casamento, DIY.',
        details: 'Usuarios vao ao Pinterest para PLANEJAR compras. Alta intencao de compra. CPC geralmente mais barato que Meta.',
        tip: 'Se voce vende produtos visuais (moda, decoracao, joias), Pinterest pode ter ROAS surpreendente.',
      },
    ],
  },

  // ─── AUTOMACOES DO HACKRADS ───────────────────────────
  {
    id: 'automacoes',
    title: 'Automacoes do HackrAds',
    icon: Zap,
    color: 'text-yellow-500',
    items: [
      {
        term: 'Regra Simples',
        definition: 'Monitora UMA metrica e executa uma acao quando a condicao e atendida.',
        details: 'Exemplo: "Se CTR < 0.5% nos ultimos 7 dias → Pausar campanha". Avaliada automaticamente a cada ciclo do sistema.',
        tip: 'Comece com regras simples de protecao: pausar campanhas com ROAS < 1x ou CPC muito alto. Depois avance para regras mais complexas.',
      },
      {
        term: 'Regra Composta (AND/OR)',
        definition: 'Combina MULTIPLAS condicoes com logica AND (todas devem ser verdadeiras) ou OR (pelo menos uma).',
        details: 'Exemplo AND: "Se CTR < 0.5% E Spend > R$100 nos ultimos 7 dias → Pausar". Exemplo OR: "Se ROAS < 1x OU CPC > R$10 → Notificar".',
        tip: 'Use AND para evitar falsos positivos. Exemplo: pausar so se gastar bastante E ter resultado ruim (nao pausar uma campanha nova que ainda nao tem dados).',
      },
      {
        term: 'Smart Scaling',
        definition: 'Aumenta o orcamento PROGRESSIVAMENTE quando uma campanha performa bem por varios dias consecutivos.',
        details: 'Configuracao: % de aumento por vez, budget maximo, dias consecutivos necessarios, cooldown entre ajustes. Exemplo: +20% a cada 3 dias com ROAS > 3x, ate R$5.000/dia.',
        tip: 'Nunca aumente budget mais que 20-30% por vez. Aumentos bruscos desestabilizam o algoritmo. Smart Scaling faz isso gradualmente.',
      },
      {
        term: 'Dayparting',
        definition: 'Pausa e ativa campanhas automaticamente baseado no HORARIO e DIA DA SEMANA.',
        details: 'Configuracao: grid semanal com horario de inicio/fim por dia, timezone. Exemplo: ativar seg-sex 8h-22h, pausar nos fins de semana.',
        tip: 'Analise seus dados para descobrir os horarios de pico de conversao. Negocios locais: horario comercial. E-commerce: noite e fins de semana. B2B: seg-sex 9h-18h.',
      },
      {
        term: 'Deteccao de Anomalias',
        definition: 'Compara a metrica ATUAL com a MEDIA HISTORICA e alerta quando ha um desvio significativo.',
        details: 'Configuracao: periodo de referencia (ex: 30 dias), percentual de desvio minimo (ex: 50%), direcao (subiu, caiu, ambos). Util para detectar problemas ou oportunidades rapidamente.',
        tip: 'Configure para detectar quedas de CTR (pode indicar ad fatigue), picos de CPC (mais concorrencia), ou quedas bruscas de conversao (problema no site).',
      },
      {
        term: 'Auto-Restart',
        definition: 'Reativa automaticamente campanhas que foram PAUSADAS por automacao, apos um periodo de espera.',
        details: 'Configuracao: dias de espera e condicao opcional de reativacao. Exemplo: reativar apos 3 dias se ROAS > 1.5x. Busca campanhas pausadas via audit log (source=automation_rule).',
        tip: 'Util para campanhas que podem ter tido uma semana ruim mas que historicamente sao boas. Da uma segunda chance automatica.',
      },
      {
        term: 'Webhook',
        definition: 'Envia uma notificacao HTTP POST para um servico externo quando uma regra e acionada.',
        details: 'Payload inclui: dados da regra, campanha, metrica atual, timestamp. Timeout de 10s. Headers customizaveis.',
        tip: 'Use para integrar com Slack, Discord, Zapier, Make, ou seu CRM. Exemplo: quando ROAS > 5x, notifica no Slack para a equipe comemorar.',
      },
      {
        term: 'Limite de Orcamento por Plataforma',
        definition: 'Define um TETO MAXIMO de gasto diario ou semanal para cada plataforma.',
        details: 'Quando o limite e atingido, o sistema pausa automaticamente as campanhas com PIOR performance (menor ROAS) ate ficar dentro do limite.',
        tip: 'Essencial para agencias que gerenciam orcamentos de clientes. Evita gastar mais do que o combinado.',
      },
      {
        term: 'Teste A/B',
        definition: 'Compara 2 ou mais campanhas pela mesma metrica durante X dias. Ao final, pausa as perdedoras e realoca o budget para a vencedora.',
        details: 'Configuracao: campanhas, metrica de comparacao, dias de avaliacao, budget total. O sistema distribui o budget igualmente e depois avalia.',
        tip: 'Teste UMA variavel por vez: criativo, publico, ou copy. Se mudar tudo ao mesmo tempo, nao sabera o que causou a diferenca.',
      },
      {
        term: 'Duplicacao Cross-Platform',
        definition: 'Quando uma campanha tem ROAS acima de 3x, o sistema sugere DUPLICAR para outra plataforma.',
        details: 'Exemplo: campanha no Facebook com ROAS 4x → sistema sugere criar versao no Google Ads ou TikTok. Cria um rascunho com os mesmos dados basicos.',
        tip: 'Se funciona no Facebook, provavelmente funciona (com adaptacoes) no Instagram e TikTok. O criativo precisa ser adaptado para cada plataforma.',
      },
    ],
  },

  // ─── ESTRATEGIAS AVANCADAS ───────────────────────────
  {
    id: 'estrategias',
    title: 'Estrategias Avancadas',
    icon: TrendingUp,
    color: 'text-emerald-500',
    items: [
      {
        term: 'Funil de Anuncios (TOFU/MOFU/BOFU)',
        definition: 'Estrutura de campanhas em 3 niveis: Topo (Prospeccao), Meio (Consideracao), Fundo (Conversao).',
        details: 'TOFU (70% budget): publico frio, objetivo alcance/trafego, criativos de gancho. MOFU (20%): quem interagiu, objetivo engajamento/trafego, conteudo de valor. BOFU (10%): quem quase comprou, objetivo conversao, oferta direta.',
        tip: 'Nao tente vender para quem nunca ouviu falar de voce. Esquente o publico antes. Mas se seu produto e barato (<R$100), pode ir direto para conversao.',
        videoUrl: 'https://www.youtube.com/results?search_query=funil+de+anuncios+TOFU+MOFU+BOFU+facebook+ads+estrutura',
        videoLabel: 'Videos sobre Funil de Anuncios',
      },
      {
        term: 'Escalonamento (Scaling)',
        definition: 'Processo de AUMENTAR o investimento mantendo o ROAS/CPA saudavel.',
        details: 'Horizontal: criar novos conjuntos de anuncios/publicos. Vertical: aumentar budget dos conjuntos existentes. Ideal: combinar ambos.',
        tip: 'Regra de ouro: aumente no maximo 20% a cada 2-3 dias. Monitore CPA nas primeiras 24-48h apos cada aumento. Se o CPA subir muito, volte atras.',
        videoUrl: 'https://www.youtube.com/results?search_query=como+escalar+campanhas+facebook+ads+scaling+orcamento',
        videoLabel: 'Videos sobre Escalonamento de campanhas',
      },
      {
        term: 'Teste de Criativos',
        definition: 'Processo sistematico de testar diferentes versoes de anuncios para encontrar os vencedores.',
        details: 'Framework DCT: Dynamic Creative Testing. Teste hooks diferentes, formatos (video vs imagem vs carrossel), copys (curto vs longo), CTAs. Uma variavel por vez.',
        tip: 'Renove criativos a cada 2-4 semanas. Ad fatigue e real. Tenha um pipeline constante de novos criativos sendo produzidos.',
        videoUrl: 'https://www.youtube.com/results?search_query=teste+de+criativos+facebook+ads+como+testar+anuncios',
        videoLabel: 'Videos sobre Teste de Criativos',
      },
      {
        term: 'Remarketing / Retargeting',
        definition: 'Mostrar anuncios especificos para pessoas que ja visitaram seu site ou interagiram com sua marca.',
        details: 'Janelas de remarketing: 3 dias (super quente), 7 dias (quente), 30 dias (morno), 180 dias (frio). Quanto mais recente, maior a chance de conversao.',
        tip: 'O remarketing e onde esta o DINHEIRO. Campanhas de remarketing costumam ter ROAS 3-10x maior que prospeccao. Nunca ignore isso.',
        videoUrl: 'https://www.youtube.com/results?search_query=remarketing+retargeting+facebook+ads+tutorial+como+fazer',
        videoLabel: 'Videos sobre Remarketing/Retargeting',
      },
      {
        term: 'LTV (Lifetime Value)',
        definition: 'Valor total que um cliente gera ao longo de todo o relacionamento com voce.',
        details: 'Se um cliente compra R$100 na primeira compra mas volta a comprar 4 vezes no ano, o LTV e R$400. Isso muda completamente o quanto voce pode pagar por um cliente.',
        tip: 'Se seu LTV e alto, voce pode aceitar CPA mais alto na primeira venda e mesmo assim lucrar. Isso e uma VANTAGEM COMPETITIVA enorme no leilao.',
        videoUrl: 'https://www.youtube.com/results?search_query=LTV+lifetime+value+como+calcular+marketing+digital',
        videoLabel: 'Videos sobre LTV e valor do cliente',
      },
      {
        term: 'Atribuicao',
        definition: 'Como a plataforma determina qual anuncio/campanha gerou a conversao.',
        details: 'Janela de 7 dias apos clique (padrao do Meta). Significa: se alguem clicou no anuncio e comprou ate 7 dias depois, a conversao e atribuida ao anuncio. Outras janelas: 1 dia clique, 1 dia visualizacao.',
        tip: 'A atribuicao nunca e 100% precisa. Compare dados da plataforma com dados do Google Analytics e do seu backend. A verdade esta entre os tres.',
      },
    ],
  },

  // ─── GLOSSARIO TECNICO ───────────────────────────
  {
    id: 'glossario',
    title: 'Glossario Tecnico',
    icon: FileText,
    color: 'text-gray-500',
    items: [
      { term: 'Bid (Lance)', definition: 'Quanto voce esta disposto a pagar por um clique, impressao ou conversao no leilao da plataforma.' },
      { term: 'Quality Score', definition: 'Nota de qualidade do Google Ads (1-10). Baseada em CTR esperado, relevancia do anuncio e experiencia da pagina.' },
      { term: 'Relevance Score', definition: 'Nota de relevancia do Meta Ads. Quanto mais relevante para o publico, menor o custo.' },
      { term: 'Ad Fatigue', definition: 'Quando o publico ja viu demais seu anuncio e para de responder. Frequencia alta + CTR caindo = ad fatigue.' },
      { term: 'Split Test', definition: 'Teste controlado onde a plataforma divide o publico igualmente entre variantes. Mais preciso que testes manuais.' },
      { term: 'Dark Post', definition: 'Anuncio que nao aparece no feed da sua pagina. So quem esta no publico-alvo ve. Padrao na maioria das campanhas.' },
      { term: 'Conversion API (CAPI)', definition: 'Envio de dados de conversao server-side (do seu servidor direto para a plataforma). Mais confiavel que pixel.' },
      { term: 'UTM Parameters', definition: 'Tags adicionadas a URLs para rastrear origem do trafego no Google Analytics. Formato: ?utm_source=facebook&utm_medium=cpc&utm_campaign=nome.' },
      { term: 'DPA (Dynamic Product Ads)', definition: 'Anuncios que mostram automaticamente produtos do seu catalogo baseados no comportamento do usuario.' },
      { term: 'Advantage+', definition: 'Suite de automacoes do Meta que usa IA para otimizar publico, posicionamento e criativos automaticamente.' },
      { term: 'Performance Max (PMax)', definition: 'Campanha totalmente automatizada do Google Ads que usa todos os canais (Search, Display, YouTube, Shopping, Maps).' },
      { term: 'Spark Ads', definition: 'Formato do TikTok que promove posts organicos (seus ou de criadores) como anuncios. Mantém engajamento do post original.' },
      { term: 'Lead Scoring', definition: 'Sistema de pontuacao para classificar leads por qualidade/probabilidade de compra.' },
      { term: 'Retencao', definition: 'Capacidade de manter clientes comprando novamente. Custa 5-7x menos reter do que conquistar novo cliente.' },
      { term: 'CAC (Customer Acquisition Cost)', definition: 'Custo total para adquirir um cliente. Inclui anuncios + equipe + ferramentas. CAC deve ser menor que LTV.' },
      { term: 'Breakeven ROAS', definition: 'O ROAS minimo para nao ter prejuizo. Se sua margem e 40%, o breakeven e 2.5x (1/0.40). Abaixo disso, perde dinheiro.' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metricas']));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }>>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const sendAI = useMutation({
    mutationFn: async (msg: string) => {
      const res = await api.post('/api/ai/chat', {
        message: msg,
        conversationId: conversationId || undefined,
        provider: 'CLAUDE',
      });
      return res.data.data;
    },
    onSuccess: (data: any) => {
      if (data.conversationId) setConversationId(data.conversationId);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.message || 'Sem resposta',
        createdAt: new Date().toISOString(),
      }]);
    },
    onError: () => {
      toast.error('Erro ao enviar mensagem para a IA');
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        createdAt: new Date().toISOString(),
      }]);
    },
  });

  function handleSendChat() {
    const msg = chatMessage.trim();
    if (!msg) return;
    setChatHistory(prev => [...prev, { role: 'user', content: msg, createdAt: new Date().toISOString() }]);
    setChatMessage('');
    sendAI.mutate(msg);
  }

  function toggleSection(id: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleItem(key: string) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Filter
  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return item.term.toLowerCase().includes(s) ||
        item.definition.toLowerCase().includes(s) ||
        (item.details || '').toLowerCase().includes(s) ||
        (item.tip || '').toLowerCase().includes(s);
    }),
  })).filter(s => s.items.length > 0);

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7" />
            Central de Conhecimento
          </h1>
          <p className="text-muted-foreground mt-1">
            Tudo que voce precisa saber para se tornar o melhor gestor de trafego. {totalItems} topicos.
          </p>
        </div>
        <Button onClick={() => setChatOpen(!chatOpen)} variant={chatOpen ? 'default' : 'outline'}>
          <Bot className="h-4 w-4 mr-2" />
          {chatOpen ? 'Fechar IA' : 'Perguntar a IA'}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Buscar por termo, sigla ou conceito... (ex: ROAS, remarketing, CPC)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={`grid gap-6 ${chatOpen ? 'grid-cols-1 lg:grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
        {/* Main content */}
        <div className="space-y-4">
          {/* Quick nav */}
          <div className="flex flex-wrap gap-2">
            {sections.map(s => {
              const Icon = s.icon;
              return (
                <Button
                  key={s.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExpandedSections(prev => new Set(prev).add(s.id));
                    document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <Icon className={`h-3.5 w-3.5 mr-1.5 ${s.color}`} />
                  {s.title}
                </Button>
              );
            })}
          </div>

          {/* Sections */}
          {filteredSections.map(section => {
            const Icon = section.icon;
            const isExpanded = expandedSections.has(section.id);

            return (
              <Card key={section.id} id={`section-${section.id}`}>
                <CardHeader
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${section.color}`} />
                      {section.title}
                      <Badge variant="secondary" className="ml-2 text-xs">{section.items.length}</Badge>
                    </CardTitle>
                    {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-3 pt-0">
                    {section.items.map((item, i) => {
                      const key = `${section.id}-${i}`;
                      const itemExpanded = expandedItems.has(key);

                      return (
                        <div key={key} className="border rounded-lg overflow-hidden">
                          <div
                            className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleItem(key)}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {itemExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm">{item.term}</h3>
                              <p className="text-sm text-muted-foreground mt-0.5">{item.definition}</p>
                            </div>
                          </div>

                          {itemExpanded && (
                            <div className="px-3 pb-3 pt-0 ml-7 space-y-2">
                              {item.formula && (
                                <div className="bg-muted/50 rounded px-3 py-2 font-mono text-xs">
                                  {item.formula}
                                </div>
                              )}
                              {item.goodRange && (
                                <div className="flex gap-2 text-sm">
                                  <Badge variant="outline" className="shrink-0 text-green-600 border-green-300 bg-green-50 dark:bg-green-950">Faixa ideal</Badge>
                                  <span className="text-muted-foreground">{item.goodRange}</span>
                                </div>
                              )}
                              {item.details && (
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.details}</p>
                              )}
                              {item.tip && (
                                <div className="flex gap-2 text-sm bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2.5">
                                  <span className="shrink-0">💡</span>
                                  <span>{item.tip}</span>
                                </div>
                              )}
                              {item.videoUrl && (
                                <a
                                  href={item.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 w-fit transition-colors hover:bg-red-100 dark:hover:bg-red-900/50"
                                >
                                  <Play className="h-4 w-4 fill-current" />
                                  {item.videoLabel || 'Assistir video no YouTube'}
                                </a>
                              )}
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.term}
                                  className="rounded-lg w-full max-w-sm h-auto border"
                                  loading="lazy"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {filteredSections.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum resultado</h3>
                <p className="text-muted-foreground">Tente buscar por outro termo ou pergunte a IA</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Chat sidebar */}
        {chatOpen && (
          <div className="lg:sticky lg:top-4 h-fit">
            <Card className="flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Assistente IA
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}><X className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">Pergunte qualquer coisa sobre gestao de trafego, metricas, estrategias...</p>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto space-y-1 px-3">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Pergunte qualquer coisa!</p>
                    <div className="mt-4 space-y-2">
                      {[
                        'O que e um bom ROAS para e-commerce?',
                        'Como reduzir meu CPC?',
                        'Quando devo usar CBO vs ABO?',
                        'Como estruturar um funil de anuncios?',
                      ].map((q) => (
                        <Button
                          key={q}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs justify-start h-auto py-2 whitespace-normal text-left"
                          onClick={() => {
                            setChatHistory([{ role: 'user', content: q, createdAt: new Date().toISOString() }]);
                            sendAI.mutate(q);
                          }}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <ChatMessage key={i} role={msg.role} content={msg.content} createdAt={msg.createdAt} />
                ))}
                {sendAI.isPending && (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Pensando...
                  </div>
                )}
                <div ref={chatEndRef} />
              </CardContent>

              <div className="p-3 border-t flex-shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2">
                  <Input
                    placeholder="Digite sua pergunta..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    disabled={sendAI.isPending}
                    className="text-sm"
                  />
                  <Button type="submit" size="sm" disabled={sendAI.isPending || !chatMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
