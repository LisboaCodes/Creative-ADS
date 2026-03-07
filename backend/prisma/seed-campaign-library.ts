import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  // ═══════════════════════════════════════════════════════════════
  // 1. E-COMMERCE - FACEBOOK/INSTAGRAM
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'ASC+ Advantage Shopping - E-commerce Geral',
    niche: 'e-commerce',
    platform: 'FACEBOOK',
    objective: 'vendas-catalogo',
    category: 'asc',
    description: 'Advantage+ Shopping Campaigns (ASC) é a estrutura mais poderosa do Meta para e-commerce em 2025-2026. Usa IA do Meta para encontrar compradores automaticamente, sem segmentação manual.',
    strategy: `ESTRATÉGIA COMPLETA ASC+:

1. ESTRUTURA: 1 campanha ASC+ por catálogo/loja
2. ORÇAMENTO: CBO automático (o Meta distribui). Mínimo R$50/dia para começar, ideal R$150-300/dia.
3. CRIATIVOS: Mínimo 5 criativos variados (mix de formatos). O algoritmo testa tudo automaticamente.
4. PÚBLICO: Sem segmentação manual. O ASC+ usa ML para encontrar compradores. Você pode definir "existing customers" para controlar remarketing (recomendo 20-30% do budget para existentes).
5. CATÁLOGO: Precisa ter catálogo ativo com preços e estoque atualizados.
6. PIXEL: Precisa ter Purchase, AddToCart e ViewContent configurados com pelo menos 50 conversões/semana.
7. ESCALA: Quando ROAS > 3x por 3 dias, aumente 20-30% do budget. Nunca mais que 30% de uma vez.`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 50, max: 500, currency: 'BRL', recommended: 150 },
      specialAdCategories: [],
      campaignType: 'ADVANTAGE_PLUS_SHOPPING',
    },
    adSetSetup: {
      targeting: {
        type: 'BROAD',
        note: 'ASC+ não usa segmentação manual. O algoritmo encontra o público.',
        existingCustomerBudgetPercentage: 25,
        ageMin: 18,
        ageMax: 65,
        geoTargeting: 'Brasil inteiro ou estados com maior volume',
      },
      placements: 'ADVANTAGE_PLUS',
      schedule: 'continuous',
      optimizationEvent: 'PURCHASE',
      attribution: '7d_click_1d_view',
    },
    creativeSetup: {
      format: ['carrossel-catalogo', 'video-curto', 'imagem-produto', 'colecao'],
      specs: {
        video: { ratio: '9:16 ou 1:1', duration: '15-30s', resolution: '1080x1920' },
        imagem: { ratio: '1:1', resolution: '1080x1080' },
        carrossel: { cards: '3-10 produtos', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: '[Produto] com [X]% OFF', primaryText: 'Frete grátis + desconto exclusivo 🔥 Aproveite antes que acabe!', cta: 'SHOP_NOW' },
        { headline: 'Novidade: [Produto]', primaryText: 'Já disponível na nossa loja! Entrega rápida para todo Brasil.', cta: 'SHOP_NOW' },
      ],
      visualGuidelines: [
        'Produto em fundo limpo (branco ou lifestyle)',
        'Preço visível no criativo',
        'Selo de desconto em vermelho/amarelo',
        'Primeiros 3s do vídeo = hook visual (mostrar resultado)',
      ],
      hooks: [
        'Esse [produto] mudou minha rotina...',
        'R$[preço] por isso? Não acreditei!',
        'Comprei e não me arrependi',
        'POV: você descobre [produto]',
      ],
      ctaOptions: ['SHOP_NOW', 'LEARN_MORE', 'GET_OFFER'],
    },
    benchmarks: {
      ctr: { min: 1.0, avg: 1.8, top: 3.5 },
      cpc: { min: 0.30, avg: 0.80, top: 0.20 },
      cpm: { min: 8, avg: 18, top: 6 },
      roas: { min: 2.0, avg: 4.5, top: 10 },
      cpa: { min: 15, avg: 35, top: 8 },
      conversionRate: { min: 1.5, avg: 3.0, top: 6.0 },
    },
    tips: [
      'Comece com pelo menos 5 criativos variados',
      'Deixe o ASC+ rodar 7 dias antes de avaliar performance',
      'Não toque na campanha nas primeiras 72h (fase de aprendizado)',
      'Mantenha o catálogo atualizado diariamente',
      'Adicione 2-3 novos criativos por semana para evitar fadiga',
      'Use UTMs para rastrear no GA4 qual criativo converte mais',
    ],
    commonMistakes: [
      'Pausar a campanha antes de sair do Learning Phase (50 conversões)',
      'Mudar orçamento mais de 30% de uma vez',
      'Usar públicos salvos junto com ASC+ (anula a IA)',
      'Não ter Pixel/CAPI configurados corretamente',
      'Poucos criativos (menos de 5)',
    ],
    scalingGuide: `ESCALA ASC+:
1. Fase 1 (R$50-100/dia): Validar criativos e ROAS
2. Fase 2 (R$100-300/dia): Quando ROAS > 3x por 5 dias, subir 20%/dia
3. Fase 3 (R$300-1000/dia): Subir 20% a cada 3 dias se ROAS se mantiver
4. Fase 4 (R$1000+/dia): Considerar duplicar campanha para outro catálogo/vertical
Regra de ouro: Se CPA subir mais de 30%, volte ao orçamento anterior.`,
    source: 'Meta Best Practices 2025 + Performance Marketing Brasil',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.9,
  },

  {
    name: 'BDCAP - Broad Dynamic Creative Ad Pack',
    niche: 'e-commerce',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'bdcap',
    description: 'BDCAP combina segmentação broad (aberta) com Dynamic Creative (criativos dinâmicos). O Meta testa automaticamente combinações de imagens, títulos e textos para encontrar o melhor conjunto.',
    strategy: `ESTRATÉGIA BDCAP:

1. Campanha CBO com 1-3 conjuntos
2. Cada conjunto com Dynamic Creative LIGADO
3. Adicionar 5-10 imagens/vídeos + 5 títulos + 5 textos primários
4. Segmentação 100% BROAD (sem interesses, sem lookalike)
5. Otimização para Purchase ou AddToCart
6. O algoritmo testa 50+ combinações e entrega a melhor para cada pessoa
7. Analisar breakdown de criativos após 5-7 dias para ver quais assets performam`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 30, max: 300, currency: 'BRL', recommended: 100 },
    },
    adSetSetup: {
      targeting: {
        type: 'BROAD',
        ageMin: 18,
        ageMax: 65,
        gender: 'all',
        interests: [],
        note: 'Zero segmentação. Deixar o algoritmo trabalhar.',
        geoTargeting: 'Estados com histórico de compra',
      },
      placements: 'ADVANTAGE_PLUS',
      optimizationEvent: 'PURCHASE',
      attribution: '7d_click_1d_view',
    },
    creativeSetup: {
      format: ['dynamic-creative'],
      specs: {
        imagens: '5-10 variações (1:1 e 9:16)',
        videos: '3-5 variações (15-30s)',
        titulos: '5 variações',
        textosPrimarios: '5 variações',
        descricoes: '5 variações',
      },
      copyTemplates: [
        { headline: 'Oferta por tempo limitado ⏰', primaryText: 'Descubra por que milhares de pessoas já compraram [produto]. Frete grátis!', cta: 'SHOP_NOW' },
        { headline: 'Sua vida vai mudar com [produto]', primaryText: 'Avaliado 5 estrelas por nossos clientes. Compre com segurança.', cta: 'SHOP_NOW' },
        { headline: '[X]% OFF apenas hoje', primaryText: 'Promoção exclusiva para seguidores. Não perca!', cta: 'GET_OFFER' },
      ],
      visualGuidelines: [
        'Mix de lifestyle + produto isolado',
        'Sempre mostrar preço e desconto',
        'UGC (vídeo de cliente) performa muito bem',
        'Testar fundo branco vs fundo colorido',
        'Incluir antes/depois quando aplicável',
      ],
      hooks: [
        'Parei de [problema] quando descobri isso...',
        'Esse é o motivo de ter mais de [X] avaliações 5 estrelas',
        'Me pediram pra mostrar de novo...',
        'Vocês pediram, voltou!',
      ],
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.5, top: 3.0 },
      cpc: { min: 0.40, avg: 1.00, top: 0.25 },
      roas: { min: 2.0, avg: 3.5, top: 8.0 },
      cpa: { min: 20, avg: 45, top: 12 },
    },
    tips: [
      'Dynamic Creative funciona melhor com pelo menos 5 assets por tipo',
      'Não misture produtos diferentes no mesmo conjunto',
      'Renove criativos a cada 2-3 semanas',
      'Analise Asset Breakdown para descobrir quais combinações vendem mais',
    ],
    commonMistakes: [
      'Adicionar poucos criativos (menos de 5)',
      'Misturar produtos de categorias diferentes',
      'Não analisar o Asset Breakdown',
      'Pausar antes de 50 conversões',
    ],
    source: 'Media Buyers Brasil Community 2025',
    year: 2025,
    difficulty: 'iniciante',
    rating: 4.7,
  },

  {
    name: 'Remarketing Dinâmico - DPA (Dynamic Product Ads)',
    niche: 'e-commerce',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'remarketing',
    description: 'Anúncios dinâmicos de produto que mostram exatamente os itens que o usuário visualizou ou adicionou ao carrinho. Essencial para recuperar abandono de carrinho.',
    strategy: `ESTRATÉGIA DPA REMARKETING:

1. Público: ViewContent ou AddToCart nos últimos 7 dias (excluir quem comprou)
2. Template de catálogo com overlay de preço/desconto
3. Copy focado em urgência e escassez
4. Orçamento: 15-20% do budget total de ads
5. Frequency cap: max 3x por pessoa em 7 dias
6. Complementar com email/WhatsApp de carrinho abandonado`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 20, max: 150, currency: 'BRL', recommended: 50 },
    },
    adSetSetup: {
      targeting: {
        type: 'RETARGETING',
        audiences: [
          'ViewContent 7d (excl. Purchase 30d)',
          'AddToCart 7d (excl. Purchase 30d)',
          'AddToCart 3d (hot audience)',
        ],
        geoTargeting: 'Mesmo do catálogo',
      },
      placements: 'ADVANTAGE_PLUS',
      optimizationEvent: 'PURCHASE',
      attribution: '7d_click_1d_view',
    },
    creativeSetup: {
      format: ['catalogo-dinamico', 'carrossel-dinamico'],
      copyTemplates: [
        { headline: 'Ainda pensando? 🤔', primaryText: 'Esse produto está te esperando! Finalize sua compra com frete grátis.', cta: 'SHOP_NOW' },
        { headline: 'Volta aqui! Preço especial 💰', primaryText: 'Você deixou algo no carrinho. Aproveite 10% OFF por tempo limitado!', cta: 'GET_OFFER' },
      ],
      visualGuidelines: [
        'Template com overlay de desconto',
        'Moldura com cor da marca',
        'Preço riscado + preço promocional',
        'Estrelas de avaliação no template',
      ],
    },
    benchmarks: {
      ctr: { min: 1.5, avg: 3.0, top: 6.0 },
      cpc: { min: 0.15, avg: 0.40, top: 0.08 },
      roas: { min: 5.0, avg: 10.0, top: 25.0 },
      cpa: { min: 5, avg: 15, top: 3 },
      conversionRate: { min: 3.0, avg: 6.0, top: 12.0 },
    },
    tips: [
      'Segmente AddToCart 1-3 dias separado de 4-7 dias (urgência diferente)',
      'Adicione countdown/urgência nos templates de catálogo',
      'ROAS de remarketing deve ser 5x+ para ser saudável',
      'Combine com email de abandono de carrinho para máximo impacto',
    ],
    commonMistakes: [
      'Não excluir compradores recentes',
      'Orçamento muito alto (desperdiça com frequência excessiva)',
      'Copy genérico sem urgência',
      'Não ter templates de catálogo customizados',
    ],
    source: 'Meta Certified Buying Professional Program 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.8,
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. INFOPRODUTOS / CURSOS ONLINE
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Lançamento Perpétuo - Funil de Vendas',
    niche: 'infoprodutos',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'cbo',
    description: 'Estrutura de campanha para venda perpétua de infoprodutos (cursos, e-books, mentorias). Funil: Topo (awareness com conteúdo) → Meio (lead com isca digital) → Fundo (venda com oferta).',
    strategy: `FUNIL PERPÉTUO 3 CAMADAS:

TOPO - Awareness (30% do budget)
- Objetivo: ThruPlay ou Landing Page Views
- Público: Broad + Interesses amplos do nicho
- Criativo: Vídeo de conteúdo puro (3-5 min), sem CTA de venda

MEIO - Captação de Lead (40% do budget)
- Objetivo: Leads ou Conversão (Lead)
- Público: Engajou com vídeos de topo + Lookalike 1-3%
- Criativo: Isca digital (e-book, aula gratuita, checklist)

FUNDO - Venda (30% do budget)
- Objetivo: Conversão (Purchase)
- Público: Leads captados + visitou página de vendas
- Criativo: VSL, depoimentos, oferta com deadline`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 50, max: 500, currency: 'BRL', recommended: 150 },
    },
    adSetSetup: {
      targeting: {
        type: 'FUNNEL',
        topo: 'Interesses amplos do nicho + Broad',
        meio: 'Video Viewers 50%+ (7d) + Lookalike 1-3% de compradores',
        fundo: 'Leads + Visitantes página de vendas (7d) + Carrinho abandonado',
      },
      placements: 'Feeds + Stories + Reels',
      optimizationEvent: 'PURCHASE',
    },
    creativeSetup: {
      format: ['video-longo', 'video-curto', 'carrossel-depoimentos', 'imagem-oferta'],
      copyTemplates: [
        { headline: 'Aula GRATUITA: Como [resultado]', primaryText: 'Descubra o método que já ajudou [X] pessoas a [resultado]. Cadastre-se gratuitamente.', cta: 'SIGN_UP' },
        { headline: 'Última chance: [Curso] com [X]% OFF', primaryText: '🔥 Oferta especial acaba hoje! De R$[preço original] por apenas R$[preço]. Garantia de 7 dias.', cta: 'LEARN_MORE' },
      ],
      hooks: [
        'Eu faturei R$[X] em [tempo] usando esse método',
        'Se você quer [resultado], precisa assistir isso',
        'Eu estava [situação ruim] até descobrir...',
        '3 erros que te impedem de [resultado]',
        'Minha aluna fez R$[X] na primeira semana',
      ],
      visualGuidelines: [
        'Talking head (pessoa falando pra câmera) funciona muito bem',
        'Depoimentos em vídeo > imagem estática',
        'Screenshot de resultados (prints de faturamento)',
        'Antes e depois (resultado dos alunos)',
      ],
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.5, top: 3.0 },
      cpc: { min: 0.50, avg: 1.50, top: 0.30 },
      cpa: { min: 5, avg: 15, top: 3 },
      roas: { min: 3.0, avg: 6.0, top: 15.0 },
      cplead: { min: 2, avg: 6, top: 1.5 },
    },
    tips: [
      'VSL (Video Sales Letter) de 15-40 min é o formato mais forte para venda',
      'Depoimentos em vídeo curto (30-60s) são ouro para remarketing',
      'Adicione urgência real (vagas limitadas, bônus exclusivos)',
      'Retargeting de quem assistiu 50%+ do VSL tem ROAS altíssimo',
      'Teste copy emocional vs racional para seu nicho',
    ],
    commonMistakes: [
      'Tentar vender direto sem aquecer o público',
      'Não ter funil (jogar todo mundo direto pra página de vendas)',
      'VSL muito longo sem hooks nos primeiros 30s',
      'Não fazer remarketing de leads que não compraram',
      'Ignorar o lifetime value (vender 1 produto vs ter esteira)',
    ],
    scalingGuide: `Escalar funil perpétuo:
1. Validar CPL < R$8 e ROAS > 3x com R$50/dia
2. Subir topo de funil para R$100-200/dia (alimentar meio e fundo)
3. Quando tiver 1000+ leads/mês, escalar fundo para R$200-500/dia
4. Criar novos ângulos de copy e criativos a cada 2 semanas`,
    source: 'Top Infoprodutores BR 2024-2025',
    year: 2025,
    difficulty: 'avancado',
    rating: 4.8,
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. SERVIÇOS LOCAIS (Restaurantes, Salões, Clínicas)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Mensagens WhatsApp - Negócio Local',
    niche: 'servicos-locais',
    platform: 'FACEBOOK',
    objective: 'mensagens',
    category: 'cbo',
    description: 'Campanha otimizada para gerar conversas no WhatsApp. Ideal para serviços locais como clínicas, restaurantes, salões, academias. O lead conversa direto pelo WhatsApp e agenda.',
    strategy: `ESTRATÉGIA WHATSAPP ADS:

1. Objetivo: Mensagens (WhatsApp)
2. Raio: 5-15km do negócio
3. Público: Interesses relacionados + Broad local
4. Criativo: Foto/vídeo do serviço + oferta clara
5. CTA: "Enviar mensagem no WhatsApp"
6. Mensagem automática pré-configurada
7. Responder em menos de 5 minutos (taxa de conversão despenca após)`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'CONVERSATIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 15, max: 100, currency: 'BRL', recommended: 30 },
    },
    adSetSetup: {
      targeting: {
        type: 'LOCAL',
        radius: '5-15km do estabelecimento',
        ageMin: 18,
        ageMax: 55,
        interests: ['Exemplo: Saúde e bem-estar, Beleza, Gastronomia'],
        note: 'Sempre testar Broad (só localização) vs Interesses',
        geoTargeting: 'Raio específico do endereço do negócio',
      },
      placements: 'Feeds + Stories + Reels (Instagram e Facebook)',
      optimizationEvent: 'CONVERSATIONS',
    },
    creativeSetup: {
      format: ['video-curto', 'imagem-oferta', 'carrossel-servicos'],
      copyTemplates: [
        { headline: '[Serviço] com [X]% OFF 📍', primaryText: 'Agende pelo WhatsApp e ganhe desconto exclusivo! Estamos na [bairro/cidade]. Clique em "Enviar mensagem" 👇', cta: 'WHATSAPP_MESSAGE' },
        { headline: 'Vaga aberta para [serviço]', primaryText: '📱 Chame no WhatsApp e agende sua [consulta/sessão/horário]. Atendimento rápido!', cta: 'WHATSAPP_MESSAGE' },
      ],
      hooks: [
        'Procurando [serviço] perto de você?',
        'Oferta exclusiva para moradores de [bairro]',
        'Últimas vagas da semana!',
        'Conheça o resultado de [tratamento]',
      ],
      visualGuidelines: [
        'Foto real do espaço/equipe (autenticidade)',
        'Mostrar resultados (antes/depois para estética, prato pronto para restaurante)',
        'Incluir endereço ou referência do bairro',
        'Vídeo tour do espaço funciona muito bem',
      ],
    },
    benchmarks: {
      ctr: { min: 1.5, avg: 3.0, top: 6.0 },
      cpc: { min: 0.20, avg: 0.60, top: 0.10 },
      cpm: { min: 5, avg: 12, top: 3 },
      cpa: { min: 3, avg: 8, top: 1.5 },
    },
    tips: [
      'Responda em menos de 5 minutos - cada minuto que passa, perde conversão',
      'Configure mensagem de boas-vindas automática no WhatsApp Business',
      'Inclua o endereço/bairro no criativo para filtrar o público',
      'Teste horários: negócios locais performam melhor 10h-14h e 18h-21h',
      'Faça remarketing para quem iniciou conversa mas não agendou',
    ],
    commonMistakes: [
      'Raio muito grande (leads longe demais não comparecem)',
      'Não responder rápido (lead esfria em minutos)',
      'Copy sem oferta clara (desconto, condição especial)',
      'Não ter processo de atendimento no WhatsApp definido',
    ],
    source: 'Meta for Business - Local Business Playbook 2025',
    year: 2025,
    difficulty: 'iniciante',
    rating: 4.8,
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. IMOBILIÁRIO
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Lead Generation - Imóveis',
    niche: 'imobiliario',
    platform: 'FACEBOOK',
    objective: 'leads',
    category: 'cbo',
    description: 'Campanha para captar leads qualificados de compradores/locatários de imóveis. Usa formulário do Facebook (Lead Form) ou landing page externa. Segmentação por renda, idade e localização.',
    strategy: `ESTRATÉGIA LEAD GEN IMOBILIÁRIO:

1. Público: Homeowners, Life events (moving), Renda (quando disponível)
2. Lead Form do Facebook com perguntas qualificadoras (orçamento, tipo de imóvel, bairro)
3. Criativos: Tour virtual do imóvel, drone shots, destaques do empreendimento
4. Integração automática do lead com CRM (Pipedrive, HubSpot, etc.)
5. Follow-up em menos de 1h (lead de imóvel esfria muito rápido)`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'LEAD_GENERATION',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 30, max: 300, currency: 'BRL', recommended: 80 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 25,
        ageMax: 55,
        interests: ['Real estate', 'Property investment', 'Home ownership', 'Luxury real estate'],
        behaviors: ['Recently moved', 'Homeowners', 'High income'],
        geoTargeting: 'Cidade/região do empreendimento + cidades vizinhas',
      },
      placements: 'Feeds + Stories',
      optimizationEvent: 'LEAD',
    },
    creativeSetup: {
      format: ['video-tour', 'carrossel-ambientes', 'imagem-fachada', 'colecao'],
      copyTemplates: [
        { headline: 'Apartamentos a partir de R$[X] em [bairro]', primaryText: '🏠 Condomínio [nome] | [X] quartos, [X]m², lazer completo. Condições especiais de lançamento! Cadastre-se e receba a tabela de preços.', cta: 'SIGN_UP' },
        { headline: 'Viva em [bairro] - Lançamento', primaryText: 'Entrada facilitada + financiamento aprovado na hora. Agende sua visita ao decorado!', cta: 'LEARN_MORE' },
      ],
      visualGuidelines: [
        'Drone shot da fachada/região é o melhor hook para vídeo',
        'Carrossel: fachada → sala → cozinha → quarto → lazer → planta',
        'Mostrar planta baixa com medidas',
        'Incluir mapa de localização/proximidade de pontos importantes',
        'Render 3D para lançamentos, fotos reais para prontos',
      ],
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.5, top: 3.0 },
      cpc: { min: 1.0, avg: 2.5, top: 0.50 },
      cplead: { min: 8, avg: 25, top: 5 },
    },
    tips: [
      'Lead Form com 3-5 perguntas qualificadoras (orçamento, quando pretende comprar, bairro preferido)',
      'Adicione "Contexto" no Lead Form (página de agradecimento com info do empreendimento)',
      'Integre com CRM automaticamente (Zapier, Make)',
      'SDR deve ligar em menos de 1h após o lead',
      'Teste Instant Form vs Link Externo (form geralmente tem mais volume, link tem mais qualidade)',
    ],
    commonMistakes: [
      'Lead Form sem perguntas qualificadoras (recebe lixo)',
      'Não ligar rápido para o lead (1h max)',
      'Criativo sem mostrar o preço (atrai curiosos)',
      'Segmentação muito ampla sem filtro de renda',
    ],
    source: 'Top Imobiliárias Brasil - Meta Case Studies 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.6,
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. SAÚDE E FITNESS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Captação de Alunos - Academia/Personal',
    niche: 'saude',
    platform: 'FACEBOOK',
    objective: 'mensagens',
    category: 'cbo',
    description: 'Campanha para academias, estúdios e personal trainers captarem novos alunos via WhatsApp ou formulário. Foco em antes/depois, resultados e oferta de aula experimental.',
    strategy: `ESTRATÉGIA FITNESS:

1. Público: Interesse em fitness + Raio de 5-10km
2. Criativo: Antes/depois de alunos (com autorização) + vídeo de treino
3. Oferta: Aula experimental grátis / 1ª semana por R$1
4. CTA para WhatsApp (agendar aula)
5. Follow-up: mensagem de confirmação + lembrete 1 dia antes`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'CONVERSATIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 15, max: 80, currency: 'BRL', recommended: 30 },
    },
    adSetSetup: {
      targeting: {
        type: 'LOCAL',
        radius: '5-10km',
        ageMin: 18,
        ageMax: 50,
        interests: ['Fitness', 'Gym', 'CrossFit', 'Yoga', 'Running', 'Weight loss'],
        geoTargeting: 'Raio do estabelecimento',
      },
      placements: 'Instagram Feed + Stories + Reels',
      optimizationEvent: 'CONVERSATIONS',
    },
    creativeSetup: {
      format: ['video-curto', 'carrossel-antes-depois', 'reels'],
      copyTemplates: [
        { headline: 'Aula experimental GRÁTIS 💪', primaryText: '📍 [Nome da academia] em [bairro]. Venha conhecer! Agende sua aula grátis pelo WhatsApp 👇', cta: 'WHATSAPP_MESSAGE' },
        { headline: 'Transformação em [X] semanas', primaryText: 'Veja o resultado da [nome da aluna]! Quer ser a próxima? Chama no WhatsApp.', cta: 'WHATSAPP_MESSAGE' },
      ],
      hooks: [
        'Em 30 dias ela mudou completamente...',
        'Treino que queima gordura 3x mais rápido',
        'Aula grátis essa semana - últimas vagas',
        'Meu antes e depois de [X] meses',
      ],
      visualGuidelines: [
        'Antes/depois lado a lado (com data)',
        'Vídeo de treino energético com música',
        'Mostrar o espaço e equipamentos',
        'Depoimento em vídeo de alunos (30-60s)',
      ],
    },
    benchmarks: {
      ctr: { min: 1.5, avg: 3.0, top: 5.0 },
      cpc: { min: 0.15, avg: 0.50, top: 0.08 },
      cpa: { min: 3, avg: 10, top: 2 },
    },
    tips: [
      'Antes/depois é o criativo com maior CTR nesse nicho',
      'Horário: postar de manhã (6-8h) e fim de tarde (17-19h)',
      'Ofereça barreira baixa (aula grátis, 1ª semana por R$1)',
      'Colete depoimentos em vídeo de alunos satisfeitos',
    ],
    commonMistakes: [
      'Fotos genéricas de banco de imagem',
      'Não responder WhatsApp rapidamente',
      'Preço alto na 1ª interação (primeiro gerar valor)',
      'Não fazer follow-up de quem agendou mas não apareceu',
    ],
    source: 'Studio Growth Playbook 2025',
    year: 2025,
    difficulty: 'iniciante',
    rating: 4.7,
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. SaaS / B2B
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'B2B Lead Gen - LinkedIn Ads',
    niche: 'saas',
    platform: 'LINKEDIN',
    objective: 'leads',
    category: 'lead-gen',
    description: 'Campanha de geração de leads B2B no LinkedIn. Ideal para SaaS, consultorias e serviços corporativos. LinkedIn tem o melhor targeting B2B (cargo, empresa, setor, tamanho da empresa).',
    strategy: `ESTRATÉGIA LINKEDIN B2B:

1. Formato: Sponsored Content (Single Image ou Video) + Lead Gen Forms
2. Targeting: Cargo + Setor + Tamanho da empresa
3. Lead Gen Form com 3-4 campos (nome, email, cargo, empresa)
4. Oferta: Demo gratuita, trial, whitepaper, webinar
5. Retargeting: quem visitou o perfil + engajou com posts
6. Budget: LinkedIn é mais caro - mínimo R$50/dia`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'LEAD_GENERATION',
      bidStrategy: 'MANUAL_CPC',
      budgetType: 'daily',
      budgetRange: { min: 50, max: 500, currency: 'BRL', recommended: 100 },
    },
    adSetSetup: {
      targeting: {
        type: 'B2B_TARGETING',
        jobTitles: ['CEO', 'CMO', 'Head de Marketing', 'Diretor Comercial', 'Gerente de TI'],
        companySizes: ['51-200', '201-500', '501-1000', '1001-5000'],
        industries: ['Tecnologia', 'Serviços financeiros', 'Varejo', 'Saúde'],
        seniority: ['Manager', 'Director', 'VP', 'C-Suite'],
        note: 'Público ideal: 30.000-300.000 pessoas. Menor que isso é muito nichado.',
      },
      placements: 'LinkedIn Feed',
      optimizationEvent: 'LEAD',
    },
    creativeSetup: {
      format: ['imagem-profissional', 'video-demo', 'carrossel-beneficios', 'document-ad'],
      copyTemplates: [
        { headline: 'Reduza [problema] em [X]% com [produto]', primaryText: '[X]+ empresas já usam [produto] para [benefício]. Agende uma demo gratuita e veja como funciona na prática.', cta: 'SIGN_UP' },
        { headline: 'Guia gratuito: [tema B2B relevante]', primaryText: 'Baixe o relatório com insights de [X] empresas sobre [tema]. Dados exclusivos de 2025.', cta: 'DOWNLOAD' },
      ],
      visualGuidelines: [
        'Imagens profissionais (evitar stock genérico)',
        'Dashboard/screenshot do produto em uso',
        'Dados e números no criativo (% de melhoria, ROI)',
        'Logo de clientes conhecidos (social proof)',
        'Cores sóbrias e profissionais',
      ],
    },
    benchmarks: {
      ctr: { min: 0.4, avg: 0.8, top: 1.5 },
      cpc: { min: 5.0, avg: 15.0, top: 3.0 },
      cplead: { min: 30, avg: 80, top: 20 },
      cpm: { min: 30, avg: 60, top: 20 },
    },
    tips: [
      'LinkedIn é caro mas os leads são muito mais qualificados que Meta/Google',
      'Lead Gen Forms convertem 2-3x mais que landing page externa no LinkedIn',
      'Teste Document Ads (PDF nativo) - engagement rate alto',
      'Retargeting de quem abriu o Lead Form mas não enviou',
      'Dia e hora: terça a quinta, 9h-12h e 14h-17h',
    ],
    commonMistakes: [
      'Público muito pequeno (<30.000 pessoas)',
      'Copy de vendas agressivo (LinkedIn é profissional, seja consultivo)',
      'Não testar diferentes cargos/títulos',
      'Formulário com muitos campos (max 4-5)',
      'Não fazer follow-up rápido dos leads',
    ],
    source: 'LinkedIn Marketing Solutions Playbook 2025',
    year: 2025,
    difficulty: 'avancado',
    rating: 4.5,
  },

  // ═══════════════════════════════════════════════════════════════
  // 7. GOOGLE ADS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Performance Max - E-commerce Google',
    niche: 'e-commerce',
    platform: 'GOOGLE_ADS',
    objective: 'vendas-catalogo',
    category: 'performance-max',
    description: 'Performance Max (PMax) é a campanha all-in-one do Google. Aparece em Search, Display, YouTube, Gmail, Discover e Maps simultaneamente. Usa IA do Google para maximizar conversões.',
    strategy: `ESTRATÉGIA PERFORMANCE MAX:

1. Feed do Merchant Center atualizado e otimizado
2. Grupos de ativos: separar por categoria de produto
3. Cada grupo: 5+ imagens, 5+ títulos, 5+ descrições, 1+ vídeo
4. Sinais de público (audience signals): adicionar listas de clientes + interesses
5. Usar tROAS como meta (começar com ROAS realista, ex: 300%)
6. Excluir termos de marca se já tiver campanha de Search de marca`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'CONVERSIONS',
      bidStrategy: 'TARGET_ROAS',
      budgetType: 'daily',
      budgetRange: { min: 50, max: 1000, currency: 'BRL', recommended: 200 },
      targetRoas: 300,
    },
    adSetSetup: {
      targeting: {
        type: 'AI_AUTOMATED',
        audienceSignals: [
          'Lista de clientes (Customer Match)',
          'Visitantes do site (remarketing)',
          'Interesses: compras online, categorias relevantes',
          'Dados demográficos: renda acima da média',
        ],
        note: 'PMax usa sinais como sugestão - a IA decide onde mostrar',
        geoTargeting: 'Brasil (ou estados específicos com melhor performance)',
      },
      placements: 'Todos automáticos (Search, Shopping, Display, YouTube, Gmail, Discover)',
      optimizationEvent: 'PURCHASE',
    },
    creativeSetup: {
      format: ['imagens-produto', 'video-youtube', 'textos-responsivos'],
      specs: {
        images: { landscape: '1200x628', square: '1200x1200', portrait: '960x1200', count: '5-15' },
        logos: { square: '1200x1200', landscape: '1200x300' },
        videos: { duration: '15-30s', ratio: '16:9 e 9:16' },
        headlines: { count: '5-15', maxChars: 30 },
        longHeadlines: { count: '1-5', maxChars: 90 },
        descriptions: { count: '2-5', maxChars: 90 },
      },
      copyTemplates: [
        { headline: '[Produto] com Frete Grátis', longHeadline: 'Compre [Produto] com [X]% de desconto e frete grátis para todo Brasil', description: 'Loja oficial. Pagamento em até 12x. Troca fácil em até 30 dias.' },
        { headline: '[Marca] - Oferta Especial', longHeadline: 'Descubra [Produto]: qualidade premium pelo melhor preço do mercado', description: 'Mais de [X] clientes satisfeitos. Entrega expressa. Compre agora!' },
      ],
    },
    benchmarks: {
      roas: { min: 2.0, avg: 4.0, top: 10.0 },
      cpc: { min: 0.20, avg: 0.80, top: 0.10 },
      conversionRate: { min: 1.5, avg: 3.0, top: 6.0 },
      cpa: { min: 10, avg: 30, top: 5 },
    },
    tips: [
      'Separe grupos de ativos por categoria de produto (não misture tudo)',
      'Adicione customer match list como audience signal (melhora muito)',
      'Comece com tROAS conservador e aumente gradualmente',
      'Analise "insights" no Google Ads para ver quais search terms convertem',
      'Se tiver produtos com margens diferentes, separe em campanhas diferentes',
    ],
    commonMistakes: [
      'Feed do Merchant Center desatualizado (preços, estoque)',
      'Poucos ativos criativos (mínimo 5 de cada tipo)',
      'tROAS muito agressivo no início (IA não consegue otimizar)',
      'Não excluir termos de marca (canibaliza Search de marca)',
      'Um único grupo de ativos para todos os produtos',
    ],
    source: 'Google Ads Best Practices 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.7,
  },

  {
    name: 'Search Ads - Serviços Locais',
    niche: 'servicos-locais',
    platform: 'GOOGLE_ADS',
    objective: 'leads',
    category: 'abo',
    description: 'Campanha de pesquisa do Google para captar clientes procurando serviços locais (encanador, dentista, advogado, etc.). Capta demanda ativa - pessoas que já estão procurando.',
    strategy: `ESTRATÉGIA SEARCH LOCAL:

1. Palavras-chave: [serviço] + [cidade/bairro] (ex: "dentista zona sul SP")
2. Match types: Phrase match + Exact match (evitar broad match)
3. Extensões: Local, Chamada, Sitelinks, Snippets
4. Landing page: com telefone, WhatsApp e formulário
5. Geo-targeting: raio de atuação do serviço
6. Horários: ajustar lances para horário comercial`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'CONVERSIONS',
      bidStrategy: 'MAXIMIZE_CONVERSIONS',
      budgetType: 'daily',
      budgetRange: { min: 20, max: 200, currency: 'BRL', recommended: 50 },
    },
    adSetSetup: {
      targeting: {
        type: 'KEYWORD_BASED',
        keywords: [
          '"[serviço] [cidade]" (phrase match)',
          '[serviço] [bairro] (phrase match)',
          '[serviço] perto de mim (phrase match)',
          'melhor [serviço] [cidade] (phrase match)',
        ],
        negativeKeywords: ['grátis', 'gratuito', 'curso', 'como ser', 'salário', 'vaga'],
        geoTargeting: 'Cidade/região de atuação',
      },
      placements: 'Google Search',
      optimizationEvent: 'LEAD',
    },
    creativeSetup: {
      format: ['responsive-search-ad'],
      specs: {
        headlines: { count: '15', maxChars: 30 },
        descriptions: { count: '4', maxChars: 90 },
        extensions: ['Local', 'Call', 'Sitelinks', 'Callouts', 'Structured Snippets'],
      },
      copyTemplates: [
        {
          headlines: ['[Serviço] em [Cidade]', 'Atendimento Imediato', 'Orçamento Grátis', 'Profissional Certificado', 'Avaliação 5 Estrelas'],
          descriptions: ['Profissional experiente em [cidade]. Atendimento rápido e preço justo. Ligue agora!', 'Mais de [X] clientes atendidos. Orçamento sem compromisso. WhatsApp disponível.'],
        },
      ],
    },
    benchmarks: {
      ctr: { min: 3.0, avg: 6.0, top: 12.0 },
      cpc: { min: 1.0, avg: 3.0, top: 0.50 },
      conversionRate: { min: 5.0, avg: 10.0, top: 20.0 },
      cplead: { min: 5, avg: 15, top: 3 },
    },
    tips: [
      'Search capta DEMANDA ATIVA - pessoa já quer o serviço',
      'Use extensão de chamada (muita gente liga direto)',
      'Landing page DEVE ter telefone clicável + WhatsApp',
      'Negativas: sempre adicionar "grátis", "curso", "vaga", "como ser"',
      'Ajuste lances por horário: +30% em horário comercial, -50% madrugada',
    ],
    commonMistakes: [
      'Usar broad match sem negativas (desperdiça verba)',
      'Landing page genérica sem telefone/WhatsApp visível',
      'Não usar extensões de anúncio (perda de espaço visual)',
      'Geo-targeting muito amplo para serviço local',
    ],
    source: 'Google Ads para PMEs - Playbook Brasil 2025',
    year: 2025,
    difficulty: 'iniciante',
    rating: 4.8,
  },

  // ═══════════════════════════════════════════════════════════════
  // 8. TIKTOK ADS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Spark Ads + Conversão - E-commerce TikTok',
    niche: 'e-commerce',
    platform: 'TIKTOK',
    objective: 'conversao',
    category: 'spark-ads',
    description: 'Spark Ads permite promover posts orgânicos existentes (seus ou de creators). Combina autenticidade de UGC com poder de segmentação do TikTok Ads. Melhor formato para e-commerce no TikTok.',
    strategy: `ESTRATÉGIA TIKTOK SPARK ADS:

1. Criar ou selecionar UGC autênticos (parecer orgânico, não ad)
2. Spark Ads: boost post orgânico que já teve engajamento
3. Otimizar para Complete Payment (não ViewContent)
4. Público: Broad com pixel alimentado (50+ conversões/semana ideal)
5. Criativos de 15-30s com hook nos primeiros 2-3s
6. Formato vertical 9:16 OBRIGATÓRIO`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 30, max: 300, currency: 'BRL', recommended: 80 },
    },
    adSetSetup: {
      targeting: {
        type: 'BROAD',
        ageMin: 18,
        ageMax: 45,
        note: 'TikTok funciona melhor com targeting broad. A IA é forte.',
        geoTargeting: 'Brasil ou estados com maior conversão',
      },
      placements: 'TikTok Feed (For You Page)',
      optimizationEvent: 'COMPLETE_PAYMENT',
    },
    creativeSetup: {
      format: ['spark-ads', 'video-ugc', 'video-nativo'],
      specs: {
        video: { ratio: '9:16', duration: '15-60s', resolution: '1080x1920' },
        note: 'NUNCA usar formato horizontal. Sempre vertical.',
      },
      copyTemplates: [
        { headline: '', primaryText: 'TikTok made me buy it 🛒 Link na bio!', cta: 'SHOP_NOW' },
        { headline: '', primaryText: 'POV: você descobre [produto] e sua vida muda ✨ #tiktokmademebuyit', cta: 'SHOP_NOW' },
      ],
      hooks: [
        'Isso aqui mudou minha vida e eu não to exagerando',
        'Comprei esse [produto] sem esperar nada e...',
        'Vou te mostrar algo que ninguém te conta sobre [produto]',
        'PARA TUDO! Achei [produto] por R$[preço]',
        'Me pediram review honesto de [produto]',
        'Testei [produto] por 30 dias e olha o resultado',
      ],
      visualGuidelines: [
        'Parecer orgânico (NÃO parecer anúncio)',
        'Pessoa falando pra câmera (face to camera)',
        'Demonstração do produto em uso real',
        'Unboxing é formato poderoso',
        'Transições rápidas, ritmo de TikTok',
        'Adicionar trending sound quando possível',
        'Legenda/subtitle sempre (muita gente assiste sem som)',
      ],
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.5, top: 3.0 },
      cpc: { min: 0.20, avg: 0.60, top: 0.10 },
      cpm: { min: 3, avg: 8, top: 2 },
      roas: { min: 2.0, avg: 4.0, top: 8.0 },
      cpa: { min: 10, avg: 25, top: 5 },
    },
    tips: [
      'Hook nos primeiros 2-3 segundos é TUDO no TikTok',
      'UGC de creator real > produção profissional',
      'Spark Ads preserva engajamento do post original',
      'Renove criativos a cada 5-7 dias (fadiga rápida no TikTok)',
      'Use TikTok Creative Center para ver trending ads',
      'Hashtags: #tiktokmademebuyit #achados #indicação',
    ],
    commonMistakes: [
      'Criativo que parece anúncio (produção demais)',
      'Vídeo horizontal ou quadrado (sempre 9:16)',
      'Hook fraco nos primeiros 3 segundos',
      'Não adicionar legendas/subtitles',
      'Mesmo criativo rodando por semanas (fadiga)',
    ],
    source: 'TikTok for Business - E-commerce Playbook 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.7,
  },

  {
    name: 'TikTok UGC - Moda e Beleza',
    niche: 'moda',
    platform: 'TIKTOK',
    objective: 'conversao',
    category: 'spark-ads',
    description: 'Estratégia UGC para marcas de moda e beleza no TikTok. Creators mostrando looks, demonstrando produtos, fazendo reviews. O formato mais natural e com maior conversão no TikTok.',
    strategy: `ESTRATÉGIA UGC MODA/BELEZA:

1. Recrutar 3-5 micro-creators (1K-50K seguidores) por mês
2. Brief simples: "use o produto, mostre o resultado, seja natural"
3. Creator posta organicamente → você faz Spark Ad do post
4. Testar diferentes hooks e ângulos com cada creator
5. Os melhores criativos viram "controladores" (rodam por semanas)
6. Renove creators e hooks constantemente`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 30, max: 200, currency: 'BRL', recommended: 60 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 18,
        ageMax: 35,
        gender: 'female',
        interests: ['Fashion', 'Beauty', 'Skincare', 'Makeup', 'Shopping'],
        geoTargeting: 'Brasil',
      },
      placements: 'TikTok Feed',
      optimizationEvent: 'COMPLETE_PAYMENT',
    },
    creativeSetup: {
      format: ['ugc-creator', 'get-ready-with-me', 'haul', 'review'],
      hooks: [
        'GRWM usando só [marca] ✨',
        'Montei 5 looks com 1 peça',
        'Review HONESTO de [produto] - vale a pena?',
        'Achei a [peça] perfeita por R$[preço]',
        'Favoritos do mês 💕',
        'Antes e depois com [produto de skincare]',
        'Testei [produto] por 7 dias seguidos',
      ],
      visualGuidelines: [
        'Iluminação natural (janela)',
        'Creator mostrando produto na pele/corpo',
        'Transição de "sem produto" para "com produto"',
        'Espelho/selfie mode é autêntico',
        'Mostrar textura, cor, acabamento de perto',
        'Close-up detalhado do produto',
      ],
    },
    benchmarks: {
      ctr: { min: 1.0, avg: 2.0, top: 4.0 },
      cpc: { min: 0.15, avg: 0.45, top: 0.08 },
      roas: { min: 2.5, avg: 5.0, top: 12.0 },
    },
    tips: [
      'Micro-creators (1K-50K) convertem mais que macro-influencers',
      'GRWM (Get Ready With Me) é o formato #1 para moda/beleza',
      'Teste o mesmo produto com 3-5 creators diferentes',
      'Negocie pacotes de 3-5 vídeos por creator (mais eficiente)',
      'Os melhores hooks vêm dos próprios creators - deixe-os criar',
    ],
    commonMistakes: [
      'Brief muito rígido (perde autenticidade)',
      'Só usar influencers grandes (caros e menos autênticos)',
      'Não pedir autorização de Spark Ads no contrato',
      'Produto não aparece nos primeiros 5 segundos',
    ],
    source: 'TikTok Creator Marketplace Insights 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.6,
  },

  // ═══════════════════════════════════════════════════════════════
  // 9. EDUCAÇÃO
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Captação de Alunos - Educação/Faculdade',
    niche: 'educacao',
    platform: 'FACEBOOK',
    objective: 'leads',
    category: 'cbo',
    description: 'Campanha para instituições de ensino captarem alunos para vestibular, pós-graduação, cursos técnicos e EAD. Funil de topo (awareness) + fundo (inscrição).',
    strategy: `ESTRATÉGIA EDUCAÇÃO:

1. Público: 17-35 anos, interesse em educação e carreira
2. Sazonalidade: picos em Jan-Fev (vestibular) e Jul-Ago (2º semestre)
3. Topo: Vídeo institucional + conteúdo de carreira
4. Fundo: Formulário de inscrição com bolsa/desconto
5. Remarketing: visitantes do site + engajados com vídeos
6. Prova social: depoimentos de ex-alunos empregados`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'LEAD_GENERATION',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 30, max: 300, currency: 'BRL', recommended: 80 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 17,
        ageMax: 35,
        interests: ['Education', 'Career development', 'University', 'Professional certification'],
        behaviors: ['Education level: High school', 'Recent: College grad'],
        geoTargeting: 'Cidade da instituição + região metropolitana',
      },
      placements: 'Instagram + Facebook Feeds + Stories',
      optimizationEvent: 'LEAD',
    },
    creativeSetup: {
      format: ['video-depoimento', 'carrossel-cursos', 'imagem-oferta'],
      copyTemplates: [
        { headline: 'Bolsas de até [X]% em [Área]', primaryText: '🎓 Inscreva-se na [Instituição] e comece sua carreira em [área]. Turmas com vagas limitadas. Inscrição gratuita!', cta: 'SIGN_UP' },
        { headline: 'Sua carreira em [área] começa aqui', primaryText: 'Ex-alunos empregados em empresas como [empresa X, Y, Z]. Nota máxima no MEC. Inscreva-se!', cta: 'LEARN_MORE' },
      ],
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.5, top: 3.0 },
      cplead: { min: 5, avg: 18, top: 3 },
      cpc: { min: 0.40, avg: 1.20, top: 0.25 },
    },
    tips: [
      'Depoimento de ex-aluno empregado é o criativo #1',
      'Bolsa/desconto na mensalidade é o hook mais forte',
      'Sazonalidade: aumentar budget 2 meses antes do vestibular',
      'Lookalike de matriculados converte muito bem',
    ],
    commonMistakes: [
      'Foto genérica de campus vazio',
      'Formulário com muitos campos',
      'Não fazer follow-up do lead em 24h',
      'Ignorar a sazonalidade do setor',
    ],
    source: 'EdTech Marketing Brasil 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.5,
  },

  // ═══════════════════════════════════════════════════════════════
  // 10. FINANÇAS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Fintech/Banco Digital - App Install + First Deposit',
    niche: 'financas',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'abo',
    description: 'Campanha para fintechs e bancos digitais adquirirem novos clientes. Objetivo: download do app + primeiro depósito/transação. Estrutura ABO com públicos segmentados por ticket.',
    strategy: `ESTRATÉGIA FINTECH:

1. ABO (Ad Set Budget Optimization) com públicos distintos
2. Públicos: Broad (volume), Interest (financeiro), Lookalike (clientes ativos)
3. Otimização para App Install ou First Deposit (evento custom)
4. Criativos: benefícios claros (cashback, sem taxas, rendimento)
5. Compliance: BACEN e Meta Financial Products Policy`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'APP_INSTALLS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 50, max: 500, currency: 'BRL', recommended: 150 },
      specialAdCategories: ['CREDIT'],
    },
    adSetSetup: {
      targeting: {
        type: 'ABO_SPLIT',
        sets: [
          { name: 'Broad 18-55', type: 'BROAD', ageMin: 18, ageMax: 55 },
          { name: 'Interest Finance', interests: ['Banking', 'Investment', 'Fintech', 'Credit card'] },
          { name: 'LAL 1% - Active Users', type: 'LOOKALIKE', percentage: 1 },
        ],
        geoTargeting: 'Brasil',
      },
      placements: 'ADVANTAGE_PLUS',
      optimizationEvent: 'APP_INSTALL',
    },
    creativeSetup: {
      format: ['video-curto', 'imagem-beneficio', 'carrossel-features'],
      copyTemplates: [
        { headline: 'Conta digital sem taxas 💳', primaryText: 'Abra sua conta em 5 minutos. Sem tarifas, sem burocracia. Cartão grátis + cashback em todas as compras.', cta: 'INSTALL_MOBILE_APP' },
        { headline: 'Seu dinheiro rendendo mais 📈', primaryText: 'CDI de [X]% ao ano, desde o primeiro real. Mais que a poupança, mais fácil que o banco.', cta: 'INSTALL_MOBILE_APP' },
      ],
    },
    benchmarks: {
      ctr: { min: 0.5, avg: 1.2, top: 2.5 },
      cpc: { min: 0.50, avg: 1.50, top: 0.30 },
      cpa: { min: 5, avg: 15, top: 3 },
    },
    tips: [
      'Financial Products Policy do Meta: cuidado com promessas de retorno',
      'CPI (custo por install) é métrica de vaidade - otimize para 1st deposit',
      'Cartão físico grátis é hook poderoso para aquisição',
      'Cashback imediato no 1º uso reduz churn drasticamente',
    ],
    commonMistakes: [
      'Prometer retornos financeiros (viola políticas)',
      'Otimizar só para install sem olhar ativação',
      'Não segmentar por especial ad category (CREDIT) quando necessário',
      'Copy muito técnico (falar em CDI/Selic para público leigo)',
    ],
    source: 'Fintech Growth Brasil 2025',
    year: 2025,
    difficulty: 'avancado',
    rating: 4.4,
  },

  // ═══════════════════════════════════════════════════════════════
  // 11. RESTAURANTES / FOOD
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Delivery + Presencial - Restaurante Local',
    niche: 'restaurantes',
    platform: 'FACEBOOK',
    objective: 'mensagens',
    category: 'cbo',
    description: 'Campanha para restaurantes atrair clientes para delivery (iFood, WhatsApp) e visitas presenciais. Foco visual no food photography.',
    strategy: `ESTRATÉGIA RESTAURANTE:

1. Raio de 3-8km (delivery) ou 1-3km (presencial)
2. Horários: 11h-14h (almoço), 18h-21h (jantar)
3. Criativo: FOTOS/VÍDEOS PROFISSIONAIS DA COMIDA (investir aqui!)
4. Oferta: combo especial, sobremesa grátis, desconto primeira compra
5. CTA: WhatsApp para pedido ou link do iFood`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'CONVERSATIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 10, max: 60, currency: 'BRL', recommended: 20 },
    },
    adSetSetup: {
      targeting: {
        type: 'LOCAL',
        radius: '3-8km',
        ageMin: 18,
        ageMax: 50,
        interests: ['Food delivery', 'Restaurants', 'Cooking', 'iFood', 'Fast food'],
        geoTargeting: 'Raio do restaurante',
        schedule: 'Apenas horários de refeição (11h-14h, 18h-22h)',
      },
      placements: 'Instagram Feed + Stories + Reels',
      optimizationEvent: 'CONVERSATIONS',
    },
    creativeSetup: {
      format: ['video-curto-comida', 'carrossel-pratos', 'reels'],
      hooks: [
        'O melhor [prato] de [bairro] é esse 🤤',
        'Você NÃO está preparado para esse hambúrguer',
        'Peça pelo WhatsApp e ganhe [brinde]',
        'Novo no cardápio! 🔥',
        'Combo exclusivo só essa semana',
      ],
      visualGuidelines: [
        'FOOD PHOTOGRAPHY profissional é obrigatório',
        'Vídeo de preparo (queijo derretendo, carne na grelha)',
        'Close-up dos ingredientes',
        'Pessoa mordendo/comendo (reaction)',
        'Ambiente do restaurante (se for bonito)',
      ],
    },
    benchmarks: {
      ctr: { min: 2.0, avg: 4.0, top: 8.0 },
      cpc: { min: 0.10, avg: 0.30, top: 0.05 },
      cpa: { min: 1, avg: 4, top: 0.50 },
    },
    tips: [
      'Food photography é 80% do sucesso - invista nisso',
      'Vídeo de cheese pull (queijo derretendo) sempre viraliza',
      'Horário de publicação importa MUITO (perto da refeição)',
      'Desconto na primeira compra pelo WhatsApp funciona demais',
      'Poste stories do dia-a-dia da cozinha (transparência)',
    ],
    commonMistakes: [
      'Fotos ruins/escuras da comida',
      'Raio muito grande (pessoas longe não pedem delivery)',
      'Rodar ads fora do horário de funcionamento',
      'Não ter cardápio digital pronto para enviar no WhatsApp',
    ],
    source: 'Food Marketing Academy 2025',
    year: 2025,
    difficulty: 'iniciante',
    rating: 4.7,
  },

  // ═══════════════════════════════════════════════════════════════
  // 12. LOOKALIKE AVANÇADO
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Lookalike Strategy - Escala Controlada',
    niche: 'e-commerce',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'lookalike',
    description: 'Estratégia avançada de Lookalike Audiences para escalar campanhas mantendo qualidade. Testar diferentes sources (compradores, top spenders, engajados) em diferentes percentuais (1%, 3%, 5%).',
    strategy: `ESTRATÉGIA LOOKALIKE AVANÇADA:

1. Criar múltiplas seed audiences:
   - Compradores (Purchase) últimos 180 dias
   - Top 25% por valor (Value-Based Lookalike)
   - AddToCart últimos 30 dias
   - Leads qualificados
   - Engajadores de Instagram (90 dias)

2. Para cada seed, criar LAL 1%, 2%, 3%, 5%
3. Testar em conjuntos separados (ABO)
4. LAL 1% = mais parecido (menor alcance, melhor qualidade)
5. LAL 5% = mais amplo (maior alcance, qualidade menor)
6. Graduaalmente expandir de 1% para 3% e 5% conforme escala`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 50, max: 500, currency: 'BRL', recommended: 150 },
    },
    adSetSetup: {
      targeting: {
        type: 'LOOKALIKE_TESTING',
        sets: [
          { name: 'LAL 1% Purchasers 180d', source: 'Purchase', percentage: 1 },
          { name: 'LAL 1% Top 25% Spenders', source: 'Top Value Customers', percentage: 1 },
          { name: 'LAL 3% Purchasers', source: 'Purchase', percentage: 3 },
          { name: 'LAL 1% AddToCart 30d', source: 'AddToCart', percentage: 1 },
          { name: 'LAL 5% IG Engagers', source: 'Instagram Engagement', percentage: 5 },
        ],
      },
      placements: 'ADVANTAGE_PLUS',
      optimizationEvent: 'PURCHASE',
    },
    creativeSetup: {
      format: ['os-mesmos-da-campanha-principal'],
      note: 'Use os mesmos criativos que já estão validados na campanha principal. O teste aqui é de PÚBLICO, não de criativo.',
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.5, top: 3.0 },
      roas: { min: 2.0, avg: 4.0, top: 8.0 },
    },
    tips: [
      'Value-Based LAL (baseado em valor de compra) é o mais poderoso',
      'Seed audience precisa ter pelo menos 1000 pessoas para funcionar bem',
      'LAL 1% de compradores geralmente é o melhor ponto de partida',
      'Exclua seed audience do LAL (não pague para alcançar quem já comprou)',
      'Quando LAL 1% satura, expanda para 3% em novo conjunto',
    ],
    commonMistakes: [
      'Seed audience muito pequena (<500 pessoas)',
      'Não excluir clientes existentes do LAL',
      'Misturar LALs no mesmo conjunto (impossível saber qual performa)',
      'Não testar diferentes sources antes de escalar',
    ],
    source: 'Advanced Facebook Marketing 2025',
    year: 2025,
    difficulty: 'avancado',
    rating: 4.6,
  },

  // ═══════════════════════════════════════════════════════════════
  // 13. GOOGLE ADS - YOUTUBE
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'YouTube Ads - Infoprodutos/Cursos',
    niche: 'infoprodutos',
    platform: 'GOOGLE_ADS',
    objective: 'conversao',
    category: 'abo',
    description: 'Campanha de Video Action no YouTube para vender infoprodutos. VSL (Video Sales Letter) como ad no YouTube. Público quente assistindo conteúdo relacionado.',
    strategy: `ESTRATÉGIA YOUTUBE ADS VSL:

1. Formato: Video Action Campaign (in-stream skippable)
2. Vídeo de 5-15 min (VSL curto) ou 30-60 min (VSL longo)
3. Targeting: Custom Intent (buscou termos relevantes) + In-Market
4. Hook forte nos primeiros 5s (antes do "skip")
5. CTA overlay + companion banner durante todo o vídeo
6. Landing page otimizada para mobile`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'CONVERSIONS',
      bidStrategy: 'MAXIMIZE_CONVERSIONS',
      budgetType: 'daily',
      budgetRange: { min: 30, max: 300, currency: 'BRL', recommended: 80 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTENT_BASED',
        customIntent: ['termos de busca relevantes do nicho'],
        inMarket: ['Business services', 'Education', 'Financial services'],
        placements: 'YouTube específicos (canais do nicho)',
        geoTargeting: 'Brasil',
      },
      placements: 'YouTube In-Stream',
      optimizationEvent: 'PURCHASE',
    },
    creativeSetup: {
      format: ['vsl-video', 'in-stream-skippable'],
      specs: {
        video: { duration: '5-60min', ratio: '16:9', resolution: '1920x1080' },
        thumbnail: 'Custom thumbnail com texto chamativo',
        companionBanner: '300x60',
      },
      hooks: [
        'Se você quer [resultado], não pule esse vídeo',
        'Eu vou te mostrar em [X] minutos como [resultado]',
        'Descubra o método que [prova social]',
        'ATENÇÃO: isso pode mudar sua vida profissional',
      ],
    },
    benchmarks: {
      ctr: { min: 0.3, avg: 0.7, top: 1.5 },
      cpv: { min: 0.02, avg: 0.05, top: 0.01 },
      roas: { min: 3.0, avg: 6.0, top: 15.0 },
      viewRate: { min: 15, avg: 30, top: 50 },
    },
    tips: [
      'Os primeiros 5 segundos decidem tudo (antes do "pular anúncio")',
      'Custom Intent: adicione termos que seu público busca no Google',
      'VSL longo (30min+) converte mais para produtos high-ticket',
      'Placement exclusion: exclua canais infantis e conteúdo irrelevante',
    ],
    commonMistakes: [
      'Hook fraco nos primeiros 5s (todo mundo pula)',
      'Targeting muito amplo (desperdiça impressões)',
      'Vídeo sem CTA claro durante o conteúdo',
      'Não testar diferentes durações de VSL',
    ],
    source: 'YouTube Ads Mastery 2025',
    year: 2025,
    difficulty: 'avancado',
    rating: 4.5,
  },

  // ═══════════════════════════════════════════════════════════════
  // 14. MULTI-PLATAFORMA
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Estratégia Omnichannel - E-commerce Full Funnel',
    niche: 'e-commerce',
    platform: 'MULTI',
    objective: 'conversao',
    category: 'cbo',
    description: 'Estratégia integrada usando Meta (Facebook/Instagram) + Google Ads + TikTok para maximizar vendas de e-commerce. Cada plataforma com seu papel no funil.',
    strategy: `ESTRATÉGIA OMNICHANNEL E-COMMERCE:

TIKTOK (20% do budget) - Descoberta
- Spark Ads / UGC para awareness
- Público frio descobre o produto
- Formato: vídeos nativos de creators

META/FACEBOOK (50% do budget) - Conversão principal
- ASC+ para aquisição
- DPA para remarketing
- Onde acontece a maioria das vendas

GOOGLE ADS (30% do budget) - Captura de demanda
- PMax para Shopping
- Search de marca (quem viu no TikTok/Meta busca no Google)
- Search de categorias

MÉTRICAS CROSS-PLATFORM:
- Atribuição: usar UTMs + GA4 para ver o funil real
- Blended ROAS: receita total / investimento total (meta: 3x+)
- Cada plataforma tem ROI próprio mas contribui pro todo`,
    campaignSetup: {
      note: 'Budget total dividido: 20% TikTok, 50% Meta, 30% Google',
      budgetType: 'daily',
      budgetRange: { min: 100, max: 2000, currency: 'BRL', recommended: 300 },
    },
    adSetSetup: {
      targeting: {
        type: 'CROSS_PLATFORM',
        tiktok: 'Broad, 18-45, IA otimiza',
        meta: 'ASC+ broad + DPA remarketing',
        google: 'PMax + Brand Search + Category Search',
      },
    },
    creativeSetup: {
      format: ['video-ugc-tiktok', 'catalogo-meta', 'shopping-google'],
      note: 'Adaptar criativos para cada plataforma. TikTok = nativo/ugc. Meta = profissional. Google = texto + shopping feed.',
    },
    benchmarks: {
      blendedRoas: { min: 2.5, avg: 4.0, top: 8.0 },
      note: 'Avaliar blended ROAS (todas as plataformas juntas)',
    },
    tips: [
      'Não avalie cada plataforma isoladamente - olhe o blended ROAS',
      'TikTok gera awareness → pessoa busca no Google → Meta converte',
      'Search de marca no Google é ESSENCIAL (captura demanda gerada por social)',
      'GA4 com UTMs é obrigatório para entender atribuição cross-platform',
      'Escale a plataforma com melhor marginal ROAS, não a com melhor ROAS absoluto',
    ],
    commonMistakes: [
      'Avaliar TikTok isoladamente (parece ruim mas gera demanda)',
      'Não ter search de marca no Google (perde venda pra concorrente)',
      'Budget desproporcional (tudo em uma plataforma)',
      'Não usar UTMs consistentes entre plataformas',
    ],
    source: 'Performance Marketing Leaders Summit 2025',
    year: 2025,
    difficulty: 'avancado',
    rating: 4.8,
  },

  // ═══════════════════════════════════════════════════════════════
  // 15. REMARKETING AVANÇADO - MULTI-NICHO
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Remarketing em Camadas - Full Funnel Retargeting',
    niche: 'e-commerce',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'remarketing',
    description: 'Remarketing segmentado por temperatura do lead. Cada camada recebe mensagem e oferta diferente baseada no nível de interesse demonstrado.',
    strategy: `REMARKETING EM 4 CAMADAS:

CAMADA 1 - Quente (1-3 dias): AddToCart + InitiateCheckout (não comprou)
- Copy: Urgência máxima, "Seu carrinho está te esperando"
- Oferta: Cupom 5-10% OFF, frete grátis

CAMADA 2 - Morno (4-7 dias): ViewContent + AddToCart (não comprou)
- Copy: Social proof, avaliações, garantia
- Oferta: Benefício exclusivo

CAMADA 3 - Frio (8-14 dias): Visitou site + IG engagers
- Copy: Lembrete suave, novidades, best sellers
- Oferta: Destaques da semana

CAMADA 4 - Reativação (15-30 dias): Compradores antigos
- Copy: Cross-sell, upsell, novidades
- Oferta: "Clientes especiais", acesso antecipado`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 20, max: 100, currency: 'BRL', recommended: 40 },
    },
    adSetSetup: {
      targeting: {
        type: 'LAYERED_RETARGETING',
        layers: [
          { name: 'Hot 1-3d', audience: 'AddToCart + InitiateCheckout excl. Purchase', window: '1-3 dias', budgetShare: '40%' },
          { name: 'Warm 4-7d', audience: 'ViewContent excl. Purchase', window: '4-7 dias', budgetShare: '25%' },
          { name: 'Cold 8-14d', audience: 'All visitors + IG 90d excl. Purchase', window: '8-14 dias', budgetShare: '20%' },
          { name: 'Reactivation 15-30d', audience: 'Past purchasers 30-180d', window: '15-30 dias', budgetShare: '15%' },
        ],
      },
      placements: 'ADVANTAGE_PLUS',
      optimizationEvent: 'PURCHASE',
    },
    creativeSetup: {
      format: ['catalogo-dinamico', 'video-depoimento', 'carrossel', 'imagem-oferta'],
      copyTemplates: [
        { layer: 'Hot', headline: 'Esqueceu algo? 🛒', primaryText: 'Finalize sua compra agora e ganhe frete grátis! Use o cupom VOLTEI10 para 10% OFF.' },
        { layer: 'Warm', headline: 'Mais de [X] pessoas compraram', primaryText: 'Veja por que esse produto tem [X] avaliações 5 estrelas. Compre com garantia de 30 dias.' },
        { layer: 'Cold', headline: 'Novidades para você ✨', primaryText: 'Confira os mais vendidos da semana. Frete grátis acima de R$[X].' },
        { layer: 'Reactivation', headline: 'Sentimos sua falta! 💕', primaryText: 'Cliente especial merece tratamento especial. Veja as novidades + frete grátis exclusivo.' },
      ],
    },
    benchmarks: {
      ctr: { min: 2.0, avg: 4.0, top: 8.0 },
      roas: { min: 5.0, avg: 12.0, top: 30.0 },
      cpa: { min: 3, avg: 10, top: 2 },
    },
    tips: [
      'Cada camada PRECISA excluir a camada anterior (sem sobreposição)',
      'Hot retargeting (1-3d) tem o melhor ROAS de todas as campanhas',
      'Frequency cap: máximo 2-3 impressões por pessoa por dia',
      'Teste cupons exclusivos por camada para medir conversão',
      'Reativação de compradores antigos é ouro negligenciado',
    ],
    commonMistakes: [
      'Todas as camadas com a mesma mensagem (perde relevância)',
      'Não excluir camadas entre si (paga dobrado)',
      'Orçamento alto demais para remarketing (frequência excessiva)',
      'Não renovar criativos de remarketing (mesma pessoa vê 100x)',
    ],
    source: 'E-commerce Growth Hackers BR 2025',
    year: 2025,
    difficulty: 'avancado',
    rating: 4.9,
  },

  // ═══════════════════════════════════════════════════════════════
  // 16. AGÊNCIA DE MARKETING DIGITAL - PROSPECÇÃO B2B
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Lead Gen B2B - Agência de Marketing Digital',
    niche: 'servicos-locais',
    platform: 'FACEBOOK',
    objective: 'leads',
    category: 'lead-gen',
    description: 'Campanha de geração de leads B2B para agências de marketing digital que precisam prospectar novos clientes. Usa Lead Ads com formulário qualificador + landing page com cases de sucesso. Ideal para atrair donos de negócio e gestores que querem escalar com tráfego pago.',
    strategy: `ESTRATÉGIA PROSPECÇÃO B2B PARA AGÊNCIAS:

1. ESTRUTURA: CBO com 2-3 conjuntos de anúncio segmentados por perfil de cliente ideal
2. PÚBLICOS:
   - Interesse: "Small business owners", "Marketing digital", "Empreendedorismo", "E-commerce"
   - Lookalike 1-3% de clientes ativos da agência
   - Remarketing: visitantes do site + engajados no Instagram (90 dias)
3. FORMATO: Lead Form do Facebook com perguntas qualificadoras (faturamento, nicho, budget de ads)
4. CRIATIVOS: Case studies com métricas reais (ROAS, faturamento), vídeo de bastidores mostrando dashboards, depoimentos de clientes
5. FUNIL: Lead Form → SDR qualifica por WhatsApp/ligação em <2h → Reunião de diagnóstico → Proposta
6. ORÇAMENTO: R$40-120/dia, meta de CPL entre R$15-40
7. DIFERENCIAL: Mostrar resultados reais com números. Donos de negócio querem ver ROAS, faturamento e crescimento.`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'LEAD_GENERATION',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 40, max: 200, currency: 'BRL', recommended: 80 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 25,
        ageMax: 55,
        interests: ['Small business owners', 'Entrepreneurship', 'Digital marketing', 'E-commerce', 'Online advertising'],
        behaviors: ['Business page admins', 'Small business owners'],
        geoTargeting: 'Cidade da agência + cidades próximas (ou Brasil inteiro para agências remotas)',
      },
      placements: 'Facebook Feed + Instagram Feed + Stories',
      optimizationEvent: 'LEAD',
    },
    creativeSetup: {
      format: ['video-case-study', 'carrossel-resultados', 'imagem-metricas', 'video-bastidores'],
      specs: {
        video: { ratio: '1:1 ou 9:16', duration: '30-60s', resolution: '1080x1080 ou 1080x1920' },
        imagem: { ratio: '1:1', resolution: '1080x1080' },
        carrossel: { cards: '3-5 cases', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: 'Sua empresa faturando [X]x mais com tráfego pago', primaryText: 'Ajudamos a [tipo de negócio] do [nome do cliente] a sair de R$[X]/mês para R$[Y]/mês em [Z] meses. Quer ver como funciona? Preencha o formulário e receba um diagnóstico gratuito da sua operação.', description: 'Diagnóstico gratuito + plano de ação personalizado', cta: 'SIGN_UP' },
        { headline: 'Case: ROAS de [X]x em [Y] dias', primaryText: 'Nós gerenciamos mais de R$[X] em anúncios por mês para [Y]+ clientes. Descubra quanto sua empresa pode crescer com uma estratégia de tráfego profissional. Agende sua consultoria gratuita.', description: 'Consultoria sem compromisso com especialista', cta: 'LEARN_MORE' },
        { headline: 'Por que sua campanha não dá resultado?', primaryText: 'A maioria dos negócios perde dinheiro em anúncios por 3 erros simples. Nosso time identificou os padrões que separam quem lucra de quem desperdiça. Baixe o diagnóstico gratuito.', description: 'Análise gratuita das suas campanhas atuais', cta: 'SIGN_UP' },
      ],
      visualGuidelines: [
        'Screenshots de dashboards do Meta Ads com métricas reais (borrar nome do cliente)',
        'Gráficos de crescimento (antes vs depois da agência)',
        'Vídeo com o gestor de tráfego explicando a estratégia usada no case',
        'Depoimento em vídeo do cliente (30-60s)',
        'Usar números grandes e visíveis (ROAS 8x, +340% de faturamento)',
        'Cores profissionais (azul, preto, branco) com destaque em verde/amarelo para métricas',
      ],
      hooks: [
        'Esse cliente saiu de R$[X]k para R$[Y]k/mês em [Z] meses...',
        'O erro #1 que faz empresas perderem dinheiro em anúncios',
        'ROAS de [X]x - como fizemos isso para uma [tipo de negócio]',
        'Sua empresa está pronta para escalar? Veja o que fizemos com a [empresa]',
        'Quanto você está deixando na mesa sem tráfego pago profissional?',
      ],
      ctaOptions: ['SIGN_UP', 'LEARN_MORE', 'CONTACT_US'],
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.5, top: 3.0 },
      cpc: { min: 1.00, avg: 2.50, top: 0.60 },
      cplead: { min: 15, avg: 35, top: 10 },
      cpm: { min: 12, avg: 25, top: 8 },
    },
    tips: [
      'Lead Form com perguntas qualificadoras: faturamento mensal, nicho, budget atual de ads',
      'Case studies com números reais são o criativo #1 para atrair clientes de agência',
      'Responda o lead em menos de 2h - donos de negócio decidem rápido',
      'Ofereça diagnóstico/auditoria gratuita como isca (baixa barreira de entrada)',
      'Teste Lookalike de clientes ativos (quem já paga mensalidade) - qualidade superior',
      'Remarketing com depoimentos de clientes converte leads que não fecharam na primeira vez',
    ],
    commonMistakes: [
      'Prometer resultados irreais (ROAS de 20x para qualquer nicho)',
      'Lead Form sem qualificação (recebe microempreendedores sem budget)',
      'Não ter processo de follow-up estruturado (CRM + sequência de mensagens)',
      'Focar só em "gestão de tráfego" ao invés de mostrar resultado para o negócio do cliente',
      'Não mostrar números reais (cases genéricos sem métricas não convencem)',
    ],
    scalingGuide: `ESCALA PROSPECÇÃO B2B AGÊNCIA:
1. Fase 1 (R$40-80/dia): Validar público e criativo. Meta: CPL < R$40
2. Fase 2 (R$80-150/dia): Escalar conjunto vencedor, adicionar LAL de clientes
3. Fase 3 (R$150-300/dia): Diversificar criativos (novos cases, formatos), adicionar remarketing
4. Fase 4 (R$300+/dia): Considerar LinkedIn Ads como canal complementar para tickets maiores
Regra: Se CPL subir acima de R$50, renovar criativos antes de aumentar budget.`,
    source: 'Agência Growth Summit Brasil 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.5,
  },

  // ═══════════════════════════════════════════════════════════════
  // 17. LOJA DE CELULARES / ELETRÔNICOS - E-COMMERCE
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'ASC+ Eletrônicos - Smartphones e Acessórios',
    niche: 'e-commerce',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'asc',
    description: 'Campanha Advantage+ Shopping otimizada para lojas de celulares, eletrônicos e acessórios. Foco em lançamentos, flash sales e comparativos de produtos. O público de tech tem alta intenção de compra e pesquisa bastante antes de comprar.',
    strategy: `ESTRATÉGIA E-COMMERCE ELETRÔNICOS:

1. ESTRUTURA: ASC+ com catálogo segmentado por categoria (smartphones, acessórios, wearables)
2. TIMING: Aproveitar lançamentos (iPhone, Samsung Galaxy, etc.) com criativos de unboxing e review
3. FLASH SALES: Campanhas relâmpago de 24-48h com orçamento concentrado
4. CRIATIVOS: Mix de unboxing, comparativo (vs concorrente), specs visuais, review honesto
5. PIXEL: Eventos de Purchase + AddToCart + ViewContent bem configurados
6. CATÁLOGO: Preços atualizados em tempo real (estoque muda rápido em eletrônicos)
7. PREÇO: Sempre mostrar preço e condições de parcelamento (12x sem juros é hook forte)
8. REMARKETING: DPA agressivo para quem viu produto mas não comprou (janela de 3-7 dias)`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 80, max: 800, currency: 'BRL', recommended: 200 },
      specialAdCategories: [],
      campaignType: 'ADVANTAGE_PLUS_SHOPPING',
    },
    adSetSetup: {
      targeting: {
        type: 'BROAD',
        note: 'ASC+ broad. Algoritmo do Meta encontra compradores de eletrônicos automaticamente.',
        existingCustomerBudgetPercentage: 20,
        ageMin: 18,
        ageMax: 55,
        geoTargeting: 'Brasil inteiro (estados com maior ticket: SP, RJ, MG, PR, SC, RS, DF)',
      },
      placements: 'ADVANTAGE_PLUS',
      schedule: 'continuous',
      optimizationEvent: 'PURCHASE',
      attribution: '7d_click_1d_view',
    },
    creativeSetup: {
      format: ['video-unboxing', 'carrossel-comparativo', 'imagem-oferta', 'video-review', 'colecao'],
      specs: {
        video: { ratio: '9:16 ou 1:1', duration: '15-45s', resolution: '1080x1920' },
        imagem: { ratio: '1:1', resolution: '1080x1080' },
        carrossel: { cards: '3-6 produtos', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: '[Smartphone] por R$[X] em 12x sem juros', primaryText: 'Lançamento! [Modelo] com [specs principais]. Frete grátis + entrega expressa. Estoque limitado - garanta o seu!', description: '12x sem juros no cartão. Entrega para todo Brasil.', cta: 'SHOP_NOW' },
        { headline: 'Flash Sale: até [X]% OFF em eletrônicos', primaryText: 'Só hoje! [Produto] de R$[preço cheio] por R$[preço promocional]. Promoção válida enquanto durar o estoque.', description: 'Preço mais baixo do mercado. Compare e comprove.', cta: 'SHOP_NOW' },
        { headline: '[Produto] - Review completo', primaryText: 'Vale a pena comprar o [produto] em 2026? Testamos câmera, bateria, performance e tela. Veja o resultado e compre com confiança.', description: 'Loja oficial com garantia de 12 meses.', cta: 'SHOP_NOW' },
      ],
      visualGuidelines: [
        'Unboxing com reação genuína (formato UGC/review)',
        'Produto em fundo escuro com iluminação dramática (premium feel)',
        'Tela do celular ligada mostrando interface',
        'Comparativo lado a lado (Produto A vs B) com specs visíveis',
        'Preço grande e visível com desconto riscado',
        'Badge de "menor preço" ou "12x sem juros" no criativo',
      ],
      hooks: [
        'Chegou o novo [modelo] e eu testei TUDO...',
        'R$[preço] por esse celular? Achei que era golpe!',
        '[Produto A] vs [Produto B] - qual vale mais a pena?',
        'Flash Sale: esse preço não vai durar',
        'O celular custo-benefício de 2026 é esse aqui',
      ],
      ctaOptions: ['SHOP_NOW', 'GET_OFFER', 'LEARN_MORE'],
    },
    benchmarks: {
      ctr: { min: 1.0, avg: 2.0, top: 4.0 },
      cpc: { min: 0.30, avg: 0.90, top: 0.15 },
      cpm: { min: 8, avg: 18, top: 5 },
      roas: { min: 2.5, avg: 5.0, top: 12.0 },
      cpa: { min: 20, avg: 50, top: 10 },
      conversionRate: { min: 1.0, avg: 2.5, top: 5.0 },
    },
    tips: [
      'Lançamentos de smartphones são as melhores datas para pico de vendas - prepare criativos com antecedência',
      'Comparativos (Produto A vs B) têm CTR muito alto - público de tech adora comparar',
      'Parcelamento em 12x sem juros é o hook mais forte para eletrônicos no Brasil',
      'Atualize preços do catálogo em tempo real - estoque de eletrônicos muda rápido',
      'Reviews honestos (mostrando prós e contras) geram mais confiança que vídeo só elogiando',
      'Flash sales de 24-48h com orçamento concentrado geram ROAS acima da média',
    ],
    commonMistakes: [
      'Catálogo com preços desatualizados (cliente vê um preço no anúncio e outro no site)',
      'Não mostrar condição de parcelamento no criativo (o cliente quer saber as parcelas)',
      'Criativos genéricos sem mostrar specs do produto (público de tech quer detalhes)',
      'Não aproveitar timing de lançamentos e datas como Black Friday',
      'Estoque zerado mas anúncio ainda rodando (experiência ruim = reclamação)',
    ],
    scalingGuide: `ESCALA E-COMMERCE ELETRÔNICOS:
1. Fase 1 (R$80-150/dia): Validar catálogo e criativos. ROAS mínimo > 2.5x
2. Fase 2 (R$150-400/dia): Escalar ASC+ 20% a cada 3 dias se ROAS se mantiver
3. Fase 3 (R$400-800/dia): Adicionar DPA remarketing em campanha separada. Diversificar criativos.
4. Fase 4 (R$800+/dia): Flash sales com budget concentrado em datas chave. Considerar Google Shopping em paralelo.
Dica: Em eletrônicos, o ticket médio é alto. Um ROAS de 3x já é muito lucrativo.`,
    source: 'E-commerce Tech Brasil Report 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.6,
  },

  // ═══════════════════════════════════════════════════════════════
  // 18. JOALHERIA / ACESSÓRIOS - E-COMMERCE LUXO
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'CBO Premium - Joalheria e Acessórios de Luxo',
    niche: 'moda',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'cbo',
    description: 'Campanha CBO otimizada para joalherias e marcas de acessórios com posicionamento aspiracional e luxo. Foco em lifestyle imagery, campanhas de presente (Dia das Mães, Namorados, Natal) e construção de marca. Público feminino A/B com alto poder aquisitivo.',
    strategy: `ESTRATÉGIA JOALHERIA / ACESSÓRIOS LUXO:

1. POSICIONAMENTO: Aspiracional, não promocional. Vender o estilo de vida, não só o produto.
2. ESTRUTURA: CBO com 2-3 conjuntos segmentados:
   - Público frio: Interesses em luxo, moda, joias + Renda alta
   - Lookalike 1-2% de compradoras
   - Remarketing: visitantes do site + engajadas no IG
3. CRIATIVOS: Lifestyle photography premium, close-ups das peças, vídeos de "como usar", unboxing elegante
4. SAZONALIDADE: Budget 3-5x maior em Dia das Mães, Dia dos Namorados, Natal (presente é o driver #1)
5. TICKET MÉDIO: Joias têm ticket alto - optimize para Purchase, não AddToCart
6. EMBALAGEM: Mostrar a experiência de unboxing (embalagem premium é diferencial)
7. CONFIANÇA: Certificações, garantia, troca fácil - joias são compra de alto envolvimento`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 50, max: 400, currency: 'BRL', recommended: 120 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 22,
        ageMax: 55,
        gender: 'all',
        interests: ['Luxury goods', 'Jewelry', 'Fashion accessories', 'Fine jewelry', 'Designer brands', 'Gift shopping'],
        behaviors: ['High-end device users', 'Frequent travelers', 'Online shoppers'],
        geoTargeting: 'Capitais e regiões metropolitanas (SP, RJ, BH, Curitiba, Brasília, Porto Alegre)',
        note: 'Focar em regiões com maior poder aquisitivo. Excluir cidades menores para manter ticket alto.',
      },
      placements: 'Instagram Feed + Stories + Reels + Facebook Feed',
      optimizationEvent: 'PURCHASE',
      attribution: '7d_click_1d_view',
    },
    creativeSetup: {
      format: ['video-lifestyle', 'carrossel-colecao', 'imagem-editorial', 'video-unboxing', 'reels'],
      specs: {
        video: { ratio: '9:16 e 1:1', duration: '15-30s', resolution: '1080x1920' },
        imagem: { ratio: '1:1 e 4:5', resolution: '1080x1350' },
        carrossel: { cards: '3-6 peças da coleção', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: 'A peça que faltava no seu look', primaryText: 'Cada detalhe foi pensado para você. Conheça a coleção [nome] - joias artesanais com banho de ouro 18k. Frete grátis + embalagem de presente.', description: 'Joias com garantia vitalícia. Entrega em embalagem premium.', cta: 'SHOP_NOW' },
        { headline: 'Presente que encanta', primaryText: 'Surpreenda quem você ama com uma joia que conta uma história. Coleção especial [data comemorativa]. Embalagem de presente grátis + cartão personalizado.', description: 'Entrega expressa para todo Brasil. Troca em até 30 dias.', cta: 'SHOP_NOW' },
        { headline: 'Coleção [Nome] - Edição Limitada', primaryText: 'Apenas [X] peças disponíveis. Design exclusivo inspirado em [referência]. Feita à mão com acabamento premium. Garanta a sua antes que esgote.', description: 'Certificado de autenticidade + garantia vitalícia.', cta: 'SHOP_NOW' },
      ],
      visualGuidelines: [
        'Fotografia editorial: iluminação suave, fundo neutro ou lifestyle aspiracional',
        'Close-up extremo das peças mostrando detalhes e acabamento',
        'Modelo usando a joia em contexto elegante (jantar, evento, escritório)',
        'Vídeo de unboxing mostrando embalagem premium',
        'Cores sóbrias e elegantes (dourado, rosé, preto, branco)',
        'NUNCA usar estética de "promoção de loja popular" - manter tom premium',
      ],
      hooks: [
        'A joia que todo mundo me pergunta onde comprei...',
        'Unboxing da peça mais linda que já comprei',
        'Presente perfeito para quem você ama',
        'Coleção limitada - quando acabar, acabou',
        'Detalhes que fazem toda a diferença em um look',
      ],
      ctaOptions: ['SHOP_NOW', 'LEARN_MORE'],
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.5, top: 3.0 },
      cpc: { min: 0.80, avg: 2.00, top: 0.40 },
      cpm: { min: 15, avg: 30, top: 10 },
      roas: { min: 2.0, avg: 4.0, top: 8.0 },
      cpa: { min: 30, avg: 80, top: 15 },
      conversionRate: { min: 0.8, avg: 1.8, top: 4.0 },
    },
    tips: [
      'Datas comemorativas são responsáveis por 40-60% do faturamento anual - planeje com 30 dias de antecedência',
      'Instagram é a plataforma principal para joias - invista em fotografia editorial de alto nível',
      'Embalagem premium no criativo vende tanto quanto a peça (experiência de unboxing)',
      'Edições limitadas e escassez real geram urgência sem parecer "promoção barata"',
      'Teste criativos com e sem preço - para luxo, às vezes não mostrar preço performa melhor',
      'Remarketing com a peça exata que a pessoa viu tem ROAS altíssimo nesse nicho',
    ],
    commonMistakes: [
      'Estética de promoção barata (fonte Impact, vermelho/amarelo, "OFERTA!!!") - destrói posicionamento de luxo',
      'Fotos com iluminação ruim que não valorizam o brilho e detalhes da peça',
      'Segmentação muito ampla sem filtro de renda/comportamento (atrai quem não tem budget)',
      'Não investir em sazonalidade (perder Dia das Mães e Natal é perder o ano)',
      'Copy agressivo de vendas ao invés de storytelling aspiracional',
    ],
    scalingGuide: `ESCALA JOALHERIA / LUXO:
1. Fase 1 (R$50-100/dia): Validar posicionamento e criativos. ROAS mínimo > 2x
2. Fase 2 (R$100-250/dia): Adicionar LAL de compradoras. Expandir para Reels.
3. Fase 3 (R$250-500/dia): Datas comemorativas: triplicar budget 15 dias antes da data.
4. Fase Sazonal (Dia das Mães/Natal): Budget 3-5x maior. Criativos específicos de presente.
Dica: Joalheria tem margens altas. Um ROAS de 2.5x já é muito lucrativo. Foque em LTV, não só first purchase.`,
    source: 'Luxury Fashion E-commerce Brasil 2026',
    year: 2026,
    difficulty: 'intermediario',
    rating: 4.6,
  },

  // ═══════════════════════════════════════════════════════════════
  // 19. ESTÚDIO DE TATUAGEM - SERVIÇOS LOCAIS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Lead Gen WhatsApp - Estúdio de Tatuagem',
    niche: 'servicos-locais',
    platform: 'FACEBOOK',
    objective: 'mensagens',
    category: 'lead-gen',
    description: 'Campanha para estúdios de tatuagem gerarem leads via WhatsApp e Messenger. Foco em showcase do portfólio, estilos de tatuagem e promoções sazonais. Segmentação local com público interessado em tattoo e arte.',
    strategy: `ESTRATÉGIA ESTÚDIO DE TATUAGEM:

1. OBJETIVO: Mensagens para WhatsApp (agendamento de orçamento/sessão)
2. PÚBLICO: Raio de 10-20km do estúdio, 18-40 anos, interesse em tattoo/arte/música
3. CRIATIVOS: Portfólio do artista é o principal ativo. Vídeos de processo (timelapse) e cicatrização.
4. SEGMENTAÇÃO POR ESTILO: Separar conjuntos por estilo (realismo, old school, fineline, etc.)
5. FUNIL: Anúncio → WhatsApp → Enviar referência → Orçamento → Agendar sessão
6. SAZONALIDADE: Verão (roupas curtas = mais visibilidade para tattoo), Black Friday (promoções)
7. CONFIANÇA: Mostrar estúdio limpo, materiais descartáveis, certificações de biossegurança
8. PROMOÇÕES: Flash days (dia específico com preço especial para designs pré-definidos)`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'CONVERSATIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 15, max: 80, currency: 'BRL', recommended: 30 },
    },
    adSetSetup: {
      targeting: {
        type: 'LOCAL',
        radius: '10-20km',
        ageMin: 18,
        ageMax: 40,
        interests: ['Tattoo', 'Tattoo art', 'Body art', 'Alternative fashion', 'Music festivals', 'Art'],
        geoTargeting: 'Raio do estúdio de tatuagem',
        note: 'Público de tattoo costuma se deslocar mais do que outros serviços locais. Raio de 10-20km funciona.',
      },
      placements: 'Instagram Feed + Stories + Reels + Facebook Feed',
      optimizationEvent: 'CONVERSATIONS',
    },
    creativeSetup: {
      format: ['video-timelapse', 'carrossel-portfolio', 'reels-processo', 'imagem-portfolio'],
      specs: {
        video: { ratio: '9:16 e 1:1', duration: '15-60s', resolution: '1080x1920' },
        imagem: { ratio: '1:1', resolution: '1080x1080' },
        carrossel: { cards: '4-8 trabalhos do portfólio', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: 'Tatuagens de [estilo] em [cidade]', primaryText: 'Estúdio especializado em [estilo]. Orçamento sem compromisso pelo WhatsApp. Materiais 100% descartáveis e ambiente esterilizado. Agende sua sessão!', description: 'Orçamento grátis. Estúdio com certificação de biossegurança.', cta: 'WHATSAPP_MESSAGE' },
        { headline: 'Flash Day: tattoos a partir de R$[X]', primaryText: 'Designs exclusivos pré-definidos com preço especial! Vagas limitadas para [data]. Chame no WhatsApp e escolha o seu design favorito.', description: 'Vagas limitadas. Primeiro a chamar, primeiro a escolher.', cta: 'WHATSAPP_MESSAGE' },
        { headline: 'Sua próxima tattoo começa aqui', primaryText: 'Tem uma ideia? Manda sua referência no WhatsApp que o artista cria o design personalizado para você. Orçamento sem compromisso.', description: 'Design personalizado + orçamento grátis pelo WhatsApp.', cta: 'WHATSAPP_MESSAGE' },
      ],
      visualGuidelines: [
        'Timelapse do processo de tatuar (início ao fim) é o criativo #1',
        'Fotos de alta qualidade do portfólio com boa iluminação',
        'Antes (pele limpa) e depois (tattoo pronta e cicatrizada)',
        'Mostrar o estúdio limpo e organizado (transmite confiança)',
        'Close-up dos detalhes e acabamento da tatuagem',
        'Vídeo curto do artista desenhando o design (processo criativo)',
      ],
      hooks: [
        'Processo completo dessa [estilo] tattoo...',
        'Flash Day: designs exclusivos a partir de R$[X]',
        'De ideia no papel a tattoo na pele - veja o processo',
        'A tattoo mais pedida do estúdio esse mês',
        'Quem mais quer tatuar em [cidade]? Vagas abertas!',
      ],
      ctaOptions: ['WHATSAPP_MESSAGE', 'MESSAGE_PAGE', 'LEARN_MORE'],
    },
    benchmarks: {
      ctr: { min: 1.5, avg: 3.5, top: 7.0 },
      cpc: { min: 0.15, avg: 0.50, top: 0.08 },
      cpm: { min: 5, avg: 12, top: 3 },
      cpa: { min: 3, avg: 10, top: 1.5 },
    },
    tips: [
      'Vídeos de timelapse do processo de tatuar têm CTR altíssimo - são hipnóticos',
      'Flash Days (designs pré-definidos com preço fixo) lotam a agenda rapidamente',
      'Separe conjuntos por estilo de tatuagem para atrair público mais qualificado',
      'Responda WhatsApp em menos de 10 minutos - cliente de tattoo é impulsivo e fala com vários estúdios',
      'Portfólio organizado por estilo no Instagram é essencial (os clientes vão conferir seu perfil)',
      'Depoimentos de clientes mostrando a tattoo cicatrizada geram muita confiança',
    ],
    commonMistakes: [
      'Fotos de baixa qualidade do portfólio (iluminação ruim, ângulo desfavorável)',
      'Não mostrar o ambiente do estúdio (gera desconfiança sobre higiene)',
      'Demorar para responder no WhatsApp (cliente fecha com outro estúdio)',
      'Não segmentar por estilo (misturar público de realismo com old school)',
      'Promoções com preço muito baixo que desvalorizam o trabalho do artista',
    ],
    scalingGuide: `ESCALA ESTÚDIO DE TATUAGEM:
1. Fase 1 (R$15-30/dia): Validar quais estilos e criativos geram mais conversas. Meta: CPL < R$10
2. Fase 2 (R$30-60/dia): Escalar estilo vencedor. Adicionar Flash Days mensais.
3. Fase 3 (R$60-100/dia): Remarketing para quem iniciou conversa mas não agendou. Expandir raio.
4. Fase Sazonal: Verão e Black Friday - aumentar budget 2x. Criar promoções especiais.
Regra: A agenda do artista é o limite. Não escale além da capacidade de atendimento.`,
    source: 'Tattoo Business Brasil 2025',
    year: 2025,
    difficulty: 'iniciante',
    rating: 4.7,
  },

  // ═══════════════════════════════════════════════════════════════
  // 20. INFOPRODUTOS - FERRAMENTAS DE DESIGN / IA
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'CBO Conversão - Ferramenta de Design/IA (SaaS)',
    niche: 'infoprodutos',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'cbo',
    description: 'Campanha CBO para vender assinaturas ou licenças de ferramentas digitais de design, edição ou inteligência artificial. Público tech-savvy que valoriza produtividade e inovação. Foco em demonstrações práticas, free trial e comparativos com alternativas.',
    strategy: `ESTRATÉGIA FERRAMENTA DE DESIGN/IA:

1. FUNIL: Anúncio (demo) → Landing page (free trial 7 dias) → Onboarding → Conversão para plano pago
2. PÚBLICO: Designers, social media managers, freelancers, empreendedores digitais, criadores de conteúdo
3. CBO com 2-3 conjuntos:
   - Interest: Design gráfico, Marketing digital, Canva, Photoshop, IA, ChatGPT
   - Lookalike 1-3% de usuários ativos/pagantes
   - Remarketing: visitantes do site + trial que não converteu
4. CRIATIVOS: Demonstração prática (antes/depois usando a ferramenta), comparativos, tutoriais rápidos
5. OFERTA: Free trial 7-14 dias, desconto no plano anual, garantia de reembolso
6. OBJEÇÕES: Mostrar facilidade de uso, resultado rápido, suporte em português
7. PIXEL: Eventos de SignUp (trial), Purchase (assinatura), PageView (pricing page)`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 40, max: 250, currency: 'BRL', recommended: 80 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 20,
        ageMax: 45,
        interests: ['Graphic design', 'Canva', 'Adobe Photoshop', 'Artificial intelligence', 'ChatGPT', 'Digital marketing', 'Content creation', 'Freelancing'],
        behaviors: ['Technology early adopters', 'Digital creators'],
        geoTargeting: 'Brasil inteiro',
      },
      placements: 'Instagram Feed + Reels + Facebook Feed',
      optimizationEvent: 'PURCHASE',
      attribution: '7d_click_1d_view',
    },
    creativeSetup: {
      format: ['video-demo', 'video-antes-depois', 'carrossel-features', 'reels-tutorial'],
      specs: {
        video: { ratio: '9:16 e 1:1', duration: '20-45s', resolution: '1080x1920' },
        imagem: { ratio: '1:1', resolution: '1080x1080' },
        carrossel: { cards: '4-6 features', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: 'Crie designs profissionais em minutos com IA', primaryText: 'Chega de perder horas no Photoshop. Com [ferramenta], você cria em minutos o que levaria horas. Teste grátis por 7 dias - sem cartão de crédito.', description: 'Free trial de 7 dias. Cancele quando quiser.', cta: 'SIGN_UP' },
        { headline: '[Ferramenta] vs Canva - veja a diferença', primaryText: 'Fiz o mesmo design nas duas ferramentas e o resultado me surpreendeu. [Ferramenta] usa IA para entregar qualidade profissional em segundos. Teste você mesmo.', description: 'Teste grátis. Sem compromisso.', cta: 'LEARN_MORE' },
        { headline: 'Economize 10h/semana com essa ferramenta de IA', primaryText: 'Designers e social media managers estão usando [ferramenta] para triplicar a produtividade. Crie posts, banners e artes automaticamente com IA.', description: 'Planos a partir de R$[X]/mês. Free trial disponível.', cta: 'SIGN_UP' },
      ],
      visualGuidelines: [
        'Screen recording da ferramenta em ação (demonstração real)',
        'Antes (design amador) vs Depois (design com a ferramenta) - split screen',
        'Tutorial rápido: "como criar [resultado] em 30 segundos"',
        'Interface da ferramenta com resultado final visível',
        'Comparativo visual com concorrentes (sem citar nome diretamente)',
        'Depoimento de usuário mostrando tela com resultados',
      ],
      hooks: [
        'Essa IA faz em 10 segundos o que eu fazia em 2 horas...',
        'Testei [ferramenta] por 7 dias e cancelei minha assinatura do [concorrente]',
        'Como eu crio 30 posts por dia sem contratar designer',
        'A ferramenta que todo designer precisa conhecer em 2026',
        'Antes e depois de usar IA para design - impressionante',
      ],
      ctaOptions: ['SIGN_UP', 'LEARN_MORE', 'GET_OFFER'],
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.8, top: 3.5 },
      cpc: { min: 0.50, avg: 1.50, top: 0.30 },
      cpm: { min: 8, avg: 18, top: 5 },
      cpa: { min: 15, avg: 40, top: 8 },
      conversionRate: { min: 2.0, avg: 5.0, top: 12.0 },
      trialToPayRate: { min: 8, avg: 20, top: 35 },
    },
    tips: [
      'Demonstração prática (screen recording) é o criativo #1 - mostre a ferramenta funcionando',
      'Free trial sem pedir cartão de crédito aumenta sign-ups em 2-3x',
      'Comparativos (sua ferramenta vs alternativa conhecida) geram CTR altíssimo',
      'Retargeting de trial que não converteu com oferta especial (desconto no plano anual)',
      'Tutorial rápido ("crie X em 30 segundos") demonstra valor instantaneamente',
      'Público de early adopters (tech) responde bem a novidade e inovação',
    ],
    commonMistakes: [
      'Vídeo muito longo sem mostrar o resultado rápido (hook fraco)',
      'Focar em features técnicas ao invés do resultado/benefício para o usuário',
      'Não ter onboarding no free trial (usuário não entende a ferramenta e desiste)',
      'Comparar diretamente com concorrente famoso no copy (pode violar políticas)',
      'Landing page lenta ou confusa que mata a conversão do trial',
    ],
    scalingGuide: `ESCALA FERRAMENTA DE DESIGN/IA:
1. Fase 1 (R$40-80/dia): Validar CPA de trial e taxa trial→pago. Meta: CPA trial < R$40
2. Fase 2 (R$80-150/dia): Escalar criativos vencedores. Adicionar LAL de pagantes.
3. Fase 3 (R$150-300/dia): Diversificar formatos (reels, carrossel). Remarketing de trial.
4. Fase 4 (R$300+/dia): Considerar YouTube Ads (demos longos) e Google Search (termos de busca como "ferramenta de design IA")
Métrica chave: CAC (custo de aquisição) vs LTV (lifetime value do assinante). Meta: LTV > 3x CAC.`,
    source: 'SaaS Growth Hackers Latam 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.5,
  },

  // ═══════════════════════════════════════════════════════════════
  // 21. INFOPRODUTOS - CURSO ONLINE GENÉRICO
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'CBO Conversão - Curso Online (Webinar Funnel)',
    niche: 'infoprodutos',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'cbo',
    description: 'Campanha CBO para venda de cursos online usando funil de webinar/aula gratuita. Estratégia clássica e validada no mercado brasileiro de infoprodutos. Funciona para cursos de qualquer nicho (marketing, finanças, saúde, desenvolvimento pessoal, etc.).',
    strategy: `ESTRATÉGIA CURSO ONLINE - FUNIL DE WEBINAR:

1. FUNIL COMPLETO:
   Anúncio → Página de inscrição (aula grátis) → Webinar/Aula ao vivo ou gravada → Oferta do curso → Checkout

2. ESTRUTURA DE CAMPANHA:
   - Campanha 1 (Topo): CBO otimizando para Lead (inscrição na aula grátis). Budget: 60% do total.
   - Campanha 2 (Remarketing): Inscritos que não compraram. Budget: 25% do total.
   - Campanha 3 (Depoimentos): Social proof para indecisos. Budget: 15% do total.

3. PÚBLICO:
   - Interest: Temas relacionados ao nicho do curso
   - LAL 1-3%: De compradores ou inscritos em webinar
   - Remarketing: Visitou sales page, assistiu aula, não comprou

4. CRIATIVOS:
   - Topo: Problema + promessa + convite para aula grátis
   - Meio: Prova social (depoimentos de alunos com resultado)
   - Fundo: Urgência (vagas limitadas, bônus exclusivos, prazo de inscrição)

5. TIMING: Lançamentos com janela de 5-7 dias de carrinho aberto. Perpétuo com webinar gravado (evergreen).

6. CONVERSÃO: Checkout com bump offer + order bump + upsell na thank you page`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 50, max: 500, currency: 'BRL', recommended: 150 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 22,
        ageMax: 50,
        interests: ['Online courses', 'E-learning', 'Personal development', 'Career development', 'Entrepreneurship'],
        note: 'Ajustar interesses conforme o nicho do curso. Ex: curso de marketing → interesse em "digital marketing".',
        geoTargeting: 'Brasil inteiro',
      },
      placements: 'Instagram Feed + Reels + Stories + Facebook Feed',
      optimizationEvent: 'PURCHASE',
      attribution: '7d_click_1d_view',
    },
    creativeSetup: {
      format: ['video-vsl', 'video-depoimento', 'imagem-oferta', 'carrossel-beneficios', 'reels'],
      specs: {
        video: { ratio: '9:16 e 1:1', duration: '30-90s', resolution: '1080x1920' },
        imagem: { ratio: '1:1 e 4:5', resolution: '1080x1350' },
        carrossel: { cards: '3-5 benefícios ou depoimentos', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: 'Aula gratuita: como [resultado desejado]', primaryText: 'Eu vou te mostrar o método exato que usei para [resultado]. Sem enrolação, sem teoria desnecessária. Inscreva-se na aula gratuita e descubra como [benefício] em [prazo].', description: 'Aula 100% gratuita e online. Vagas limitadas.', cta: 'SIGN_UP' },
        { headline: 'De [situação atual] para [resultado] em [prazo]', primaryText: '[Nome do aluno] estava [situação negativa] e em [prazo] conseguiu [resultado]. O método que ensinei funciona para qualquer pessoa. Assista a aula gratuita e comece sua transformação.', description: 'Mais de [X] alunos já transformaram suas vidas.', cta: 'LEARN_MORE' },
        { headline: 'ÚLTIMAS VAGAS - [nome do curso]', primaryText: 'O carrinho fecha em [X] horas. [Y] alunos já se inscreveram. Bônus exclusivos para quem entrar agora: [lista de bônus]. Não perca essa oportunidade.', description: 'Garantia de 7 dias. Se não gostar, devolvemos seu dinheiro.', cta: 'SIGN_UP' },
      ],
      visualGuidelines: [
        'Expert falando para a câmera com energia e autoridade',
        'Depoimentos reais de alunos (vídeo selfie funciona muito)',
        'Antes/depois da transformação do aluno',
        'Print de resultados (faturamento, métricas, conquistas)',
        'Thumbnail chamativa com texto grande e expressão do expert',
        'Contador regressivo para urgência (último dia, últimas vagas)',
      ],
      hooks: [
        'O maior erro de quem tenta [objetivo] sozinho...',
        'Em [X] dias eu saí de [situação] para [resultado]...',
        'Se você pudesse aprender [habilidade] de graça, você faria?',
        'Eu descobri um método que ninguém ensina sobre [tema]...',
        'Aluna me mandou essa mensagem depois de [X] dias no curso...',
      ],
      ctaOptions: ['SIGN_UP', 'LEARN_MORE', 'GET_OFFER'],
    },
    benchmarks: {
      ctr: { min: 0.8, avg: 1.5, top: 3.0 },
      cpc: { min: 0.50, avg: 1.50, top: 0.30 },
      cpm: { min: 10, avg: 22, top: 7 },
      cplead: { min: 3, avg: 10, top: 2 },
      cpa: { min: 30, avg: 80, top: 15 },
      conversionRate: { min: 1.0, avg: 3.0, top: 8.0 },
    },
    tips: [
      'Webinar ao vivo converte 2-3x mais que gravado, mas gravado escala melhor (evergreen)',
      'Depoimentos de alunos com resultado REAL são o criativo mais poderoso para remarking',
      'Urgência real (carrinho fecha em X dias) funciona - urgência fake destrói confiança',
      'Teste VSL curta (3-5 min) no anúncio como criativo de topo - pode converter direto',
      'Bump offer no checkout aumenta ticket médio em 20-30%',
      'Garantia de 7 dias reduz barreira de entrada e taxa de reembolso costuma ser < 5%',
    ],
    commonMistakes: [
      'Prometer resultados irreais ou exagerados (viola políticas do Meta e gera reembolso)',
      'Webinar/aula muito longo sem entregar valor (público desiste antes da oferta)',
      'Não ter sequência de e-mails para quem se inscreveu no webinar mas não assistiu',
      'Focar só em topo de funil sem remarketing (80% da conversão está no remarketing)',
      'Copy genérico que não fala com a dor específica do público-alvo',
    ],
    scalingGuide: `ESCALA CURSO ONLINE:
1. Fase 1 (R$50-100/dia): Validar funil completo. Meta: CPL < R$12, ROAS > 2x
2. Fase 2 (R$100-250/dia): Escalar criativos vencedores. Adicionar LAL de compradores.
3. Fase 3 (R$250-500/dia): Remarketing agressivo. Novos criativos (depoimentos, VSLs).
4. Fase 4 (R$500+/dia): Lançamento com picos de budget (webinar ao vivo). Diversificar para Google e YouTube.
Métrica chave: ROAS incluindo upsells e order bumps. Meta: ROAS > 3x no funil completo.`,
    source: 'Infoprodutos Brasil Summit 2025',
    year: 2025,
    difficulty: 'intermediario',
    rating: 4.7,
  },

  // ═══════════════════════════════════════════════════════════════
  // 22. INFOPRODUTOS - MENTORIA / CONSULTORIA
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Lead Gen High Ticket - Mentoria e Consultoria',
    niche: 'infoprodutos',
    platform: 'FACEBOOK',
    objective: 'leads',
    category: 'lead-gen',
    description: 'Campanha de geração de leads qualificados para mentorias e consultorias de alto valor (R$2.000-R$50.000+). Funil de aplicação com qualificação por formulário e call de vendas. Foco em autoridade, cases de sucesso e posicionamento premium.',
    strategy: `ESTRATÉGIA MENTORIA / CONSULTORIA HIGH TICKET:

1. FUNIL:
   Anúncio → Página de aplicação (formulário qualificador) → Call de diagnóstico (30-60min) → Proposta → Fechamento

2. ESTRUTURA:
   - Campanha 1 (Topo): Lead Gen otimizando para Lead (aplicação). CBO. Budget: 70% do total.
   - Campanha 2 (Remarketing): Visitou página mas não aplicou + engajados no IG. Budget: 30%.

3. PÚBLICO:
   - Interest: Empreendedorismo, Business coaching, Mentoria, nicho específico
   - LAL 1-2% de clientes (mentorados que já pagaram)
   - Remarketing: Visitou página de aplicação, assistiu >50% do vídeo

4. QUALIFICAÇÃO NO FORMULÁRIO:
   - Faturamento atual ou situação profissional
   - Principal desafio/objetivo
   - Quanto está disposto a investir
   - Quando quer começar

5. POSICIONAMENTO: Autoridade máxima. Cases, resultados, mídia, certificações.

6. CONVERSÃO: 80% do fechamento acontece na call de vendas. O anúncio gera o lead qualificado.`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'LEAD_GENERATION',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 50, max: 300, currency: 'BRL', recommended: 100 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 25,
        ageMax: 55,
        interests: ['Entrepreneurship', 'Business coaching', 'Mentorship', 'Executive coaching', 'Business strategy', 'Leadership'],
        behaviors: ['Business owners', 'High-income individuals'],
        geoTargeting: 'Brasil inteiro (high ticket não tem barreira geográfica - tudo online)',
        note: 'Para high ticket, qualidade > quantidade. Melhor 5 leads qualificados do que 50 curiosos.',
      },
      placements: 'Instagram Feed + Reels + Stories + Facebook Feed',
      optimizationEvent: 'LEAD',
    },
    creativeSetup: {
      format: ['video-autoridade', 'video-case-study', 'carrossel-resultados', 'imagem-depoimento'],
      specs: {
        video: { ratio: '9:16 e 1:1', duration: '30-120s', resolution: '1080x1920' },
        imagem: { ratio: '1:1 e 4:5', resolution: '1080x1350' },
        carrossel: { cards: '3-5 cases/resultados', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: 'Mentoria para [resultado específico]', primaryText: 'Nos últimos [X] meses, meus mentorados alcançaram [resultado médio]. Eu acompanho você 1:1 durante [prazo] com um plano personalizado. Vagas limitadas - aplique agora para uma conversa de diagnóstico gratuita.', description: 'Aplicação gratuita. Vagas limitadas por turma.', cta: 'APPLY_NOW' },
        { headline: 'De [situação] para [resultado] - Case [nome]', primaryText: '[Nome] chegou [situação negativa] e em [prazo] alcançou [resultado impressionante]. O mesmo método está disponível para você. Aplique para uma sessão de diagnóstico e descubra seu potencial.', description: 'Diagnóstico gratuito + plano de ação personalizado.', cta: 'SIGN_UP' },
        { headline: 'Você está a uma decisão de [resultado]', primaryText: 'Eu já ajudei [X] pessoas/empresas a [resultado]. Não é motivação - é método, acompanhamento e accountability. Se você está sério sobre [objetivo], aplique para a mentoria.', description: 'Processo seletivo. Não é para todo mundo.', cta: 'APPLY_NOW' },
      ],
      visualGuidelines: [
        'Expert falando com confiança e autoridade (iluminação profissional)',
        'Print de resultados de mentorados (faturamento, métricas, conquistas)',
        'Fotos em contextos de autoridade (palco, evento, entrevista, escritório premium)',
        'Depoimentos em vídeo de mentorados com resultado real',
        'Estética premium e profissional (nada de "promoção", "desconto")',
        'Antes/depois profissional dos mentorados',
      ],
      hooks: [
        'Se eu te mostrar exatamente como [resultado], você faria?',
        'Meu mentorado faturou R$[X] em [prazo] com esse método...',
        'A diferença entre quem consegue e quem não consegue [objetivo]...',
        'Eu recusei [X] aplicações esse mês. Quer saber por quê?',
        'O que ninguém te conta sobre [tema do nicho]...',
      ],
      ctaOptions: ['APPLY_NOW', 'SIGN_UP', 'LEARN_MORE'],
    },
    benchmarks: {
      ctr: { min: 0.6, avg: 1.2, top: 2.5 },
      cpc: { min: 1.00, avg: 3.00, top: 0.60 },
      cplead: { min: 20, avg: 60, top: 12 },
      cpm: { min: 12, avg: 28, top: 8 },
      applicationToCallRate: { min: 30, avg: 50, top: 70 },
      callToCloseRate: { min: 10, avg: 25, top: 40 },
    },
    tips: [
      'Formulário de aplicação com 4-6 perguntas qualificadoras filtra 80% dos curiosos',
      'A call de vendas é onde o fechamento acontece - treine scripts e objeções',
      'Posicionamento de escassez REAL (vagas limitadas por turma) funciona muito para high ticket',
      'Cases de sucesso com números reais são o ativo mais poderoso para high ticket',
      'Remarketing para quem visitou a página de aplicação mas não preencheu - esses já demonstraram interesse',
      'Invista em branding pessoal (palco, podcast, entrevistas) - autoridade aumenta taxa de conversão',
    ],
    commonMistakes: [
      'Vender preço ao invés de valor (high ticket se justifica pelo resultado, não pelo "desconto")',
      'Formulário de aplicação sem perguntas de qualificação (perde tempo com leads não qualificados)',
      'Não ter closer treinado para a call de vendas (o mentor nem sempre é o melhor vendedor)',
      'Copy de urgência fake ("só hoje!") em vez de escassez real (destrói confiança)',
      'Não acompanhar métricas do funil completo (lead → call → fechamento → receita)',
    ],
    scalingGuide: `ESCALA MENTORIA HIGH TICKET:
1. Fase 1 (R$50-100/dia): Validar funil. Meta: CPL aplicação < R$60, taxa call→close > 15%
2. Fase 2 (R$100-200/dia): Escalar com LAL de clientes. Diversificar criativos (novos cases).
3. Fase 3 (R$200-400/dia): Adicionar remarketing agressivo. Conteúdo de autoridade no orgânico.
4. Fase 4 (R$400+/dia): Webinar de lançamento para turmas fechadas. YouTube Ads para posicionamento.
Métrica chave: CAC vs ticket médio da mentoria. Meta: CAC < 10% do ticket.`,
    source: 'High Ticket Brasil Mastermind 2026',
    year: 2026,
    difficulty: 'avancado',
    rating: 4.8,
  },

  // ═══════════════════════════════════════════════════════════════
  // 23. INFOPRODUTOS - E-BOOK / MATERIAL DIGITAL
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Lead Gen - E-book e Material Digital (Lead Magnet)',
    niche: 'infoprodutos',
    platform: 'FACEBOOK',
    objective: 'leads',
    category: 'lead-gen',
    description: 'Campanha de captação de leads usando e-book, checklist, planilha ou material digital gratuito como isca (lead magnet). Estratégia de baixa barreira de entrada para construir lista de e-mail e nutrir para vendas futuras. Ideal para quem está começando no digital.',
    strategy: `ESTRATÉGIA E-BOOK / LEAD MAGNET:

1. FUNIL:
   Anúncio → Landing page (download grátis em troca do e-mail) → Entrega do material → Sequência de e-mails (5-7 emails) → Oferta do produto pago

2. ESTRUTURA:
   - Campanha Lead Gen otimizando para Lead (cadastro/download)
   - CBO com 2-3 conjuntos: Interest, Broad, LAL de leads anteriores
   - Budget focado em volume de leads (CPL baixo é prioridade)

3. LEAD MAGNET IDEAL:
   - Resolve um problema específico e imediato
   - Título forte com número ou promessa clara ("7 passos para...", "Checklist definitivo de...")
   - Entrega rápida (PDF, planilha, template)
   - Deixa o leitor querendo mais (abre loop para o produto pago)

4. SEQUÊNCIA DE E-MAILS (pós-download):
   - Email 1: Entrega do material + boas-vindas
   - Email 2: Conteúdo complementar de valor
   - Email 3: Case de sucesso / depoimento
   - Email 4: Introdução do produto pago
   - Email 5: Oferta + urgência/bônus

5. CONVERSÃO: A venda não acontece no anúncio - acontece na sequência de e-mails e remarketing.`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'LEAD_GENERATION',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 20, max: 150, currency: 'BRL', recommended: 50 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 20,
        ageMax: 50,
        interests: ['E-books', 'Online learning', 'Self-improvement', 'Career development'],
        note: 'Adaptar interesses para o nicho do e-book. Ex: e-book de receitas → interesse em "Cooking", "Healthy eating".',
        geoTargeting: 'Brasil inteiro',
      },
      placements: 'Instagram Feed + Stories + Facebook Feed',
      optimizationEvent: 'LEAD',
    },
    creativeSetup: {
      format: ['imagem-mockup-ebook', 'video-conteudo', 'carrossel-preview', 'stories-swipe-up'],
      specs: {
        video: { ratio: '9:16 e 1:1', duration: '15-30s', resolution: '1080x1920' },
        imagem: { ratio: '1:1 e 4:5', resolution: '1080x1350' },
        carrossel: { cards: '3-5 páginas de preview', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: '[Título do e-book] - Download grátis', primaryText: 'Baixe agora o guia completo com [X] [dicas/passos/estratégias] para [resultado]. 100% gratuito, sem pegadinha. Mais de [X] pessoas já baixaram!', description: 'Download imediato. Só precisa do e-mail.', cta: 'DOWNLOAD' },
        { headline: 'Checklist: [X] passos para [resultado]', primaryText: 'Eu compilei tudo que aprendi em [X] anos sobre [tema] nesse checklist prático. Baixe grátis e comece a aplicar hoje mesmo.', description: 'Material gratuito. Aplicação imediata.', cta: 'DOWNLOAD' },
        { headline: 'Planilha grátis: [ferramenta/template]', primaryText: 'A mesma planilha que eu uso para [resultado]. Pronta para usar, editável, com instruções. Baixe grátis e organize seu [área].', description: 'Template profissional. Download imediato.', cta: 'DOWNLOAD' },
      ],
      visualGuidelines: [
        'Mockup 3D profissional do e-book/material (ferramentas como Canva, Smartmockups)',
        'Preview de páginas internas mostrando o conteúdo de qualidade',
        'Design clean e profissional da capa do e-book',
        'Seta ou destaque visual indicando "GRÁTIS" ou "Download"',
        'Expert segurando o material (transmite autoria e autoridade)',
        'Screenshots de depoimentos de quem já baixou',
      ],
      hooks: [
        'Esse e-book gratuito vale mais que muito curso pago...',
        '[X] pessoas já baixaram - você está perdendo',
        'Compilei [X] anos de experiência nesse PDF gratuito',
        'O checklist que eu queria ter quando comecei em [área]',
        'Material grátis que deveria ser pago - baixe antes que eu mude de ideia',
      ],
      ctaOptions: ['DOWNLOAD', 'SIGN_UP', 'LEARN_MORE'],
    },
    benchmarks: {
      ctr: { min: 1.0, avg: 2.5, top: 5.0 },
      cpc: { min: 0.20, avg: 0.70, top: 0.10 },
      cplead: { min: 1.5, avg: 5, top: 0.80 },
      cpm: { min: 5, avg: 12, top: 3 },
      emailOpenRate: { min: 20, avg: 35, top: 50 },
      leadToSaleRate: { min: 1, avg: 3, top: 8 },
    },
    tips: [
      'Título do e-book com número e promessa clara gera mais downloads ("7 passos" > "Guia completo")',
      'Mockup 3D profissional do e-book aumenta percepção de valor em até 40%',
      'Lead Form nativo do Facebook tem CPL mais baixo que landing page externa',
      'A sequência de e-mails pós-download é onde o dinheiro está - automatize com ActiveCampaign, Mailchimp, etc.',
      'Teste diferentes formatos de lead magnet: e-book, checklist, planilha, template, mini-curso',
      'Remarketing para quem baixou mas não comprou o produto pago é essencial (3-14 dias)',
    ],
    commonMistakes: [
      'E-book genérico sem resolver um problema específico (ninguém baixa "Guia geral de marketing")',
      'Material de baixa qualidade que não entrega valor (destrói confiança para venda futura)',
      'Não ter sequência de e-mails automatizada após o download (lead esfria e esquece)',
      'Pedir muitos dados no formulário (nome + e-mail é suficiente para lead magnet)',
      'Não segmentar a sequência de e-mails baseada no material baixado',
    ],
    scalingGuide: `ESCALA E-BOOK / LEAD MAGNET:
1. Fase 1 (R$20-50/dia): Validar CPL e taxa de abertura de e-mails. Meta: CPL < R$5
2. Fase 2 (R$50-100/dia): Escalar. Testar novos lead magnets para o mesmo público.
3. Fase 3 (R$100-200/dia): Otimizar sequência de e-mails para maximizar conversão em vendas.
4. Fase 4 (R$200+/dia): Múltiplos lead magnets para diferentes segmentos. Remarketing multi-canal.
Métrica chave: Não é o CPL - é o custo por VENDA no fim do funil. Um CPL de R$2 com 0% de vendas = R$0 de receita.`,
    source: 'Email Marketing Masters Brasil 2025',
    year: 2025,
    difficulty: 'iniciante',
    rating: 4.4,
  },

  // ═══════════════════════════════════════════════════════════════
  // 24. INFOPRODUTOS - COMUNIDADE / MEMBERSHIP
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'CBO Conversão - Comunidade e Membership (Assinatura)',
    niche: 'infoprodutos',
    platform: 'FACEBOOK',
    objective: 'conversao',
    category: 'cbo',
    description: 'Campanha CBO para vender assinaturas de comunidades e memberships recorrentes. Modelo de receita previsível (MRR) com foco em senso de pertencimento, FOMO, conteúdo exclusivo e networking. Funciona para comunidades de qualquer nicho (negócios, fitness, investimentos, etc.).',
    strategy: `ESTRATÉGIA COMUNIDADE / MEMBERSHIP:

1. PROPOSTA DE VALOR:
   - Acesso a comunidade exclusiva com pessoas do mesmo nível
   - Conteúdo novo semanal/mensal (aulas, mentorias em grupo, materiais)
   - Networking e conexões de valor
   - Suporte e accountability do grupo

2. ESTRUTURA DE CAMPANHA:
   - CBO com 3 conjuntos:
     * Interest: Empreendedorismo, Desenvolvimento pessoal, Comunidades online
     * LAL 1-3% de membros ativos
     * Remarketing: visitantes da sales page + engajados no IG/YouTube

3. FUNIL:
   Anúncio → Sales page (ou VSL) → Checkout (assinatura mensal/anual) → Onboarding na comunidade

4. PRICING:
   - Plano mensal: R$47-197/mês (barreira de entrada)
   - Plano anual: R$397-1997/ano (desconto de 30-40%, melhor LTV)
   - Trial: 7 dias por R$1 ou grátis (para comunidades novas)

5. RETENÇÃO (tão importante quanto aquisição):
   - Onboarding estruturado nos primeiros 7 dias
   - Evento semanal ao vivo (mantém engajamento)
   - Sistema de níveis/gamificação
   - Resultados de membros compartilhados constantemente

6. PLATAFORMAS: Discord, Circle, Skool, Hotmart Club, Telegram (grupo fechado)`,
    campaignSetup: {
      buyingType: 'AUCTION',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      bidStrategy: 'LOWEST_COST',
      budgetType: 'daily',
      budgetRange: { min: 40, max: 300, currency: 'BRL', recommended: 100 },
    },
    adSetSetup: {
      targeting: {
        type: 'INTEREST_BASED',
        ageMin: 22,
        ageMax: 50,
        interests: ['Online communities', 'Networking', 'Entrepreneurship', 'Personal development', 'Mastermind groups'],
        behaviors: ['Online shoppers', 'Technology early adopters'],
        geoTargeting: 'Brasil inteiro',
        note: 'Adaptar interesses para o nicho da comunidade. Ex: comunidade de investidores → interesse em "Investing", "Stock market".',
      },
      placements: 'Instagram Feed + Reels + Stories + Facebook Feed',
      optimizationEvent: 'PURCHASE',
      attribution: '7d_click_1d_view',
    },
    creativeSetup: {
      format: ['video-bastidores', 'video-depoimento-membro', 'carrossel-beneficios', 'reels-comunidade', 'imagem-social-proof'],
      specs: {
        video: { ratio: '9:16 e 1:1', duration: '30-60s', resolution: '1080x1920' },
        imagem: { ratio: '1:1 e 4:5', resolution: '1080x1350' },
        carrossel: { cards: '4-6 benefícios da comunidade', ratio: '1:1' },
      },
      copyTemplates: [
        { headline: 'Entre para a comunidade #1 de [nicho]', primaryText: 'Mais de [X] membros ativos trocando experiências, fechando parcerias e crescendo juntos. Aulas semanais ao vivo, materiais exclusivos e networking de alto nível. Entre agora por apenas R$[X]/mês.', description: 'Cancele quando quiser. Sem fidelidade.', cta: 'SIGN_UP' },
        { headline: 'O que acontece dentro da nossa comunidade', primaryText: 'Toda semana: aula ao vivo, sessão de perguntas, material exclusivo e uma rede de [X]+ profissionais de [nicho]. O membro médio recupera o investimento no primeiro mês. Teste por 7 dias.', description: 'Plano mensal ou anual. Teste de 7 dias disponível.', cta: 'LEARN_MORE' },
        { headline: 'Você não precisa crescer sozinho(a)', primaryText: 'Pare de tentar fazer tudo sozinho. Dentro da [nome da comunidade], você tem acesso a mentoria em grupo, templates prontos e uma rede de apoio que realmente se importa com seu resultado.', description: 'Comunidade com [X]+ membros ativos.', cta: 'SIGN_UP' },
      ],
      visualGuidelines: [
        'Screenshots/gravação de tela da comunidade ativa (mensagens, interações reais)',
        'Vídeo de evento ao vivo da comunidade (mostra o que acontece por dentro)',
        'Depoimentos de membros em vídeo falando dos resultados e conexões',
        'Print de conversas e resultados compartilhados por membros (com permissão)',
        'Foto de encontro presencial da comunidade (se houver)',
        'Números sociais: quantidade de membros, aulas disponíveis, horas de conteúdo',
      ],
      hooks: [
        'O que acontece dentro de uma comunidade de [X] membros de [nicho]...',
        'Entrei nessa comunidade há [X] meses e minha vida mudou',
        'Você está fazendo networking errado - deixa eu te mostrar',
        'A comunidade que todo [profissional do nicho] deveria conhecer',
        'Sozinho você vai rápido, junto você vai longe - veja o que esses [X] membros conquistaram',
      ],
      ctaOptions: ['SIGN_UP', 'LEARN_MORE', 'GET_OFFER'],
    },
    benchmarks: {
      ctr: { min: 0.7, avg: 1.3, top: 2.8 },
      cpc: { min: 0.60, avg: 1.80, top: 0.35 },
      cpm: { min: 10, avg: 22, top: 6 },
      cpa: { min: 20, avg: 55, top: 10 },
      conversionRate: { min: 1.0, avg: 2.5, top: 6.0 },
      churnMensal: { min: 3, avg: 8, top: 2 },
    },
    tips: [
      'Mostre a comunidade ativa por dentro (screenshots reais) - prova de que não é um grupo morto',
      'Trial de 7 dias por R$1 reduz barreira de entrada e permite experimentar antes de assinar',
      'Retenção é tão importante quanto aquisição - onboarding estruturado nos primeiros 7 dias reduz churn em 50%',
      'Evento semanal ao vivo (Q&A, mentoria em grupo) é o principal driver de retenção',
      'Plano anual com desconto de 30-40% melhora LTV drasticamente (menos churn)',
      'Depoimentos de membros reais sobre networking e resultados convertem mais que lista de features',
    ],
    commonMistakes: [
      'Comunidade sem conteúdo/atividade recorrente (membros entram e saem em 1 mês)',
      'Não ter onboarding estruturado (membro novo não sabe por onde começar e desiste)',
      'Focar só em aquisição e ignorar retenção (churn alto come o crescimento)',
      'Preço muito baixo que atrai público não comprometido (R$9.90/mês gera comunidade fantasma)',
      'Prometer acesso ao expert 24/7 (insustentável e gera frustração)',
    ],
    scalingGuide: `ESCALA COMUNIDADE / MEMBERSHIP:
1. Fase 1 (R$40-80/dia): Validar product-market fit. Meta: CPA < R$55, churn < 10%/mês
2. Fase 2 (R$80-150/dia): Escalar com LAL de membros ativos (>3 meses). Novos criativos de bastidores.
3. Fase 3 (R$150-300/dia): Lançar plano anual com desconto. Remarketing agressivo com depoimentos.
4. Fase 4 (R$300+/dia): Eventos especiais de abertura de vagas (geram picos). Programa de indicação entre membros.
Métrica chave: MRR (Monthly Recurring Revenue) e LTV. Meta: LTV > 5x CAC. Churn < 5%/mês.`,
    source: 'Community-Led Growth Brasil 2026',
    year: 2026,
    difficulty: 'avancado',
    rating: 4.3,
  },
];

async function seed() {
  console.log('🌱 Seeding Campaign Library...');

  // Clear existing templates
  await prisma.campaignTemplate.deleteMany();

  // Insert all templates
  for (const template of templates) {
    await prisma.campaignTemplate.create({
      data: template as any,
    });
    console.log(`  ✅ ${template.name}`);
  }

  console.log(`\n🎉 Seeded ${templates.length} campaign templates!`);
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
