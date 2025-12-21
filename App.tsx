// App.tsx
import JsonFileReader, { Transcript } from './android/app/src/services/JsonFileReader';
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
   Dimensions// Aggiunto per la lista dei personaggi
} from 'react-native';

import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Message = {
  role: 'user' | 'bot';
  text: string;
  // 💡 Aggiunto per identificare il messaggio "sta scrivendo..."
  temporary?: boolean;
};
type SavedChat = {
  id: string;
  characterName: string;
  date: string;
  preview: string;
  messages: Message[];
};
type Screen = 'home' | 'chat' | 'selectCharacter' | 'reviewHistory';

// 🤖 MODELLO GEMINI DA UTILIZZARE
const GEMINI_MODEL = 'gemini-2.5-flash';

export default function App() {
    const [currentCharacter, setCurrentCharacter] = useState<Transcript | null>(null);
      const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
      const [isHistorySidebarVisible, setIsHistorySidebarVisible] = useState(false);
      const [selectedHistoryChat, setSelectedHistoryChat] = useState<SavedChat | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState<ChatSession | null>(null);
  const [testingKey, setTestingKey] = useState(false);

  // 🎭 STATO PER I PERSONAGGI
  const [characters, setCharacters] = useState<Transcript[]>([]);

  // 🔹 Stati per la gestione API Key
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [storedApiKey, setStoredApiKey] = useState<string | null>(null);

  // 🔹 Caricamento iniziale della Key e dei Personaggi
  useEffect(() => {
      const loadHistory = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('chatHistory');
          if (jsonValue != null) setSavedChats(JSON.parse(jsonValue));
        } catch (e) { console.error(e); }
      };
      loadHistory();
    }, []);
  useEffect(() => {
    const loadData = async () => {
      // 1. Carica la Chiave API
      try {
        const key = await AsyncStorage.getItem('geminiApiKey');
        if (key) {
          setStoredApiKey(key);
          setApiKeyInput(key);
        }
      } catch (error) {
        console.error("Impossibile caricare la chiave API:", error);
      }

      // 2. Carica la lista dei personaggi
      try {
        const characterList = await JsonFileReader.getAllTranscripts();
        setCharacters(characterList);
      } catch (error) {
        console.error("Impossibile caricare i personaggi:", error);
        Alert.alert('Errore JSON', 'Impossibile leggere la lista dei personaggi dal JSON.');
      }
    };
    loadData();
  }, []);
