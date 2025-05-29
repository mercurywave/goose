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
        try{
            let response = await fetch('/api/chat-stream', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    apiUrl: this.apiUrl,
                    apiKey: this.apiKey,
                    apiModel: this.apiModel,
                    messages: messages,
                }),
                signal: cancel.signal,
            });
            
            if(!response.ok) { throw 'Error communicating with web server'; }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let reply = "";
            while (true) {
                const { done, value } = await reader.read();
                let formattedValue = decoder.decode(value);
                if (done) break;    
                reply += formattedValue;
                streamer(reply);
            }
            return reply;
        } catch(e) {console.log(e);}  
        return "";
    }

    public async GetModels(): Promise<string[]> {
        let response = await fetch('/api/models', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                apiUrl: this.apiUrl,
            }),
        });
        if(!response.ok || !response.body) {
            throw `Error in model list retrieval: ${response.status} ${response.statusText}`;
        }
        const models = await response.json();
        return models as string[];
    }
}


export interface AiMessage {
    role: MessageRole
    content: string
}

export var AI: AIManager = new AIManager();