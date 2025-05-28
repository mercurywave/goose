import { Chat } from "./db";
import { util } from "./util";

export class ChatPreview extends HTMLElement {
    static _tmplt = util.mkTmplt(/* html */`
        <div class="chat">
            <div class="date"></div>
            <div class="summary"></div>
        </div>
        <style>
            .chat {
                width: calc(95% - 16px);
                padding: 8px;
                margin: 6px 0 ;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 10pt;
                border-radius: 11px;
                border: 0;
                outline: 1px solid #FEE0E0;
                border-radius: 11px;
                resize: none;
                overflow: hidden;
                cursor: pointer;
            }
            .chat:hover{
                outline: 1px solid #FAA4A4;
            }
            .chat.selected{
                outline: 1px solid #cb8079;
                background-color:#fef6f6;
            }
            .summary{
                overflow: hidden;
                text-overflow: ellipsis;
            }
        </style>
    `);

    
    __chat: Chat;
    __container: HTMLDivElement;
    __date: HTMLDivElement;
    __summary: HTMLDivElement;
    public get chat(): Chat { return this.__chat; }
    public get type(): string { return this.__chat.template; }
    public get selected(): boolean { return this.__container.classList.contains("selected"); }
    public set selected(selected: boolean) { util.ToggleClassIf(this.__container, "selected", selected); }
    constructor(chat: Chat){
        super();
        this.__chat = chat;
        const shadow = this.attachShadow({mode: "open"});
        shadow.append(ChatPreview._tmplt.content.cloneNode(true));
    }
    
    connectedCallback(){
        this.__container = this.shadowRoot!.querySelector(".chat")!;
        this.__date = this.shadowRoot!.querySelector(".date")!;
        this.__summary = this.shadowRoot!.querySelector(".summary")!;
        this.update();
    }
    attributeChangedCallback(){
    }

    public update(){
        let cht = this.__chat;
        this.__date.innerText = ChatPreview.DispDate(cht.creationIso);
        if(cht.messages.length > 0){
            let text = cht.summary ?? cht.messages[cht.messages.length - 1].text;
            text = text.split('\n').slice(0,3).join(' ');
            this.__summary.innerText = util.ellipsize(text, 40);
        }
    }

    static DispDate(str: string): string{
        const date = new Date(str);
        const now = new Date();
        let year = "";
        if(date.getFullYear() != now.getFullYear())
            year = `${date.getFullYear()}-`;
        const fmtDay = `${year}${(date.getMonth() + 1).toString()
            .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
        const fmtTime = `${date.getHours().toString().padStart(2, "0")}:${date
            .getMinutes().toString().padStart(2, "0")}`
        return `${fmtDay} ${fmtTime}`
    }

    public CheckSelectFromChat(chat:Chat){
        this.selected = (this.__chat == chat);
    }
}
customElements.define("chat-preview", ChatPreview);