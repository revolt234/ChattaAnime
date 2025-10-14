
//App.tsx
import React, { useState, useEffect, useRef } from 'react';
import TranscriptAnalytics from './android/app/src/services/TranscriptAnalytics'; // ✅ Aggiungi questa riga
import {
  SafeAreaView,
  Text,
  Button,
  ScrollView,
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
    LogBox,
    TextInput, // NUOVO// <-- AGGIUNGI QUESTA RIGA
} from 'react-native';
import LiveIndicator from './components/LiveIndicator';
import { useUIManager } from './hooks/useUIManager'; // <-- AGGIUNGI
import ToolsMenuModal from './components/ToolsMenuModal'; // <-- AGGIUNGI
import ChartsReportExport, { ChartsReportExportHandles } from './components/ChartsReportExport';
import { useExportManager } from './hooks/useExportManager';
import { useEvaluationManager } from './hooks/useEvaluationManager';
import HistoryModal from './components/HistoryModal';
import ExportModal from './components/ExportModal';
import ChatInput from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import ChatHeader from './components/ChatHeader';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { API_KEY } from '@env';
import { GoogleGenerativeAI } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JsonFileReader from './android/app/src/services/JsonFileReader';
import Tts from 'react-native-tts';
import { useChatManager } from './hooks/useChatManager'; // 👈 nuovo import
import GeminiService from './android/app/src/services/GeminiService';
LogBox.ignoreLogs([
  'new NativeEventEmitter', // Questo ignorerà tutti gli avvisi che iniziano con "new NativeEventEmitter"
]);
interface Chat {
  id: string;
  title: string;
   messages: {
     role: 'user' | 'bot';
     message: string;
     start: number;
     end: number;
   }[];
  createdAt: string;
  evaluationScores: { [fenomeno: string]: number };
  // 👇 nuovo
  evaluationLog?: {
    [fenomeno: string]: Array<{ score: number; timestamp: number }>;
  };
  avgTimeResponse?: number;
  avgResponseLength?: number;
  counterInterruption?: number;
   avgSpeechRate?: number; // <-- AGGIUNGI
    maxSpeechRate?: number; // <-- AGGIUNGI
}

export default function App() {
    const { uiState, uiActions } = useUIManager();
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [isLiveMode, setIsLiveMode] = useState(false); // <-- AGGIUNGI SE MANCA
    const [hasConcludedInterview, setHasConcludedInterview] = useState(false);
    const [isBotSpeaking, setIsBotSpeaking] = useState(false);
    const [problemOptions, setProblemOptions] = useState<any[]>([]);
    const [interviewTrigger, setInterviewTrigger] = useState<'live' | null>(null);
    const chartsRef = useRef<ChartsReportExportHandles>(null);
    const [scrollViewKey, setScrollViewKey] = useState(0);
    const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isApiKeySet, setIsApiKeySet] = useState(false);
  const {
      chat, setChat,
      loading, setLoading,
      evaluating, setEvaluating,
      hasAskedForNameAndBirth, setHasAskedForNameAndBirth,
      chatHistory, setChatHistory,
      currentChatId, setCurrentChatId,
      currentEvaluationScores, setCurrentEvaluationScores,
      askedQuestions, setAskedQuestions,
      initialPromptSent, setInitialPromptSent,
      questions,
       sendVoiceMessage,
      startNewChat,
      startInterview,
     saveChat,
        updateLastBotMessageTimestamp,
     } = useChatManager({ isLiveMode, voiceEnabled });

  const { exporting, exportChatToFile } = useExportManager();
  const voiceManager = useVoiceRecognition(); // <-- AGGIUNGI QUESTA RIGA
  // ✅ 1. DICHIARA LO STATO PER LE METRICHE TEMPORANEE
  const [tempMetrics, setTempMetrics] = useState(null);
  // ✅ AGGIUNGI QUESTA RIGA:
  // Questo "flag" ci aiuterà a sapere se la conversazione live è iniziata davvero
  const hasLiveConversationStarted = useRef(false);
  // ✅ 2. PASSA LE METRICHE CORRETTE A useEvaluationManager
  const chatObj = chatHistory.find(c => c.id === currentChatId);


 const {
    handleEvaluateSingleProblem,
    handleEvaluateProblems,
    extractScoreFromText
  } = useEvaluationManager({
    chat,
    setChat,
    chatHistory,
    currentChatId,
    setEvaluating,
    setCurrentEvaluationScores,
    setChatHistory,
    // ✅ Rimuoviamo le metriche da qui
  });

  // Stati locali NON gestiti dal manager



