import { Chat, MessageRole } from "./db";
import { AsyncCriticalSection } from "./util";

export class AIManager{
    _queue: AsyncCriticalSection = new AsyncCriticalSection();
    public apiUrl: string = "";
    public apiKey: string = "";
    public apiModel: string = "phi-3.5-mini";

    public async QueueChat(chat: Chat, streamer: (reply:string) => void, cancel: AbortController): Promise<string>{
        const messages: AiMessage[] = chat.messages.map(msg => ({
            role: msg.type,
            content: msg.text
        }));

        return await this.QueueStream(messages, streamer, cancel);
    }

    public async QueueStream(messages: AiMessage[], streamer: (reply:string) => void, cancel: AbortController): Promise<string> {
        return await this._queue.runInCriticalSection(() => {
            return this.CallApi(messages, streamer, cancel);
        });
    }

    async CallApi(messages: AiMessage[], streamer: (reply: string) => void, cancel: AbortController): Promise<string> {
        console.log(this.apiUrl);
        let reply = "";

        try{
            const url = new URL(`/v1/chat/completions`, this.apiUrl);
            const apiKey = this.apiKey;
            
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: this.apiModel,
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
                console.log("...");
                const { done, value } = await reader.read();
                console.log(value);
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
                            streamer(reply);
                        }
                    } catch (e) {
                        // Ignore malformed JSON lines
                    }
                }
            }
        }
        catch(e) {console.log(e);}

        return reply;
    }
}


export interface AiMessage {
    role: MessageRole
    content: string
}

export var AI: AIManager = new AIManager();