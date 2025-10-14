/* useEvaluationManager.ts */
import { useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JsonFileReader from '../android/app/src/services/JsonFileReader';
import { GoogleGenerativeAI } from '@google/generative-ai';
import GeminiService from '../android/app/src/services/GeminiService';

export const useEvaluationManager = ({
  chat,
  setChat,
  chatHistory,
  currentChatId,
  setEvaluating,
  setCurrentEvaluationScores,
  avgTimeResponse,
  avgResponseLength,
  counterInterruption,
    avgSpeechRate,
    maxSpeechRate,
  setChatHistory, // <- serve per salvare e poi persistere
}) => {
  // Helper note dinamiche per fenomeno
  const getHintsForProblem = (problem, metrics) => { // ✅ Accetta 'metrics' come argomento
     let timeHint = '';
     let logorreaHint = '';
     let speechRateHint = '';
     if (problem.fenomeno.toLowerCase().includes('discorso sotto pressione')) {
       // ✅ Usa le metriche dall'argomento
       if (metrics.avgSpeechRate !== undefined && metrics.maxSpeechRate !== undefined) {
         speechRateHint =
           `\n**Nota contenente le metriche da considerare e menzionare sempre nella valutazione di Discorso Sotto Pressione:** ` +
           `DATI DEL PAZIENTE:` +
           `Velocità media del parlato = ${metrics.avgSpeechRate.toFixed(2)} parole/s (dato più importante); ` +
           `Picco di velocità = ${metrics.maxSpeechRate.toFixed(2)} parole/s (da tenere in considerazione); ` +
           `Tu devi considerare che una velocità di conversazione normale è compresa nel range 110-190 parole al minuto, un range più elevato rafforza la presenza della problematica.\n\n`;
       }
     }
     if (problem.fenomeno.toLowerCase().includes('rallentato') && metrics.avgTimeResponse !== undefined) {
       // ✅ Usa le metriche dall'argomento
       timeHint =
         `**Nota contenente le metriche da considerare e menzionare sempre nella valutazione di Pensiero Rallentato: ` +
         `DATI DEL PAZIENTE:` +
         `Tempo medio di risposta durante questa conversazione = ${metrics.avgTimeResponse.toFixed(2)}s. ` +
         `Se > 5 secondi rafforza la presenza della problematica.**\n`;
     }
     if (problem.fenomeno.toLowerCase().includes('logorrea')) {
       // ✅ Usa le metriche dall'argomento
       if (metrics.avgResponseLength !== undefined && metrics.counterInterruption !== undefined) {
         logorreaHint =
           `\n**Nota contenente le metriche da considerare e menzionare sempre nella valutazione di Logorrea:** ` +
                      `DATI DEL PAZIENTE:` +
           `Lunghezza media risposte= ${metrics.avgResponseLength.toFixed(2)} parole; ` +
           `interrompe il medico nel= ${(metrics.counterInterruption * 100).toFixed(1)}% dei casi. ` +
           `Considera queste metriche nell'assegnazione del punteggio.\n\n`;
       }
     }
    return { timeHint, logorreaHint, speechRateHint };
   };

  // ------- Valutazione singolo fenomeno -------
const handleEvaluateSingleProblem = useCallback(async (selectedProblem, liveMetrics = null) => {
    if (!selectedProblem || chat.length === 0) {
      Alert.alert('Attenzione', 'Seleziona un fenomeno da valutare');
      return;
    }
const metrics = liveMetrics ?? { avgTimeResponse, avgResponseLength, counterInterruption, avgSpeechRate, maxSpeechRate };
    // Alert metriche dedicate
    if (selectedProblem.fenomeno.toLowerCase().includes('rallentato')) {
      if (metrics.avgTimeResponse !== undefined) {
        Alert.alert('⏱️ Metrica per Pensiero Rallentato', `Tempo medio risposte: ${metrics.avgTimeResponse.toFixed(2)}s`);
      } else {
        Alert.alert('⚠️ Informazione mancante', 'avgTimeResponse non disponibile.');
      }
    }
if (selectedProblem.fenomeno.toLowerCase().includes('discorso sotto pressione')) {
  let msg = '';
  msg += metrics.avgSpeechRate == null
    ? '⚠️ Velocità media parlato NON disponibile.\n'
    : `⚡️ Velocità media parlato: ${metrics.avgSpeechRate.toFixed(2)} parole/s\n`;
  msg += metrics.maxSpeechRate == null
    ? '⚠️ Picco velocità parlato NON disponibile.\n'
    : `🚀 Picco velocità parlato: ${metrics.maxSpeechRate.toFixed(2)} parole/s\n`;
  Alert.alert('📊 Metriche per Discorso Sotto Pressione', msg.trim());
}
    if (selectedProblem.fenomeno.toLowerCase().includes('logorrea')) {
      let msg = '';
      msg += metrics.avgResponseLength == null
        ? '⚠️ Lunghezza media risposte NON disponibile.\n'
        : `🗣️ Lunghezza media risposte: ${metrics.avgResponseLength.toFixed(2)} parole\n`;
      msg += metrics.counterInterruption == null
        ? '⚠️ Interruzioni paziente NON disponibili.\n'
        : `🔁 Interruzioni paziente: ${(metrics.counterInterruption * 100).toFixed(1)}% delle domande\n`;
      Alert.alert('📊 Metriche per Logorrea', msg.trim());
    }

    setEvaluating(true);

    try {
      const chatObj = chatHistory.find(c => c.id === currentChatId);
      const previousScore = chatObj?.evaluationScores?.[selectedProblem.fenomeno] ?? -1;

      // ✅ Manteniamo questo alert (lo volevi conservare)
     /* Alert.alert(
        '🧠 Punteggio Precedente',
        previousScore >= 0
          ? `Il punteggio già assegnato per "${selectedProblem.fenomeno}" è: ${previousScore}`
          : 'Nessun punteggio precedente disponibile per questo fenomeno.'
      );*/

// In handleEvaluateSingleProblem...
// ✅ Passa l'oggetto 'metrics' alla funzione
const { timeHint, logorreaHint, speechRateHint } = getHintsForProblem(selectedProblem, metrics);

      const prompt = `
- Problematica: ${selectedProblem.fenomeno}
- Descrizione: ${selectedProblem.descrizione}
- Esempio: ${selectedProblem.esempio}
- Punteggio TLDS: ${selectedProblem.punteggio}
${timeHint}${logorreaHint}${speechRateHint}
${previousScore >= 0
  ? `\nNOTA: menziona sempre esplicitamente il valore precedente '${previousScore}' (0–4) e se è maggiore/minore dell’attuale.`
  : ''
}
**Se il tuo ultimo messaggio è una domanda, non considerare questa nella valutazione.**
**Valuta la presenza della problematica "${selectedProblem.fenomeno}" nelle risposte del paziente, usando il seguente modello e includendo le note fornite:**
**Modello di output:**
${selectedProblem.modello_di_output}

Conversazione completa:
${chat.map(m => `${m.role === 'user' ? 'PAZIENTE' : 'MEDICO'}: ${m.message}`).join('\n')}
`;
 // MODIFICATO: Otteniamo il modello dal servizio
      const model = GeminiService.getModel();
      // Chiamata al modello
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Estrai punteggio 0..4
      const newScore = extractScoreFromText(text);

      if (newScore >= 0) {
        // 1) aggiorna punteggi correnti
        setCurrentEvaluationScores(prev => ({ ...prev, [selectedProblem.fenomeno]: newScore }));

        // 2) salva su chatHistory (append, non overwrite) + persisti
        const idx = chatHistory.findIndex(c => c.id === currentChatId);
        if (idx !== -1) {
          const updated = [...chatHistory];
          const curr = { ...updated[idx] };

          curr.evaluationLog = curr.evaluationLog ?? {};
          const list = curr.evaluationLog[selectedProblem.fenomeno] ?? [];
          list.push({ score: newScore, timestamp: Date.now() }); // <- APPEND, non overwrite
          curr.evaluationLog[selectedProblem.fenomeno] = list;

          curr.evaluationScores = {
            ...curr.evaluationScores,
            [selectedProblem.fenomeno]: newScore,
          };

          updated[idx] = curr;
          setChatHistory(updated);
          try {
            await AsyncStorage.setItem('chatHistory', JSON.stringify(updated));
          } catch (e) {
            console.warn('Persistenza chatHistory fallita:', e);
          }


        }
      }

      // 3) append messaggio col testo della valutazione
      setChat(prev => [...prev, { role: 'bot', message: `**${selectedProblem.fenomeno}**\n${text}` }]);
    } catch (err) {
      console.error('Errore durante la valutazione:', err);
       const errorMessage = err.message.includes('inizializzato')
              ? 'Valutazione fallita. Hai impostato la chiave API?'
              : 'Valutazione fallita.';
      Alert.alert('Errore', 'Valutazione fallita.');
    } finally {
      setEvaluating(false);
    }
  // Alla fine di handleEvaluateSingleProblem...
    }, [
      chat, chatHistory, currentChatId,
      // ✅ Rimuovi le singole metriche perché sono già incluse nell'hook
      setEvaluating, setCurrentEvaluationScores, setChatHistory,
    ]);

  // ------- Valutazione completa (tutti i fenomeni) -------
const handleEvaluateProblems = useCallback(async (liveMetrics = null) => { // ✅ Modifica la firma
    if (chat.length === 0) {
      Alert.alert('Attenzione', 'Non c’è alcuna conversazione da valutare');
      return;
    }
 const metrics = liveMetrics ?? { avgTimeResponse, avgResponseLength, counterInterruption, avgSpeechRate, maxSpeechRate };
    setEvaluating(true);

    try {
      // Riepilogo metriche
      let generalInfo = 'Metriche generali disponibili per la valutazione:\n\n';
      let hasMetrics = false;
      if (metrics.avgTimeResponse !== undefined) {
        generalInfo += `⏱️ Tempo medio risposta: ${metrics.avgTimeResponse.toFixed(2)}s\n`;
        hasMetrics = true;
      }
      if (avgResponseLength !== undefined) {
        generalInfo += `🗣️ Lunghezza media risposte: ${metrics.avgResponseLength.toFixed(2)} parole\n`;
        hasMetrics = true;
      }
      if (counterInterruption !== undefined) {
        generalInfo += `🔁 Tasso interruzioni: ${(metrics.counterInterruption * 100).toFixed(1)}%\n`;
        hasMetrics = true;
      }
      if (hasMetrics) Alert.alert('📊 Info Generali', generalInfo.trim());

      const problemDetails = await JsonFileReader.getProblemDetails();
      const evaluations: Array<{ problem: string; evaluation: string }> = [];
      const newCurrentScores: { [fenomeno: string]: number } = {};
      const model = GeminiService.getModel();
      for (const problem of problemDetails) {
         const { timeHint, logorreaHint, speechRateHint } = getHintsForProblem(problem, metrics);

        const prompt = `
- Problematica: ${problem.fenomeno}
- Descrizione: ${problem.descrizione}
- Esempio: ${problem.esempio}
- Punteggio TLDS: ${problem.punteggio}
${timeHint}${logorreaHint}${speechRateHint}
**Se il tuo ultimo messaggio è una domanda, non considerare questa nella valutazione.**
**Valuta la presenza della problematica "${problem.fenomeno}" all'interno delle risposte del paziente, usando il seguente modello:**
- Modello di output: ${problem.modello_di_output}

Conversazione completa:
${chat.map(m => `${m.role === 'user' ? 'PAZIENTE' : 'MEDICO'}: ${m.message}`).join('\n')}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text() || 'Nessuna valutazione disponibile.';
        evaluations.push({ problem: problem.fenomeno, evaluation: text });

        const score = extractScoreFromText(text);
        if (score >= 0) {
          newCurrentScores[problem.fenomeno] = score;

          const idx = chatHistory.findIndex(c => c.id === currentChatId);
          if (idx !== -1) {
            const updated = [...chatHistory];
            const curr = { ...updated[idx] };

            curr.evaluationLog = curr.evaluationLog ?? {};
            const list = curr.evaluationLog[problem.fenomeno] ?? [];
            list.push({ score, timestamp: Date.now() }); // <- APPEND
            curr.evaluationLog[problem.fenomeno] = list;

            curr.evaluationScores = { ...curr.evaluationScores, [problem.fenomeno]: score };

            updated[idx] = curr;
            setChatHistory(updated);
            try {
              await AsyncStorage.setItem('chatHistory', JSON.stringify(updated));
            } catch (e) {
              console.warn('Persistenza chatHistory fallita (bulk):', e);
            }
          }
        }
      }

      if (Object.keys(newCurrentScores).length > 0) {
        setCurrentEvaluationScores(prev => ({ ...prev, ...newCurrentScores }));
      }

      const formatted = evaluations
        .map(e => `**${e.problem}**\n${e.evaluation}\n\n`)
        .join('---\n');

      setChat(prev => [...prev, { role: 'bot', message: formatted }]);
    } catch (err) {
      console.error('Errore nella generazione del report:', err);
        const errorMessage = err.message.includes('inizializzato')
              ? 'Report fallito. Hai impostato la chiave API?'
              : 'Errore nella generazione del report.';
      Alert.alert('Errore', 'Errore nella generazione del report.');
    } finally {
      setEvaluating(false);
    }
 }, [
   chat, chatHistory, currentChatId,
   // ✅ Rimuovi le singole metriche
   setEvaluating, setCurrentEvaluationScores, setChatHistory,
 ]);

  // Estrazione punteggio (accetta "Assegnato" o "assegnato")
  const extractScoreFromText = (text: string): number => {
    const match = text.match(/Punteggio\s*[Aa]ssegnato:\s*([0-4])/);
    if (!match) return -1;
    const score = parseInt(match[1], 10);
    return Number.isNaN(score) ? -1 : Math.max(0, Math.min(4, score));
  };

  return {
    handleEvaluateSingleProblem,
    handleEvaluateProblems,
    extractScoreFromText,
  };
};