// App.tsx
  const handleTriggerChartExport = () => {
        chartsRef.current?.export();
    };
const deactivateLiveMode = () => {
  if (isLiveMode) {
    voiceManager.stopListening();

    // ✅ AGGIUNGI QUESTA RIGA
    // Pulisce tutto lo stato del microfono (incluso il testo riconosciuto).
    voiceManager.reset();

    setIsLiveMode(false);
  }
};
  // App.tsx
    const chatScrollViewRef = useRef<ScrollView>(null);

    // ✅ AGGIUNGI QUESTA FUNZIONE
    const convertChatToTranscript = (chatMessages) => {
      return chatMessages.map(msg => ({
        role: msg.role === 'bot' ? 'medico' : 'paziente',
        start: msg.start,
        end: msg.end,
        text: msg.message,
      })).filter(msg => msg.text !== 'INIZIO_INTERVISTA_NASCOSTO');
    };
// ✅ AGGIUNGI QUESTO BLOCCO
  // Questo "contenitore" ci permette di usare la funzione in modo sicuro
  const updateTimestampRef = useRef(updateLastBotMessageTimestamp);
// SOSTITUISCI IL VECCHIO useEffect che gestisce la voce CON QUESTO:
// useEffect in App.tsx (VERSIONE CORRETTA)

 useEffect(() => {
      const loadApiKey = async () => {
        try {
          const storedKey = await AsyncStorage.getItem('geminiApiKey');
          if (storedKey) {
            GeminiService.initialize(storedKey);
            setApiKeyInput(storedKey); // Pre-compila l'input per future modifiche
            setIsApiKeySet(GeminiService.isInitialized());
          }
        } catch (error) {
          console.error("Impossibile caricare la chiave API:", error);
        }
      };
      loadApiKey();
    }, []);
useEffect(() => {
  // Questo effetto si attiva SOLO quando l'hook ci dice che ha finito.
  if (voiceManager.hasFinishedSpeaking && isLiveMode && !hasConcludedInterview) {
    const recognizedText = voiceManager.recognizedText.trim();

    // Se l'utente ha parlato, inviamo il messaggio.
    if (recognizedText) {
      const startTime = voiceManager.actualSpeechStartTime ?? voiceManager.speechStartTime;
      sendVoiceMessage(recognizedText, startTime, voiceManager.speechEndTime);
    }

    voiceManager.resetFinishedSpeaking();
  }
}, [voiceManager.hasFinishedSpeaking]);
useEffect(() => {
  const loadProblems = async () => {
    try {
      const problems = await JsonFileReader.getProblemDetails();
      setProblemOptions(problems);
    } catch (err) {
      console.error('Errore nel caricamento dei fenomeni:', err);
    }
  };

  if (chat.length > 0 && problemOptions.length === 0) {
    loadProblems();
  }
}, [chat]);
// In App.tsx, sostituisci tutti i vecchi useEffect per TTS e microfono con questi due:

