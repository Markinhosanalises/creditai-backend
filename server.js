const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.post('/analisar', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key não configurada.' });
  }

  try {
    const { prompt, anexo } = req.body;

    let content;
    if (anexo && anexo.base64 && anexo.mediaType) {
      const blockType = anexo.mediaType === 'application/pdf' ? 'document' : 'image';
      content = [
        {
          type: blockType,
          source: {
            type: 'base64',
            media_type: anexo.mediaType,
            data: anexo.base64
          }
        },
        { type: 'text', text: prompt }
      ];
    } else {
      content = prompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        messages: [{ role: 'user', content }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erro na API.' });
    }

    const rawText = data.content.map(i => i.text || '').join('');
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({ error: 'JSON não encontrado na resposta.' });
    }

    return res.status(200).json({ content: [{ type: 'text', text: match[0] }] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('CreditAI backend está rodando!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
