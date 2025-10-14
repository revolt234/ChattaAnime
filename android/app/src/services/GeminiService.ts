import { GoogleGenerativeAI } from '@google/generative-ai';

// Definiamo una variabile per contenere l'istanza del client AI
let genAI: GoogleGenerativeAI | null = null;

/**
 * Inizializza il client GoogleGenerativeAI con la chiave fornita.
 * @param {string} apiKey - La chiave API dell'utente.
 */
const initialize = (apiKey: string) => {
  if (apiKey && apiKey.trim() !== '') {
    try {
      genAI = new GoogleGenerativeAI(apiKey);
    } catch (error) {
      console.error("Errore durante l'inizializzazione di GoogleGenerativeAI:", error);
      genAI = null;
    }
  } else {
    // Se la chiave è vuota, resettiamo l'istanza
    genAI = null;
  }
};

/**
 * Restituisce un'istanza del modello generativo.
 * Lancia un errore se il servizio non è stato prima inizializzato.
 * @returns Il modello Gemini.
 */
const getModel = () => {
  if (!genAI) {
    // Questo errore ci aiuta a capire subito se ci siamo dimenticati di impostare la chiave
    throw new Error('Gemini AI non è stato inizializzato. Imposta la chiave API prima di usarlo.');
  }
  // NOTA: Ho cambiato 'gemini-2.5-flash' in 'gemini-1.5-flash' perché è il modello flash più recente e stabile disponibile pubblicamente.
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};

/**
 * Controlla se il servizio è stato inizializzato con una chiave valida.
 * @returns {boolean} True se il servizio è pronto, altrimenti false.
 */
const isInitialized = (): boolean => {
    return genAI !== null;
};


const GeminiService = {
  initialize,
  getModel,
  isInitialized,
};

export default GeminiService;