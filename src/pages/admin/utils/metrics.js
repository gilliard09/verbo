export const calcPercent = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

export const buildTaxas = ({ visitantes = 0, cadastros = 0, usaram = 0, assinaram = 0 }) => ({
  visitanteCadastro: calcPercent(cadastros, visitantes),
  cadastroUso: calcPercent(usaram, cadastros),
  usoAssinatura: calcPercent(assinaram, usaram),
});

export const calcDauWauRatio = ({ dau = 0, wau = 0 }) => calcPercent(dau, wau);
