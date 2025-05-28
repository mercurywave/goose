import { AI } from "./ai";
import { Chat, DB, Message, MessageRole } from "./db";
import { util } from "./util";

export class ChatPanel extends HTMLElement {
    static _tmplt = util.mkTmplt(/* html */`
        <div class="chatPanel">
        </div>
        <style>
            .chatPanel{
                width: 100%;
            }
        </style>
    `);

    
    __chat: Chat;
    __panel: HTMLDivElement;
    public __dirty: boolean = false;
    public get chat(): Chat { return this.__chat; }
    public get type(): string { return this.__chat.template; }
    constructor(chat: Chat){
        super();
        this.__chat = chat;
        const shadow = this.attachShadow({mode: "open"});
        shadow.append(ChatPanel._tmplt.content.cloneNode(true));
    }
    
    connectedCallback(){
        this.__panel = this.shadowRoot.querySelector(".chatPanel");
        for (const message of this.__chat.messages) {
            let bubble = new ChatMessage(this, message);
            this.__panel.appendChild(bubble);
            bubble.focusOnText();
        }
    }
    attributeChangedCallback(name, oldValue, newValue){
    }

    public AddMessage(type: MessageRole, text?: string, isPending?: boolean): ChatMessage{
        let msg = DB.CreateMessage(type, text, isPending);
        this.__chat.messages.push(msg);
        let bubble = new ChatMessage(this, msg);
        this.__panel.appendChild(bubble);
        return bubble;
    }

    public Save() {
        if(this.__dirty){
            console.log(this.__chat);
            //DB.SaveChat(this.__chat);
        }
    }

    public async RunPrompt(): Promise<void>{
        let bubble = this.AddMessage("assistant", "...", true);
        bubble.focusOnStop();

        let cancel = new AbortController();
        let job = AI.QueueChat(this.__chat, (reply) => {bubble.value = reply;}, cancel);
        bubble.__btStop.addEventListener("click", () => { cancel.abort() });
        try{
            bubble.value = await job;
        } catch(e) { }

        bubble.Finalize();
        
        let next = this.AddMessage("user", "", true);
        next.focusOnText();
    }

    public async RunNoteSummary(msg: ChatMessage): Promise<void>{
        let bubble = this.AddMessage("assistant", "...", true);
        bubble.focusOnStop();

        let cancel = new AbortController();
        let job = AI.QueueChat(this.__chat, (reply) => {bubble.value = reply;}, cancel);
        bubble.__btStop.addEventListener("click", () => { cancel.abort() });

        try{
            bubble.value = await job;
        } catch(e) { }

        bubble.Finalize();
        
        let next = this.AddMessage("user", "", true);
        next.focusOnText();
    }
}



export class ChatMessage extends HTMLElement {
    static _tmplt = util.mkTmplt(/* html */`
        <div class="container">
            <div class="bubbleWrap">
                <textarea class="bubble" rows="1"></textarea>
            </div>
            <button class="btStop nodisp" role="button">Stop</button>
        </div>
        <style>
            .bubbleWrap{
                width: 100%;
                margin: 6px 4px;
                display: grid;
            }
            .bubbleWrap::after{
                padding: 8px;
                content: attr(data-replicated-value) " ";
                white-space: pre-wrap;
                visibility: hidden;
            }
            .bubbleWrap > textarea,
            .bubbleWrap::after {
                font: inherit;

                /* Place on top of each other */
                grid-area: 1 / 1 / 2 / 2;
            }
            .bubble {
                padding: 8px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                border-radius: 11px;
                border: 0;
                outline: 1px solid #FEE0E0;
                border-radius: 11px;
                box-shadow: 0;
                resize: none;
                overflow: hidden;
            }
            .bubble:focus{
                outline: 1px solid #D33A2C !important;
                background-color: #fff !important;
                color: #000  !important;
            }
            .bubble.pending{
                outline: 1px solid rgb(222, 173, 169);
                background-color: #fff !important;
                color: #000 !important;
            }

            .user {
                width: 80%;
                float: right;
            }
            .user .bubble {
                background-color: #521611;
                color: #FFFFFF;
            }

            .note {
                width: calc(100% - 8px);
                float: right;
            }
            .note .bubble {
                background-color: #521611;
                color: #FFFFFF;
            }

            .ai {
                width: 80%;
                float: left;
            }
            .ai .bubble {
                background-color: #FFE7E7;
            }
            
            .btStop{
                float: left;
                margin: 6px 4px;
                padding: 4px 8px;
                border-radius: 11px;
            }
            .nodisp{ display: none; }
        </style>
    `);


    __panel: ChatPanel;
    __message: Message;
    __bubble: HTMLTextAreaElement;
    public __btStop: HTMLButtonElement;
    __wrap: HTMLDivElement;
    public get type(): string { return this.__message.type; }
    public get isPending(): boolean { return this.__message.isPending; }
    constructor(chat: ChatPanel, message: Message){
        super();
        this.__panel = chat;
        this.__message = message;
        const shadow = this.attachShadow({mode: "open"});
        shadow.append(ChatMessage._tmplt.content.cloneNode(true));
    }
    
    connectedCallback(){
        this.__bubble = this.shadowRoot.querySelector(".bubble");
        this.__btStop = this.shadowRoot.querySelector(".btStop");
        this.__wrap = this.shadowRoot.querySelector(".bubbleWrap") as any;
        this.__wrap.classList.add(ChatMessage.getClass(this.__panel.__chat, this.__message));
        this.__bubble.addEventListener("input", () => {
            // this is a clever hack to fill the wrapper to the same size
            // this makes the textarea expand to fill available space
            this.__wrap.dataset.replicatedValue = this.__bubble.value;
            this.__message.text = this.__bubble.value;
            this.__panel.__dirty = true;
        });
        this.value = this.__message.text;
        this.__bubble.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                if(this.type == "user" && this.isPending && !e.ctrlKey){
                    this.Finalize();
                    this.__panel.RunPrompt();
                    e.preventDefault();
                }
            }
        });
        this.update();
    }
    attributeChangedCallback(name, oldValue, newValue){
    }

    static getClass(chat: Chat, message: Message): string{
        switch(message.type){
            case "tool": 
            case "system": 
            case "assistant": 
                return "ai";
            case "user":
                return "user";
        }
        return message.type;
    }

    public focusOnStop() { this.__btStop.focus(); }
    public focusOnText() { this.__bubble.focus(); }

    public set value(val: string) { 
        this.__bubble.value = val; 
        this.__message.text = val;
        this.__wrap.dataset.replicatedValue = val;
    }

    public Finalize(){
        this.__message.isPending = false;
        this.__panel.Save();
        this.update();
    }

    save() { this.__panel.Save(); }

    update(){
        const isPending = this.__message.isPending;
        const type = this.__message.type;
        util.ToggleClassIf(this.__btStop, "nodisp", type != "assistant" || !isPending);
        util.ToggleClassIf(this.__bubble, "pending", isPending);
    }
}

customElements.define("chat-panel", ChatPanel);
customElements.define("chat-message", ChatMessage);