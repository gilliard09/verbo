// Contrato central de planos e permissões do Verbo.
// Preços e links de checkout ficam fora deste arquivo: aqui definimos apenas
// identidade, limites e capacidades. O plano "fundador" é legado e não deve
// ser convertido automaticamente em "essencial".

export const PLANOS = Object.freeze({
  gratuito: Object.freeze({
    id: 'gratuito',
    nivel: 'gratuito',
    pago: false,
    limiteSermoes: 3,
    todosCursos: false,
    cursosPermitidos: [],
  }),
  fundador: Object.freeze({
    id: 'fundador',
    nivel: 'essencial',
    pago: true,
    legado: true,
    // Preserva o comportamento já concedido aos Fundadores existentes.
    limiteSermoes: null,
    todosCursos: false,
    cursosPermitidos: ['fundador', 'essencial'],
  }),
  essencial: Object.freeze({
    id: 'essencial',
    nivel: 'essencial',
    pago: true,
    legado: false,
    limiteSermoes: 20,
    todosCursos: false,
    // Compatibilidade com cursos que ainda estejam cadastrados com mínimo "fundador".
    cursosPermitidos: ['fundador', 'essencial'],
  }),
  plus: Object.freeze({
    id: 'plus',
    nivel: 'plus',
    pago: true,
    limiteSermoes: null,
    todosCursos: true,
    cursosPermitidos: [],
  }),
});

const ALIASES_PLANO = Object.freeze({
  plus_vitalicio: 'plus',
});

export function normalizarPlano(plano) {
  const id = typeof plano === 'string' ? plano.trim().toLowerCase() : '';
  const canonico = ALIASES_PLANO[id] || id;
  return Object.prototype.hasOwnProperty.call(PLANOS, canonico)
    ? canonico
    : 'gratuito';
}

export function obterConfiguracaoPlano(plano) {
  return PLANOS[normalizarPlano(plano)];
}

export function temAcessoAoCurso(plano, curso) {
  if (!curso) return false;

  const config = obterConfiguracaoPlano(plano);
  if (!config.pago) return false;
  if (config.todosCursos) return true;

  const minimo = typeof curso.plano_minimo === 'string'
    ? curso.plano_minimo.trim().toLowerCase()
    : '';

  // Cursos sem plano mínimo são liberados para qualquer assinante.
  if (!minimo) return true;

  return config.cursosPermitidos.includes(minimo);
}
