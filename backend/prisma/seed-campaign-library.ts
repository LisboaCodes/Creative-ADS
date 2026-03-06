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