const saveChatToHistory = async () => {
    if (messages.length === 0 || !currentCharacter) return;

    const newChat: SavedChat = {
      id: Date.now().toString(),
      characterName: currentCharacter.Personaggio,
      date: new Date().toLocaleString(),
      preview: messages[messages.length - 1].text.substring(0, 30) + '...',
      messages: messages,
    };

    const updatedHistory = [newChat, ...savedChats];
    setSavedChats(updatedHistory);
    await AsyncStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
  };

  // 🔹 Elimina una chat dalla cronologia
  const deleteHistoryItem = async (id: string) => {
    const updatedHistory = savedChats.filter(chat => chat.id !== id);
    setSavedChats(updatedHistory);
    await AsyncStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
  };
  // 🔹 Salvataggio API Key (omesso per brevità, resta invariato)
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('Attenzione', 'La chiave API non può essere vuota.');
      return;
    }
    try {
      await AsyncStorage.setItem('geminiApiKey', apiKeyInput);
      setStoredApiKey(apiKeyInput);
      setIsApiKeyModalVisible(false);
      Alert.alert('Successo', 'Chiave API salvata correttamente.');
    } catch (error) {
      console.error("Impossibile salvare la chiave API:", error);
      Alert.alert('Errore', 'Non è stato possibile salvare la chiave API.');
    }
  };

  // 🔑 FUNZIONE PER TESTARE LA CHIAVE API (omesso per brevità, resta invariato)
  const handleTestApiKey = async () => {
    if (!storedApiKey) {
      Alert.alert("Errore", "Chiave API mancante. Impostala prima di testare.");
      return;
    }

    setTestingKey(true);

    try {
      const genAI = new GoogleGenerativeAI(storedApiKey);
      const testModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const result = await testModel.generateContent("Say 'OK'");

      const responseText = result.response.text;

      if (typeof responseText === 'string' && responseText.trim().includes('OK')) {
         Alert.alert('Test Superato', 'La chiave API è valida e l\'accesso è OK!');
      } else {
         throw new Error(`Risposta inattesa dal modello: ${responseText}`);
      }

    } catch (error) {
      console.error("ERRORE TEST API KEY:", error);
      let errorMessage = 'Chiave non valida o errore di connessione.';

      const errorMsg = (error as any).message || '';

      if (errorMsg.includes('400') || errorMsg.includes('403') || errorMsg.includes('API_KEY_INVALID')) {
          errorMessage = 'Chiave API non valida. Controlla che sia corretta e abilitata su Google AI Studio.';
      } else if (errorMsg.includes('Risposta inattesa')) {
          errorMessage = `Il modello ha risposto in modo inatteso. Dettagli: ${errorMsg}`;
      } else {
          errorMessage = `Si è verificato un errore generico. Dettagli: ${errorMsg}`;
      }

      Alert.alert('Test Fallito', errorMessage);

    } finally {
      setTestingKey(false);
    }
  };


  // 🔹 Avvio chat con un personaggio specifico
  const startChat = async (transcript: Transcript) => {
          setCurrentCharacter(transcript); // <--- AGGIUNGI QUESTA RIGA
    if (!storedApiKey) {
      Alert.alert("Errore", "Chiave API mancante.");
      return;
    }

    setLoading(true);

    try {
      setScreen('chat');

      const systemPrompt = buildSystemPrompt(transcript);

      const genAI = new GoogleGenerativeAI(storedApiKey);

      // 1. Istanzia il modello con le istruzioni di sistema
      const modelInstance = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemPrompt,
      });

      // 2. AVVIA LA SESSIONE DI CHAT (Questa è la parte fondamentale!)
      const chatSession = modelInstance.startChat({
        history: [], // La storia inizia vuota, si riempirà man mano
      });

      // 3. Salviamo la SESSIONE, non il modello generico
      setModel(chatSession);

      // Usa initialMessage se presente
      const initialMessageText =
        (transcript.initialMessage && typeof transcript.initialMessage === 'string')
        ? transcript.initialMessage
        : `Ciao! Sono pronto per l'intervista. Cominciamo! (Sto impersonando ${transcript.Personaggio})`;

      // Aggiorna solo la UI locale (React)
      setMessages([{ role: 'bot', text: initialMessageText }]);

    } catch (error) {
      console.error("ERRORE START CHAT:", error);
      setScreen('home');
      Alert.alert(
        'Errore di Caricamento Chat',
        `Impossibile avviare la chat. Dettagli: ${error instanceof Error ? error.message : 'Errore sconosciuto.'}`
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Gestisce il click sul pulsante "Avvia Intervista"
  const handleStartInterviewClick = () => {
    if (!storedApiKey) {
      Alert.alert("Errore", "Chiave API mancante.");
      return;
    }
    if (characters.length === 0) {
      Alert.alert("Errore", "Nessun personaggio caricato. Controlla il file JSON.");
      return;
    }
    // Passa alla schermata di selezione personaggio
    setScreen('selectCharacter');
  }

  // 🔹 Funzione per tornare alla Home (Resetta la chat)
  const handleGoHome = () => {
      Alert.alert(
        "Chiudi Chat",
        "Vuoi salvare questa conversazione nella cronologia?",
        [
          {
            text: "No, Esci",
            style: "destructive",
            onPress: () => {
              setMessages([]);
              setScreen('home');
            }
          },
          {
            text: "Sì, Salva ed Esci",
            onPress: async () => {
              await saveChatToHistory();
              setMessages([]);
              setScreen('home');
            }
          }
        ]
      );
    };

  // 🔹 Costruzione prompt - Usa 'guida' come prompt di sistema
  const buildSystemPrompt = (transcript: Transcript): string => {
    if (!transcript || typeof transcript.guida !== 'string') {
        return `Sei un intervistatore, il tuo nome è ${transcript.Personaggio}. Rispondi sempre e solo con la personalità definita.`;
    }
    // Qui usiamo direttamente la stringa 'guida' contenuta nell'oggetto Transcript
    return transcript.guida;
  };

  // 🔹 Invio messaggio (Invariato)
// 🔹 Invio messaggio
const sendMessage = async () => {
  if (!input.trim() || !model) return; // 'model' qui è in realtà la chatSession

  const userText = input.trim();
  setInput('');
  setSending(true);

  // UI Update: Utente
  setMessages(prev => [...prev, { role: 'user', text: userText }]);
  // UI Update: Bot sta scrivendo...
  setMessages(prev => [...prev, { role: 'bot', text: 'sta scrivendo...', temporary: true }]);

  try {
    // 🔴 CAMBIAMENTO QUI: Usa .sendMessage() invece di .generateContent()
    // Questo metodo invia il messaggio E mantiene la storia della conversazione.
    const result = await model.sendMessage(userText);

    const reply = result.response.text();

    if (typeof reply === 'string' && reply.trim().length > 0) {
      setMessages(prev => {
        const updatedMessages = prev.filter(msg => !msg.temporary);
        return [...updatedMessages, { role: 'bot', text: reply }];
      });
    } else {
      setMessages(prev => prev.filter(msg => !msg.temporary));
      Alert.alert('Errore', 'Il chatbot non ha fornito una risposta valida.');
    }

  } catch (error) {
    setMessages(prev => prev.filter(msg => !msg.temporary));
    console.error(error);
    Alert.alert('Errore', 'Errore nella risposta del chatbot.');
  } finally {
    setSending(false);
  }
};

  // 🔹 HOME SCREEN
  if (screen === 'home') {
      const isActionDisabled = loading || testingKey;

      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <Text style={styles.title}>IntervistAI</Text>

            {/* STATO API KEY */}
            {storedApiKey ? (
              <Text style={styles.keyStatusText}>
                Chiave API salvata: **{storedApiKey.substring(0, 5)}...**
              </Text>
            ) : (
              <Text style={styles.keyStatusTextMissing}>
                Nessuna Chiave API salvata
              </Text>
            )}

            {/* BOTTONE GESTIONE API KEY */}
            <TouchableOpacity
              style={[styles.button, styles.apiKeyButton]}
              onPress={() => setIsApiKeyModalVisible(true)}
              disabled={isActionDisabled}
            >
              <Text style={styles.buttonText}>🔑 Imposta/Modifica API Key</Text>
            </TouchableOpacity>

            {/* BOTTONE TEST API KEY */}
            {storedApiKey && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.testButton,
                  isActionDisabled && styles.disabledButton
                ]}
                onPress={handleTestApiKey}
                disabled={isActionDisabled}
              >
                {testingKey ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>✅ Test API Key</Text>
                )}
              </TouchableOpacity>
            )}

            {/* BOTTONE AVVIA INTERVISTA */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.startButton,
                (!storedApiKey || isActionDisabled || characters.length === 0) && styles.disabledButton
              ]}
              onPress={handleStartInterviewClick}
              disabled={!storedApiKey || isActionDisabled || characters.length === 0}
            >
              <Text style={styles.buttonText}>Avvia intervista ({characters.length})</Text>
            </TouchableOpacity>

            {/* 🆕 NUOVO BOTTONE: CRONOLOGIA */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: '#FF9800', marginTop: 10 } // Arancione
              ]}
              onPress={() => setIsHistorySidebarVisible(true)}
            >
              <Text style={styles.buttonText}>📚 Cronologia Chat</Text>
            </TouchableOpacity>


            {/* Messaggi di errore o caricamento */}
            {characters.length === 0 && (
              <Text style={styles.warningText}>Caricamento personaggi fallito o lista vuota.</Text>
            )}
            {loading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />}


            {/* ---------------- MODALI ---------------- */}

            {/* 1. MODALE API KEY (Quella originale) */}
            <Modal
              visible={isApiKeyModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsApiKeyModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.apiKeyModalContainer}>
                  <Text style={styles.modalTitle}>Inserisci/Visualizza la tua API Key Gemini</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="La tua API Key..."
                    placeholderTextColor="#999"
                    value={apiKeyInput}
                    onChangeText={setApiKeyInput}
                    secureTextEntry={false}
                  />
                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setIsApiKeyModalVisible(false)}
                    >
                      <Text style={styles.modalButtonTextBlack}>Annulla</Text>
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

            {/* 2. 🆕 MODALE SIDEBAR CRONOLOGIA (Nuova) */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={isHistorySidebarVisible}
              onRequestClose={() => setIsHistorySidebarVisible(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' }}>
                {/* Contenitore Bianco Laterale (Sidebar) - Larghezza 80% */}
                <View style={{ width: '80%', height: '100%', backgroundColor: '#fff', padding: 20, elevation: 5 }}>

                  <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' }}>
                    🗄️ Le tue Chat
                  </Text>

                  {savedChats.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>Nessuna chat salvata.</Text>
                  ) : (
                    <FlatList
                      data={savedChats}
                      keyExtractor={item => item.id}
                      renderItem={({item}) => (
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 15,
                          borderBottomWidth: 1,
                          borderColor: '#eee'
                        }}>
                          {/* Clicca sul testo per aprire la chat */}
                          <TouchableOpacity
                            style={{ flex: 1, marginRight: 10 }}
                            onPress={() => {
                              setSelectedHistoryChat(item);
                              setIsHistorySidebarVisible(false); // Chiudi modale
                              setScreen('reviewHistory');        // Vai alla schermata
                            }}
                          >
                            <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#000' }}>{item.characterName}</Text>
                            <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{item.date}</Text>
                            <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }} numberOfLines={1}>
                              {item.preview}
                            </Text>
                          </TouchableOpacity>

                          {/* Clicca sul cestino per cancellare */}
                          <TouchableOpacity onPress={() => deleteHistoryItem(item.id)} style={{ padding: 5 }}>
                            <Text style={{ fontSize: 20 }}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  )}

                  <Button title="Chiudi Menu" onPress={() => setIsHistorySidebarVisible(false)} />
                </View>

                {/* Area trasparente a destra per chiudere cliccando fuori */}
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => setIsHistorySidebarVisible(false)}
                />
              </View>
            </Modal>

          </View>
        </SafeAreaView>
      );
    }

    // 🔹 REVIEW HISTORY SCREEN (Solo lettura)
    if (screen === 'reviewHistory' && selectedHistoryChat) {
      return (
        <SafeAreaView style={styles.container}>
          {/* Header con sfondo diverso per far capire che è uno storico */}
          <View style={[styles.header, { backgroundColor: '#FFF8E1' }]}>
            <TouchableOpacity onPress={() => setScreen('home')} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>🏠 Home</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Storico: {selectedHistoryChat.characterName}</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.chat} contentContainerStyle={{ padding: 16 }}>
            {selectedHistoryChat.messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.message,
                  msg.role === 'user' ? styles.user : styles.bot,
                ]}
              >
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            ))}
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 20, marginBottom: 40, fontStyle: 'italic' }}>
              --- Fine della Cronologia ---
            </Text>
          </ScrollView>
        </SafeAreaView>
      );
    }

  // 🔹 SELECT CHARACTER SCREEN
  if (screen === 'selectCharacter') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => setScreen('home')} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>🔙 Indietro</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Seleziona Personaggio</Text>
            <View style={{ width: 50 }} />
        </View>

        <FlatList
          data={characters}
          keyExtractor={(item) => item.Personaggio}
          contentContainerStyle={styles.characterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.characterButton}
              onPress={() => startChat(item)}
              disabled={loading}
            >
              <Text style={styles.characterButtonText}>{item.Personaggio}</Text>
            </TouchableOpacity>
          )}
        />
        {loading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />}
      </SafeAreaView>
    );
  }

  // 🔹 CHAT SCREEN
  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER DELLA CHAT con pulsante Home */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoHome} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>🏠 Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Intervista in corso</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.chat} contentContainerStyle={{ padding: 16 }}>
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.message,
              msg.role === 'user' ? styles.user : styles.bot,
            ]}
          >
            <Text style={styles.messageText}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Scrivi un messaggio..."
          placeholderTextColor="#999"
          style={styles.input}
          editable={!sending}
        />
        <Button title="Invia" onPress={sendMessage} disabled={sending} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Header Chat & Select
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerButton: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  headerButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },

  // Stili Home
  title: {
    fontSize: 28,
    marginBottom: 20,
    color: '#000',
    fontWeight: 'bold',
  },
  keyStatusText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 30,
    fontWeight: 'bold',
  },
  keyStatusTextMissing: {
    fontSize: 14,
    color: '#D32F2F',
    marginBottom: 30,
    fontWeight: 'bold',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  apiKeyButton: {
    backgroundColor: '#607D8B',
  },
  testButton: {
    backgroundColor: '#FF9800',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningText: {
    color: '#D32F2F',
    marginTop: 10,
    textAlign: 'center'
  },

  // Stili Selezione Personaggio
  characterList: {
    padding: 20,
  },
  characterButton: {
    padding: 15,
    backgroundColor: '#3F51B5',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
  },
  characterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Stili Chat
  chat: { flex: 1 },
  message: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '85%',
  },
  messageText: {
    color: '#000',
    fontSize: 16,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEEEEE',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    color: '#000',
    height: 40,
  },

  // Modale
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  apiKeyModalContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    width: '90%',
    alignSelf: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    textAlign: 'center'
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    color: '#000',
    fontSize: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonTextBlack: {
    color: '#000',
    fontWeight: 'bold',
  },
});