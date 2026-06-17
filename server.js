import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const FOLDER_ID = process.env.YANDEX_FOLDER_ID; 

app.post('/api/beautify', async (req, res) => {
  const { text } = req.body;

  if (!text || text.length < 10) {
    return res.status(400).json({ error: 'Текст слишком короткий (минимум 10 символов)' });
  }

  try {
    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${YANDEX_API_KEY}`,
        'x-folder-id': FOLDER_ID,
      },
      body: JSON.stringify({
        modelUri: `gpt://${FOLDER_ID}/yandexgpt-lite`,
        completionOptions: {
          stream: false,
          temperature: 0.6,
          maxTokens: 350,
        },
        messages: [
          {
            role: 'system',
            text: 'Ты — литературный редактор. Превращай дневниковые записи в красивую, образную прозу. Сохраняй смысл. Не добавляй выдуманных событий. Пиши на русском. Длина — не более 350 символов. Отвечай только готовым текстом, без пояснений и кавычек.'
          },
          {
            role: 'user',
            text: `Оригинал: «${text}»`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('YandexGPT API error:', errorData);
      throw new Error(errorData.message || 'Ошибка YandexGPT API');
    }

    const data = await response.json();
    const beautiful = data.result.alternatives[0].message.text.trim();

    res.json({ beautiful });

  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Не удалось обработать запись' });
  }
});

app.post('/api/speech', async (req, res) => {
  const { text } = req.body;

  if (!text || text.length < 5) {
    return res.status(400).json({ error: 'Текст слишком короткий' });
  }

  try {
    const response = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${YANDEX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        lang: 'ru-RU',
        voice: 'alena',
        emotion: 'neutral',
        speed: 1.0,
        format: 'lpcm',
        sampleRateHertz: 48000,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SpeechKit error:', error);
      throw new Error('Ошибка синтеза речи');
    }

    const audioBuffer = await response.arrayBuffer();

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.byteLength,
    });
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('Speech error:', error);
    res.status(500).json({ error: 'Не удалось синтезировать речь' });
  }
});

app.get('/', (req, res) => {
  res.send('Сервер работает. Используйте POST /api/beautify');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});