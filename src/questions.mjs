// The conductor's vocabulary: what Jev can decide about the artwork.
// Shared between the Node proxy (builds the API request) and the browser
// (renders from the answers). Plain JS on purpose.

export const PALETTES = {
  veludo_noturno: {
    label: 'Veludo noturno',
    criteria: 'Azuis profundos e violeta sobre quase-preto; noite, mistério, quietude',
    bg: '#0a0a14',
    colors: ['#1b2a6b', '#3c2a78', '#5e4b9e', '#8a7fc7', '#c5c0e8'],
  },
  domingo_tarde: {
    label: 'Domingo à tarde',
    criteria: 'Cinzas quentes desbotados e âmbar pálido; melancolia mansa, fim de tarde parado',
    bg: '#171512',
    colors: ['#6e6257', '#93826f', '#b3a48c', '#cfb98e', '#e0d6c3'],
  },
  carnaval: {
    label: 'Carnaval',
    criteria: 'Rosa-choque, amarelo e ciano saturados; festa, euforia, confete',
    bg: '#12030f',
    colors: ['#ff2e88', '#ffd400', '#00e5ff', '#ff6d00', '#c400ff'],
  },
  mata: {
    label: 'Mata',
    criteria: 'Verdes de floresta, musgo e folha nova; vegetação densa, vida úmida',
    bg: '#0a120a',
    colors: ['#1e5631', '#3e8e41', '#71b340', '#a4c639', '#d6e8c0'],
  },
  sertao: {
    label: 'Sertão',
    criteria: 'Ocre, terracota e poeira; terra seca, calor, couro',
    bg: '#160f08',
    colors: ['#8c4a2f', '#b5651d', '#d1913c', '#e0b76a', '#efe0b8'],
  },
  neon: {
    label: 'Neon na garoa',
    criteria: 'Magenta e ciano elétricos sobre asfalto molhado; cidade à noite, letreiros',
    bg: '#08080f',
    colors: ['#ff00c8', '#00f0ff', '#7b2fff', '#ff3860', '#baffea'],
  },
  maresia: {
    label: 'Maresia',
    criteria: 'Verde-água, espuma e areia clara; mar calmo, brisa salgada',
    bg: '#0b1416',
    colors: ['#1d7a8c', '#3fa7a3', '#7fd1c0', '#c9e4d2', '#efe6cf'],
  },
  brasa: {
    label: 'Brasa',
    criteria: 'Vermelhos e laranjas incandescentes sobre carvão; fogo, intensidade, raiva',
    bg: '#100604',
    colors: ['#ff3d00', '#ff7a00', '#ffb300', '#d32f2f', '#ffd9a0'],
  },
  madrugada: {
    label: 'Madrugada fria',
    criteria: 'Azuis pálidos e cinza-névoa; frio, silêncio, insônia',
    bg: '#0d1118',
    colors: ['#4a6fa5', '#7d9bc1', '#a9c0d8', '#d3e0ea', '#8a93a5'],
  },
  tropicalia: {
    label: 'Tropicália',
    criteria: 'Verde-ácido, laranja e roxo em choque; psicodelia solar, colagem',
    bg: '#120b03',
    colors: ['#9dff00', '#ff8c00', '#8817d1', '#ffe600', '#ff4fa3'],
  },
  lavanda: {
    label: 'Lavanda',
    criteria: 'Lilás suave, creme e rosa-chá; ternura, leveza, aconchego',
    bg: '#14101a',
    colors: ['#b39ddb', '#d1c4e9', '#f3e5f5', '#e8b4bc', '#fff3e0'],
  },
  tinta_e_papel: {
    label: 'Tinta e papel',
    criteria: 'Preto de nanquim e branco-osso, um só vermelho de carimbo; caligrafia, contenção',
    bg: '#f0ead9',
    colors: ['#1a1a1a', '#3d3d3d', '#6b6b6b', '#b3261e', '#8c8577'],
  },
}

export const SHAPES = {
  filamentos: 'Linhas longas e finas que serpenteiam; cabelo, fumaça, correnteza',
  fitas: 'Faixas largas e curvas que dobram sobre si; seda, bandeiras, ondas',
  estilhacos: 'Segmentos curtos e angulosos; vidro quebrado, faísca, staccato',
  nevoa: 'Pontos suaves e difusos que se acumulam; poeira de luz, granulado, respiração',
}

const LEVELS_10 = (low, high) => [
  `${low} (mínimo)`,
  `${low}`,
  `quase ${low}`,
  `pouco abaixo do meio`,
  `equilibrado`,
  `pouco acima do meio`,
  `quase ${high}`,
  `${high}`,
  `muito ${high}`,
  `${high} (máximo)`,
]

export function buildQuestions() {
  return {
    paleta: {
      type: 'choice',
      instructions:
        'Qual paleta de cores melhor traduz o clima desta frase? Escolha pela emoção e atmosfera, não por palavras literais.',
      criteria: Object.fromEntries(Object.entries(PALETTES).map(([id, p]) => [id, p.criteria])),
    },
    forma: {
      type: 'choice',
      instructions: 'Qual vocabulário de formas melhor expressa esta frase?',
      criteria: SHAPES,
    },
    densidade: {
      type: 'score',
      instructions: 'Quão cheia/povoada deve ser a obra para esta frase? Vazio contemplativo ou multidão?',
      criteria: LEVELS_10('esparso', 'denso'),
    },
    energia: {
      type: 'score',
      instructions: 'Quanta velocidade e vigor de movimento a frase pede? Quietude ou frenesi?',
      criteria: LEVELS_10('lento', 'frenético'),
    },
    turbulencia: {
      type: 'score',
      instructions: 'O movimento deve ser ordenado e laminar ou caótico e revolto?',
      criteria: LEVELS_10('sereno', 'turbulento'),
    },
    escala: {
      type: 'score',
      instructions: 'O traço deve ser fino e delicado ou grosso e assertivo?',
      criteria: LEVELS_10('delicado', 'grosso'),
    },
    simetria: {
      type: 'noul',
      instructions: 'A frase pede uma composição simétrica/espelhada (em vez de assimétrica e orgânica)?',
    },
  }
}
