const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); // Para llamadas HTTP

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
    const query = req.body.queryResult.queryText; 

    try {
        const response = await axios.get('https://visualvoices.ovh/data');
        const apiData = response.data;

        res.json({
            fulfillmentText: `Aquí tienes la información que encontré: ${apiData.something}`,
        });
    } catch (error) {
        res.json({
            fulfillmentText: 'Lo siento, no pude obtener la información en este momento.',
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.post('/webhook', async (req, res) => {
    const intentName = req.body.queryResult.intent.displayName;

    if (intentName === "Buscar Asociaciones") {
        const ciudad = req.body.queryResult.parameters.ciudad;
        const asociaciones = await axios.get(`http://visualvoices.ovh/asociaciones?ciudad=${ciudad}`);
        const respuesta = asociaciones.data.mensaje || asociaciones.data.map(a => `${a.nombre} en ${a.direccion}`).join(", ");
        res.json({ fulfillmentText: `Encontré lo siguiente: ${respuesta}` });
    } else if (intentName === "Consulta General") {
        const pregunta = req.body.queryResult.queryText;
        const consulta = await axios.post('http://visualvoices.ovh/consultas', { pregunta });
        res.json({ fulfillmentText: consulta.data.respuesta });
    } else {
        res.json({ fulfillmentText: "Lo siento, no tengo una respuesta para eso." });
    }
});