// 1. useEffect per IMPOSTARE i listener (CRASH-PROOF)
// Questo si esegue solo una volta e non tenta mai di rimuovere i listener, evitando il bug.
// 1. useEffect per IMPOSTARE i listener (CRASH-PROOF e con TIMESTAMP)
// La versione finale che calcola i timestamp SENZA rompere nulla
useEffect(() => {
  const onStart = () => {
    setIsBotSpeaking(true);
    // Usa la funzione che hai già importato per aggiornare l'inizio
    updateLastBotMessageTimestamp('start');
  };
// In App.tsx, dopo gli altri useEffect

 // Questo effetto dipende SOLO dal trigger
  const onFinish = () => {
    setIsBotSpeaking(false);
    // E fa lo stesso per la fine
    updateLastBotMessageTimestamp('end');
  };

  const onCancel = () => {
    setIsBotSpeaking(false);
  };

  Tts.addEventListener('tts-start', onStart);
  Tts.addEventListener('tts-finish', onFinish);
  Tts.addEventListener('tts-cancel', onCancel);
}, [updateLastBotMessageTimestamp]); // Aggiungi la dipendenza per sicurezza
// App.tsx
useEffect(() => {
  // L'effetto si attiva solo quando si vuole iniziare la modalità live
  if (interviewTrigger !== 'live') return;

  // Definiamo una funzione asincrona per gestire l'avvio
  const beginLiveInterview = async () => {
    // 1. Imposta direttamente gli stati per la modalità live
    setIsLiveMode(true);
    setHasConcludedInterview(false);
    hasLiveConversationStarted.current = false;
    uiActions.setFirstLoad(false);

    // 2. Avvia l'intervista passando 'true' per la modalità live
    await startInterview(true);
  };

  beginLiveInterview();

  // 3. Resetta il trigger
  setInterviewTrigger(null);

}, [interviewTrigger, startInterview, uiActions]);
// 2. useEffect per GESTIRE il microfono in modo intelligente
useEffect(() => {
  // Se il bot inizia a parlare, l'unica cosa che facciamo
  // è impostare il nostro flag per dire "la conversazione è iniziata".
  if (isBotSpeaking) {
    hasLiveConversationStarted.current = true;
    return; // Usciamo subito, non dobbiamo fare altro.
  }

  // Se arriviamo qui, significa che isBotSpeaking è `false`.
  // Ora controlliamo se la conversazione è effettivamente iniziata.
 if (hasLiveConversationStarted.current && isLiveMode && !hasConcludedInterview) {
    voiceManager.startListening();
  }
}, [isBotSpeaking, isLiveMode, hasConcludedInterview, voiceManager.startListening]); // 👈 AGGIUNGI QUESTO
  const toggleVoice = () => {
    if (voiceEnabled) {
      Tts.stop();
    }
    setVoiceEnabled(!voiceEnabled);
  };

 const handleSaveApiKey = async () => {
      if (!apiKeyInput.trim()) {
        Alert.alert('Attenzione', 'La chiave API non può essere vuota.');
        return;
      }
      try {
        await AsyncStorage.setItem('geminiApiKey', apiKeyInput);
        GeminiService.initialize(apiKeyInput);
        setIsApiKeySet(GeminiService.isInitialized());
        setIsApiKeyModalVisible(false); // Chiude il modale
        if (GeminiService.isInitialized()) {
            Alert.alert('Successo', 'Chiave API salvata e inizializzata correttamente.');
        } else {
            Alert.alert('Errore', 'La chiave API fornita non è valida. Riprova.');
        }
      } catch (error) {
        console.error("Impossibile salvare la chiave API:", error);
        Alert.alert('Errore', 'Non è stato possibile salvare la chiave API.');
      }
    };

// Sostituisci la vecchia toggleLiveListening con questa
// Sostituisci 'handleConcludeLiveInterview' con questa funzione
const handleConcludeLiveInterview = () => {
  voiceManager.stopListening();
  setHasConcludedInterview(true);
};

