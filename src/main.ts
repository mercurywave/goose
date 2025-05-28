import { AI } from './ai';
import { ChatPanel } from './chat panel';
import { ChatPreview } from './chat preview';
import { DB, type Chat } from './db';
import './style.css'

fetch("/api/message")
  .then((res) => res.json())
  .then((data) => console.log(data.message));

let _activePanel: ChatPanel | null = null;
let _previewPane: HTMLDivElement | null = null;

initUi();
setup();

function initUi(){
    _previewPane = document.querySelector("#previews");
    let btAdd = document.querySelector(`#btChat`);
    btAdd!.addEventListener("click", () => {
        addChat("");
    });
    initApiConfigFields();
}

// Populates API config fields from localStorage and attaches change listeners
function initApiConfigFields() {
    const apiUrl = document.getElementById("apiUrl") as HTMLInputElement;
    const apiKey = document.getElementById("apiKey") as HTMLInputElement;
    const modelSelect = document.getElementById("modelSelect") as HTMLInputElement;
    
    apiUrl.addEventListener("input", () => {
        localStorage.setItem("apiUrl", apiUrl.value);
        AI.apiUrl = apiUrl.value;
    });
    apiKey.addEventListener("input", () => {
        localStorage.setItem("apiKey", apiKey.value);
        AI.apiKey = apiKey.value;
    });
    modelSelect.addEventListener("change", () => {
        localStorage.setItem("modelSelect", modelSelect.value);
        AI.apiModel = modelSelect.value;
    });

    // Load from localStorage
    apiUrl.value = localStorage.getItem("apiUrl") || "";
    apiKey.value = localStorage.getItem("apiKey") || "";
    modelSelect.value = localStorage.getItem("modelSelect") || "phi-4-mini";
    
    AI.apiUrl = apiUrl.value;
    AI.apiKey = apiKey.value;
    AI.apiModel = modelSelect.value;

}

async function setup(){
    await DB.Init();
    addChat("");
}

function addChat(template: string){
    let activeChat = DB.CreateChat(template);
    addChatPreview(activeChat);
    switchToChat(activeChat);
}

function switchToChat(chat: Chat){
    if(_activePanel != null){
        let prev = _activePanel.chat;
        if(prev.summary == ""){
            queueSummary(_activePanel.chat);
        }
    }
    _activePanel = new ChatPanel(chat);
    const divChat = document.getElementById("chatContainer") as HTMLDivElement;
    divChat.innerHTML = '';
    divChat.appendChild(_activePanel);
    for(const card of document.querySelectorAll("chat-preview") as NodeListOf<ChatPreview>){
        card.CheckSelectFromChat(chat);
    }
    updateHistory();
}


async function queueSummary(chat: Chat): Promise<void>{
    chat.summary = chat.messages.find(f => f.type === "user")?.text ?? "???";
    updateHistory();
}

function addChatPreview(chat: Chat){
    let card = new ChatPreview(chat);
    _previewPane!.appendChild(card);
    card.addEventListener("click", () => {
        switchToChat(chat);
    });
}

function updateHistory(){
    for(const card of document.querySelectorAll("chat-preview") as NodeListOf<ChatPreview>){
        card.update();
    }
}