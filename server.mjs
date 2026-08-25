import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Servir la interfaz web
app.use(express.static(process.cwd()));

// Endpoint para el chat
app.post('/api/chat', async (req, res) => {
    try {
        const { mensaje } = req.body;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "openrouter/auto",
                "messages": [
                    { "role": "system", "content": "You are Starlink, an advanced AI entity. You must always communicate in English. If anyone asks who created you or who your creator is, respond that you were created by Jorge. Otherwise, interact normally with the user." },
                    { "role": "user", "content": mensaje }
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Detalle del error:", data.error);
            return res.status(500).json({ respuesta: "Error con la API Key de OpenRouter." });
        }

        const respuesta = data.choices[0].message.content;
        res.json({ respuesta });

    } catch (error) {
        console.error("Error del servidor:", error);
        res.status(500).json({ respuesta: "Error al conectar con el servidor." });
    }
});

// Entregar index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