const handleImportTranscript = async () => {
  const result = await JsonFileReader.importTranscriptFromFile();
  if (result) {
    const { transcript, ...metrics } = result;

    // Mappiamo i messaggi includendo i timestamp dal file
    let mappedMessages = transcript.map(item => ({
      role: item.role === 'medico' ? 'bot' : 'user',
      message: item.text,
      start: item.start,
      end: item.end,
    }));

    // Aggiungiamo un messaggio fittizio con timestamp a zero se necessario
    if (chat.length === 0 && mappedMessages.length > 0 && mappedMessages[0].role !== 'user') {
      const firstUserMsg = mappedMessages.find(m => m.role === 'user');
      const messageText = firstUserMsg ? `Chat di ${firstUserMsg.message}` : '[Inizio conversazione importata]';
      mappedMessages.unshift({
        role: 'user',
        message: messageText,
        start: 0,
        end: 0
      });
    }

    // Aggiungiamo i messaggi importati in coda a quelli esistenti
    setChat(prev => [...prev, ...mappedMessages]);

    setTempMetrics(metrics);
    uiActions.setFirstLoad(false);
    setInitialPromptSent(true);
    const importedQuestions = mappedMessages
      .filter(m => m.role === 'bot' && m.message.includes('?'))
      .map(m => m.message);
    setAskedQuestions(prev => [...prev, ...importedQuestions]);

    Alert.alert(
      'Importazione Riuscita',
      `Aggiunte ${transcript.length} battute alla conversazione.\n`
    );
  }
};


const handleGenerateLiveReport = () => {
  // ✅ 1. Calcola le metriche fresche
  const transcript = convertChatToTranscript(chat);
  const liveMetrics = TranscriptAnalytics.calculateAllMetrics(transcript);

  // ✅ 2. Chiama la funzione di valutazione originale con le metriche
  handleEvaluateProblems(liveMetrics);
};
const handleSelectProblemToEvaluate = (problem: any) => {
  // NON disattiviamo più la modalità live qui per non perdere i pulsanti

  // ✅ 1. Calcola le metriche fresche dalla chat attuale
  const transcript = convertChatToTranscript(chat);
  const liveMetrics = TranscriptAnalytics.calculateAllMetrics(transcript);

  // ✅ 2. Passa le metriche alla funzione di valutazione
  handleEvaluateSingleProblem(problem, liveMetrics);
};
const handleEndLiveMode = () => {
  voiceManager.stopListening(); // Ferma il microfono
};
const handleOpenToolsMenu = () => {
  // ✅ Non disattiviamo più la modalità live
  uiActions.openToolsMenu();
};
  const loadChat = (chatId: string) => {
      deactivateLiveMode();
    if (voiceEnabled) {
      Tts.stop();
    }

    const selectedChat = chatHistory.find(c => c.id === chatId);
    if (selectedChat) {
      setChat(selectedChat.messages);
      if (selectedChat.evaluationScores) {
        setCurrentEvaluationScores(selectedChat.evaluationScores);
      }
      setCurrentChatId(chatId);
      setHasAskedForNameAndBirth(selectedChat.messages.some(m => m.role === 'bot' && m.message.includes('nome e data di nascita')));
     //...dentro loadChat
     uiActions.closeHistoryModal();
     uiActions.setFirstLoad(false);
     setTempMetrics(null); // Aggiungi questo per resettare le metriche quando carichi una chat
      setInitialPromptSent(true);

      const questionsAsked = selectedChat.messages
        .filter(m => m.role === 'bot' && m.message.includes('?'))
        .map(m => m.message);
      setAskedQuestions(questionsAsked);
    }
  };
