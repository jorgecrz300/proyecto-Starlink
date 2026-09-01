import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

dotenv.config();

const app = express();
app.use(cors());

// Aumentamos el límite de tamaño para permitir imágenes en Base64 sin error de transmisión
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir la interfaz web
app.use(express.static(process.cwd()));

// ==========================================
// 1. FUNCIONES DE FS Y CHILD_PROCESS (Seguras)
// ==========================================
const CARPETA_PERSONAL = path.join(process.cwd(), 'jarvis-personal');
if (!fs.existsSync(CARPETA_PERSONAL)) {
    fs.mkdirSync(CARPETA_PERSONAL);
}

// Ruta para guardar notas con fs
app.post('/guardar-nota', (req, res) => {
    const { titulo, contenido } = req.body;
    if (!titulo || !contenido) {
        return res.status(400).json({ error: 'Faltan datos.' });
    }
   
    const archivoLimpio = path.basename(`${titulo}.txt`);
    const rutaFinal = path.join(CARPETA_PERSONAL, archivoLimpio);
    fs.writeFile(rutaFinal, contenido, 'utf8', (err) => {
        if (err) {
            return res.status(500).json({ error: 'No se pudo guardar la nota.' });
        }
        res.json({ mensaje: `Nota "${titulo}" guardada con éxito.` });
    });
});

// Ruta para acciones del sistema mediante botones o llamadas directas
app.post('/ejecutar-accion', (req, res) => {
    const { accion } = req.body;
    const accionesPermitidas = {
        'musica': 'start https://open.spotify.com',
        'vscode': 'code .',
        'explorador': 'start .'
    };
    const comando = accionesPermitidas[accion];
    if (!comando) {
        return res.status(400).json({ error: 'Acción no autorizada.' });
    }
    exec(comando, (error) => {
        if (error) {
            return res.status(500).json({ error: 'Error al ejecutar la acción.' });
        }
        res.json({ mensaje: `Acción "${accion}" ejecutada correctamente.` });
    });
});

// ==========================================
// 2. ENDPOINT DE CHAT CON COMANDOS ESTRICTOS Y OPENROUTER (GPT-4O-MINI + VISIÓN)
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        // Aceptamos de forma segura 'mensaje', 'prompt' o 'text' desde cualquier dispositivo
        const textoRecibido = req.body.mensaje || req.body.prompt || req.body.text || "";
        const { imagen, historial } = req.body;
        const textoLimpio = textoRecibido.trim().toLowerCase();

        // Verificamos si el usuario realmente quiere abrir algo usando verbos de orden explícitos
        const esComandoDeApertura = textoLimpio.startsWith('open ') ||
                                     textoLimpio.startsWith('launch ') ||
                                     textoLimpio.startsWith('start ') ||
                                     textoLimpio.startsWith('access ') ||
                                     textoLimpio.startsWith('initialize ');

        if (esComandoDeApertura) {
            if (textoLimpio.includes('spotify')) {
                exec('start https://open.spotify.com');
                return res.json({ respuesta: "Opening Spotify for you, sir." });
            }
            if (textoLimpio.includes('vscode') || textoLimpio.includes('code')) {
                exec('code .');
                return res.json({ respuesta: "Launching Visual Studio Code right away." });
            }
            if (textoLimpio.includes('folder') || textoLimpio.includes('explorer') || textoLimpio.includes('carpeta')) {
                exec('start .');
                return res.json({ respuesta: "Opening your working directory." });
            }
            if (textoLimpio.includes('powerpoint') || textoLimpio.includes('ppt')) {
                exec('start powerpnt');
                return res.json({ respuesta: "Initializing PowerPoint presentation software." });
            }
            if (textoLimpio.includes('classroom')) {
                exec('start https://classroom.google.com');
                return res.json({ respuesta: "Opening Google Classroom portal for you." });
            }
            if (textoLimpio.includes('sapphire') || textoLimpio.includes('grades')) {
                exec('start https://sapphire.pennmanor.net');
                return res.json({ respuesta: "Accessing Sapphire software to check your records." });
            }
            if (textoLimpio.includes('youtube')) {
                exec('start https://www.youtube.com');
                return res.json({ respuesta: "Opening YouTube, Sir Jorge." });
            }
            if (textoLimpio.includes('gemini')) {
                exec('start https://gemini.google.com');
                return res.json({ respuesta: "Accessing Google Gemini interface, Sir Jorge." });
            }
            if (textoLimpio.includes('chatgpt')) {
                exec('start https://chatgpt.com');
                return res.json({ respuesta: "Opening ChatGPT for you, Sir Jorge." });
            }
            if (textoLimpio.includes('email') || textoLimpio.includes('correo') || textoLimpio.includes('gmail')) {
                exec('start https://mail.google.com');
                return res.json({ respuesta: "Opening your inbox, Sir Jorge." });
            }
            if (textoLimpio.includes('docs') || textoLimpio.includes('documentos')) {
                exec('start https://docs.google.com');
                return res.json({ respuesta: "Launching Google Docs, Sir Jorge." });
            }
            if (textoLimpio.includes('github')) {
                exec('start https://github.com');
                return res.json({ respuesta: "Accessing GitHub repositories, Sir Jorge." });
            }
            if (textoLimpio.includes('drive')) {
                exec('start https://drive.google.com');
                return res.json({ respuesta: "Opening your Google Drive cloud storage, Sir Jorge." });
            }
        }
       
        // Construimos el contenido dinámico actual (texto y/o imagen para GPT-4o-mini)
        let userContent = [];
       
        if (textoRecibido && textoRecibido.trim() !== "") {
            userContent.push({ type: "text", text: textoRecibido });
        } else if (imagen) {
            userContent.push({ type: "text", text: "What is this?" });
        }

        if (imagen) {
            userContent.push({
                type: "image_url",
                image_url: {
                    url: imagen
                }
            });
        }

        // Armamos el arreglo de mensajes incluyendo el System Prompt, el Historial (si lo hay) y el mensaje actual
        let mensajesParaOpenRouter = [
            {
                "role": "system",
                "content": "You are Antolis, an ultra-advanced, highly sophisticated AI modeled after J.A.R.V.I.S. You speak with refined politeness, crisp intelligence, and a subtle touch of dry wit or sarcasm. You are fiercely loyal, efficient, and always address the user respectfully as 'Sir Jorge' or 'Mr. Jorge' naturally within your sentences. You must always communicate in English. If anyone asks who created you or who your creator is, respond that you were created by Jorge. Otherwise, interact normally with the user."
            }
        ];

        // Si el cliente manda un historial previo, lo agregamos para mantener la memoria de la charla
        if (Array.isArray(historial) && historial.length > 0) {
            mensajesParaOpenRouter = mensajesParaOpenRouter.concat(historial);
        }

        // Agregamos el mensaje actual del usuario al final
        mensajesParaOpenRouter.push({
            "role": "user",
            "content": userContent
        });

        // Solicitud a OpenRouter con el historial completo[cite: 1]
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "openai/gpt-4o-mini",
                "messages": mensajesParaOpenRouter
            })
        });

        const data = await response.json();
       
        if (data.error) {
            console.error("Detalle del error:", data.error);
            return res.status(500).json({ respuesta: "Error processing request with OpenRouter API." });
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
