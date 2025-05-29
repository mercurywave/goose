import express from "express";

const app = express();
const PORT = 1987;

app.use(express.json());
app.use(express.static("dist"));

// Example API endpoint
app.get("/api/message", (req, res) => {
    res.json({ message: "Hello from the server!" });
});

app.post("/api/models", async (req, res) => {
    let {apiUrl} = req.body;
    const url = new URL(`/openai/models`, apiUrl);
    let response = await fetch(url.href, {
        method: "GET",
    });
    
    if (!response.ok || !response.body) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    res.json(await response.json());
});

app.post("/api/chat-stream", async (req, res) => {
    res.setHeader('Content-Type', 'text/plain'); // Adjust content type as needed
    //res.removeHeader("Content-Length"); // cannot be set while chunked
    //res.setHeader('Transfer-Encoding', 'chunked'); // Enables chunked transfer

    let {apiUrl, apiKey, apiModel, messages} = req.body;
    let cancel = new AbortController();
    let result = await CallApi(apiUrl, apiKey, apiModel, messages, (delta) => {
        res.write(delta)
    } , cancel);
    //res.write(result);
    res.end();
});

async function CallApi(apiUrl, apiKey, apiModel, messages, streamer, cancel) {
    let reply = "";

    const url = new URL(`/v1/chat/completions`, apiUrl);
    
    const response = await fetch(url.href, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: apiModel,
            messages: messages,
            stream: true
        }),
        signal: cancel.signal
    });

    if (!response.ok || !response.body) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // OpenAI streams data as lines starting with "data: "
        for (const line of chunk.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const data = trimmed.replace(/^data:\s*/, "");
            if (data === "[DONE]") break;

            try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                    reply += delta;
                    streamer(delta);
                }
            } catch (e) {
                // Ignore malformed JSON lines
            }
        }
    }

    return reply;
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