// In App.tsx, all'interno del componente App()
const handleGoHome = () => {
     deactivateLiveMode();
  if (voiceEnabled) {
    Tts.stop();
  }
  startNewChat();
  uiActions.setFirstLoad(true);
};
  const deleteChat = async (chatId: string) => {
    try {
      const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
      setChatHistory(updatedHistory);

      await AsyncStorage.setItem('chatHistory', JSON.stringify(updatedHistory));

      if (currentChatId === chatId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione della chat:', error);
      Alert.alert('Errore', 'Impossibile eliminare la chat.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader
        onToggleHistoryModal={uiActions.openHistoryModal}
        onGoHome={handleGoHome}
        isOnHome={uiState.isFirstLoad}
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
        isLiveMode={isLiveMode}
      />

      <View style={styles.chatContainer}>
        {uiState.isFirstLoad && chat.length === 0 ? (
          // --- SCHERMATA INIZIALE ---
          <View style={styles.startInterviewContainer}>
            <TouchableOpacity
              style={[styles.startInterviewButton, { backgroundColor: '#607D8B', marginBottom: 25 }]}
              onPress={() => setIsApiKeyModalVisible(true)}
            >
              <Text style={styles.startInterviewButtonText}>🔑 Imposta API Key</Text>
            </TouchableOpacity>

            {/* Pulsanti disabilitati se la chiave non è impostata */}
            <TouchableOpacity
              style={[
                styles.startInterviewButton,
                { marginTop: 15, backgroundColor: '#FFC107' },
                !isApiKeySet && styles.disabledButton
              ]}
              onPress={handleImportTranscript}
              disabled={!isApiKeySet}
            >
              <Text style={styles.startInterviewButtonText}>Valuta Intervista (JSON)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startInterviewButton,
                { marginTop: 15, backgroundColor: '#4CAF50' },
                !isApiKeySet && styles.disabledButton
              ]}
              onPress={() => setInterviewTrigger('live')}
              disabled={!isApiKeySet}
            >
              <Text style={styles.startInterviewButtonText}>🎙️ Intervista Live</Text>
            </TouchableOpacity>

            {/* Messaggio di avviso se la chiave non è impostata */}
            {!isApiKeySet && (
              <Text style={styles.apiKeyWarning}>
                Per favore, imposta la tua chiave API di Gemini per continuare.
              </Text>
            )}
          </View>
        ) : (
          // --- SCHERMATA CHAT ---
          <>
            <ChatMessages
              chat={chat}
              loading={loading}
              evaluating={evaluating}
              problemOptions={problemOptions}
              onEvaluateSingleProblem={handleSelectProblemToEvaluate}
            />

            {isLiveMode && (
              <LiveIndicator
                isListening={voiceManager.isListening}
                recognizedText={voiceManager.recognizedText}
              />
            )}

            <View style={styles.bottomBar}>
              {(() => {
                if (!isLiveMode) {
                  return (
                    <View style={styles.actionButtons}>
                      <View style={[{ flex: 1 }]}>
                        <Button
                          title="🔧 Strumenti"
                          onPress={handleOpenToolsMenu}
                          disabled={loading || evaluating || chat.length === 0}
                          color="#673AB7"
                        />
                      </View>
                    </View>
                  );
                }

                if (isLiveMode && !hasConcludedInterview) {
                  return (
                    <TouchableOpacity
                      style={[styles.startInterviewButton, { backgroundColor: '#f44336', width: '95%', alignSelf: 'center', marginBottom: 10 }]}
                      onPress={handleConcludeLiveInterview}
                    >
                      <Text style={styles.startInterviewButtonText}>Concludi Intervista</Text>
                    </TouchableOpacity>
                  );
                }

                if (isLiveMode && hasConcludedInterview) {
                  return (
                    <View style={styles.actionButtons}>
                      <View style={[{ flex: 1 }]}>
                        <Button
                          title="🔧 Strumenti"
                          onPress={handleOpenToolsMenu}
                          disabled={loading || evaluating || chat.length === 0}
                          color="#673AB7"
                        />
                      </View>
                    </View>
                  );
                }
                return null;
              })()}
            </View>
          </>
        )}
      </View>

      {/* TUTTI I MODALI DEVONO ESSERE QUI, FUORI DAL CONTAINER DELLA CHAT */}
      <ToolsMenuModal
        visible={uiState.isToolsMenuVisible}
        onClose={uiActions.closeToolsMenu}
        onGenerateReport={handleGenerateLiveReport}
        onExportCharts={uiActions.openChartsModal}
        onExportChat={uiActions.openExportModal}
        onImportTranscript={handleImportTranscript}
        onStartLiveMode={() => setInterviewTrigger('live')}
        isExporting={exporting}
      />

      <HistoryModal
        visible={uiState.showHistoryModal}
        onClose={uiActions.closeHistoryModal}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onLoadChat={loadChat}
        onDeleteChat={deleteChat}
      />

      <ExportModal
        visible={uiState.showExportModal}
        onClose={uiActions.closeExportModal}
        onSave={(fileName) => exportChatToFile(chat, fileName)}
      />

      <Modal
        animationType="slide"
        transparent={false}
        visible={uiState.showChartsModal}
        onRequestClose={uiActions.closeChartsModal}
        onShow={() => {
          setTimeout(() => {
            setScrollViewKey(prevKey => prevKey + 1);
          }, 2000);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Grafici</Text>
            <TouchableOpacity onPress={uiActions.closeChartsModal}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.exportButtonContainer}>
            <Button
              title="Esporta Immagine Grafici"
              onPress={handleTriggerChartExport}
            />
          </View>
          <ScrollView
            key={scrollViewKey}
            style={styles.modalContent}
          >
            <ChartsReportExport
              ref={chartsRef}
              problems={problemOptions}
              evaluationLog={
                chatHistory.find((c) => c.id === currentChatId)?.evaluationLog
              }
              onSaved={uiActions.closeChartsModal}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal transparent={true} visible={evaluating || exporting}>
        <View style={styles.loadingModal}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>
              {exporting ? "Esportazione in corso..." : "Generazione del report in corso..."}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Modale per la chiave API */}
      <Modal
        visible={isApiKeyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsApiKeyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.apiKeyModalContainer}>
            <Text style={styles.modalTitle}>Inserisci la tua API Key Gemini</Text>
            <TextInput
              style={styles.fileNameInput}
              placeholder="La tua API Key..."
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              secureTextEntry={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsApiKeyModalVisible(false)}
              >
                <Text>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveApiKey}
              >
                <Text style={styles.buttonText}>Salva Chiave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );

  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f8f8',
  },
  historyButton: {
    padding: 10,
  },
  historyButtonText: {
    fontSize: 16,
  },
  newChatButton: {
    padding: 10,
  },
  newChatButtonText: {
    fontSize: 16,
    color: '#2196F3',
  },
  voiceButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  voiceButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  voiceButtonText: {
    fontSize: 16,
  },
  chatContainer: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
  },
  message: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: '80%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6',
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: '#eee',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  disabledInput: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
    borderColor: '#ccc',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  evaluateButton: {
    flex: 1,
    marginRight: 5,
  },
  exportButton: {
    flex: 1,
    marginLeft: 5,
  },
  loadingModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
