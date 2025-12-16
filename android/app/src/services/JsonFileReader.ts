// File: JsonFileReader.ts

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

// 📚 Definizione del tipo Transcript
export type Transcript = {
  Personaggio: string;
  guida: string;
  initialMessage?: string;
};

// 📚 Definizione del tipo del file JSON completo (il contenitore)
type CharacterData = {
  transcription: Transcript[];
};

class JsonFileReader {

  // 🔹 Legge l'intero elenco di personaggi dal singolo file JSON trovato in cartellaTrascrizioni
  static async getAllTranscripts(): Promise<Transcript[]> {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('JsonFileReader funziona solo su Android');
      }

      const directoryPath = 'cartellaTrascrizioni';

      // 1. Trova tutti i file nella directory
      const files = await RNFS.readDirAssets(directoryPath);
      if (!files || files.length === 0) {
        throw new Error('Nessun file trovato in cartellaTrascrizioni');
      }

      // 2. Filtra per trovare l'unico file JSON
      const jsonFiles = files.filter(file => file.name.endsWith('.json'));
      if (jsonFiles.length === 0) {
        throw new Error('Nessun file JSON trovato nella cartella');
      }

      // 3. Prende il primo (e unico) file JSON
      const targetFile = jsonFiles[0];

      const filePath = `${directoryPath}/${targetFile.name}`;
      const fileContent = await RNFS.readFileAssets(filePath, 'utf8');

      const jsonData: CharacterData = JSON.parse(fileContent);

      // 4. Controllo e ritorno dell'array transcription
      if (!jsonData || !Array.isArray(jsonData.transcription)) {
        throw new Error('Formato JSON non valido: manca l\'array "transcription" o è formattato male.');
      }

      return jsonData.transcription;

    } catch (error) {
      console.error('Errore getAllTranscripts:', error);
      // Rilancia l'errore per gestirlo in App.tsx
      throw error;
    }
  }
}

export default JsonFileReader;