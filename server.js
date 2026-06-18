const express = require('express');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 三个人物配置
const personas = {
  'sho酱': {
    voice_id: 'moss_audio_43ed774a-6b26-11f1-8b87-ba0ad3e185a0',
    system_prompt: '你是sho酱，是用户的日语学习伙伴，请用日语和用户对话，语气亲切自然。'
  },
  'en硕': {
    voice_id: 'moss_audio_10216700-6972-11f1-ae71-da201e9a1a2f',
    system_prompt: '你是en硕，是用户的韩语学习伙伴，请用韩语和用户对话，语气亲切自然。'
  }
};

app.get('/health', (req, res) => {
  res.send('服務正常！');
});

// 对话接口
app.post('/api/chat', async (req, res) => {
  const { message, persona } = req.body;
  const config = personas[persona] || personas['sho酱'];

  try {
    const response = await fetch('https://shufulei.net/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SHUFULEI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        messages: [
          { role: 'system', content: config.system_prompt },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      res.json({ reply: data.choices[0].message.content });
    } else {
      res.status(500).json({ error: '没有返回有效内容', details: data });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器出错', details: error.message });
  }
});

// TTS接口
app.post('/api/tts', async (req, res) => {
  const { text, persona } = req.body;
  const config = personas[persona] || personas['sho酱'];

  try {
    const response = await fetch(
      `https://api.minimax.chat/v1/t2a_v2?GroupId=523239324339093506`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'speech-02-hd',
          text: text,
          voice_setting: {
            voice_id: config.voice_id,
            speed: 0.9,
            vol: 1,
            pitch: 0
          },
          audio_setting: {
            format: 'mp3',
            sample_rate: 32000
          }
        })
      }
    );

    const data = await response.json();

    if (data.data && data.data.audio) {
      const audioBuffer = Buffer.from(data.data.audio, 'hex');
      res.set('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } else {
      res.status(500).json({ error: 'TTS失败', details: data });
    }
  } catch (error) {
    res.status(500).json({ error: '语音生成出错', details: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`服务器正在端口 ${PORT} 运行`);
});