//...
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#000', // ✅ Aggiunto
},
closeButton: {
  fontSize: 24,
  padding: 5,
  color: '#000', // ✅ Aggiunto
},

modalContent: {
  flex: 1, // <-- RI-AGGIUNGI QUESTA RIGA FONDAMENTALE
  padding: 10,
},

  historyItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  historyItem: {
    flex: 1,
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  selectedHistoryItem: {
    backgroundColor: '#e3f2fd',
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyItemDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  deleteHistoryItem: {
    padding: 10,
  },
  deleteHistoryItemText: {
    fontSize: 16,
    color: '#F44336',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  exportModalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  fileNameInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    color: '#000', // <-- AGGIUNGI QUESTA RIGA
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
  },
  startInterviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startInterviewButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
  },
  startInterviewButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

disabledButton: {
    backgroundColor: '#BDBDBD', // Grigio per indicare che è disabilitato
    opacity: 0.7,
  },
  apiKeyWarning: {
    marginTop: 20,
    fontSize: 14,
    color: '#D32F2F', // Rosso per l'avviso
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  apiKeyModalContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    width: '90%',
    alignSelf: 'center',
    elevation: 5,
  },
  // Riusiamo lo stile modalOverlay che hai già
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    textAlign: 'center'
  },
});