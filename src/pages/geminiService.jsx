import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const gerarSugestaoSermao = async (textoAtual) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Você é um assistente teológico para o Pr. Jeferson. 
    Com base no esboço abaixo, continue o pensamento com uma linguagem acessível e descomplicada:
    
    ${textoAtual}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro na IA:", error);
    return "Ops, a IA falhou. Verifique sua conexão ou API Key.";
  }
};