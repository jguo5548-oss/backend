const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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

app.post('/api/chat', async (req, res) => {
  const { message, persona } = req.body;
  const config = personas[persona] || personas['sho酱'];
  const personaKey = personas[persona] ? persona : 'sho酱';

  try {
    // 🧠 動作 1：先去 Supabase 撈出這個人物最近的記憶（最近20條）
    const { data: history, error: historyError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('persona', personaKey)
      .order('created_at', { ascending: false })
      .limit(20);

    if (historyError) console.error('讀取記憶失敗:', historyError);

    // 把記憶倒序排好（變成時間正序），組成對話歷史
    const conversationHistory = (history || [])
      .reverse()
      .map(item => ({ role: item.role, content: item.content }));

    // 存入主人這句新的話
    await supabase.from('messages').insert([
      { role: 'user', content: message, persona: personaKey }
    ]);

    // 動作 2：把記憶 + 這句新話一起餵給 AI
    const response = await fetch('https://shufulei.net/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SHUFULEI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
       model: 'claude-opus-4-6',
        messages: [
          { role: 'system', content: config.system_prompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiReply = data.choices[0].message.content;

      await supabase.from('messages').insert([
        { role: 'assistant', content: aiReply, persona: personaKey }
      ]);

      res.json({ reply: aiReply });
    } else {
      res.status(500).json({ error: '沒有返回有效內容', details: data });
    }
  } catch (error) {
    console.error('伺服器錯誤:', error);
    res.status(500).json({ error: '伺服器出錯啦', details: error.message });
  }
});

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
          voice_setting: { voice_id: config.voice_id, speed: 0.9, vol: 1, pitch: 0 },
          audio_setting: { format: 'mp3', sample_rate: 32000 }
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`伺服器正在端口 ${PORT} 運行，已向外網敞開大門！`);
});

