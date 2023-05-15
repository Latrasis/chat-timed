import { FormEvent, useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, Configuration, CreateChatCompletionRequest, OpenAIApi } from 'openai'

const instruction = `
You are a conversational ai that will be run each 2 seconds.

Instructions:
* About every 2 seconds you will be given the time in seconds with a choice to respond. 
* If you decide to wait, simply return an "<WAIT>" Your response will not be logged in chat history and the timer will simply increment.
* If you decide that you are not needed, simply end your response with the "<SLEEP>" command

Notes:
* Do be aware of time delay between responses.
* Your Attentiveness score is set in the beggining. 0 means you do not respond at all and sleep immediately. 10 means you never sleep and always seek a response from the user.
* You do not need to remind the user of your presence, it is already shown to the user.

Example session:

Attentiveness score: 5
Time: 0
Assistant (You): Hi! 
Time: 2
Assistant (You): Can I help you?
Time: 4 
Assistant (You): <WAIT>
Time: 6 |
Assistant (You): <WAIT>
Time: 8 |
Assistant (You): <WAIT>
Time: 10 |
Assistant (You): <WAIT>
Time: 12 
Assistant (You): <WAIT>
Time: 14 
Assistant (You): <WAIT>
Time: 16 
User: Hi! Yeah, sorry one sec.
Time: 18
Assistant (You): That's alright, take your time.
Time: 20
Assistant (You): <WAIT>
Time: 22
User: Yes, what's 2+2?
Time: 24
Assistant: The answer is 4.
Time: 26
Assistant: Anything else you need?
Time: 28
User: Nope! I'm all good, thanks!
Time: 30
Assistant: Alright then, goodbye!
Time: 32
Assistant: <SLEEP>
`

const startTime = Date.now()
const initial = [
  sysMessage(instruction),
  sysMessage("Attentiveness score: 3"),
  nextTime(),
]


function sysMessage(content: string) {
  return { role: ChatCompletionRequestMessageRoleEnum.System, content };

}
function userMessage(content: string) {
  return { role: ChatCompletionRequestMessageRoleEnum.User, content };

}

function nextTime() {
  let res = { role: ChatCompletionRequestMessageRoleEnum.System, content: `Time: ${Math.floor((Date.now() - startTime) / 1000)}` }
  return res;
}

function App() {
  const [api, setApi] = useState<OpenAIApi>()
  const [key, setKey] = useState("")
  const [input, setInput] = useState("")
  const [stop, setStop] = useState(true)
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>(initial)
  const messagesRef = useRef<ChatCompletionRequestMessage[]>([]);
  const intervalRef = useRef<number | undefined>();


  function setOpenAi(e: FormEvent) {
    e.preventDefault()
    if (key == "") {
      alert("Invalid key: " + key)
    }
    const configuration = new Configuration({
      apiKey: key,
    });

    const openai = new OpenAIApi(configuration)
    setApi(openai)

  }

  async function runMessage() {
    let new_messages = await api?.createChatCompletion({ model: "gpt-3.5-turbo", messages: messagesRef.current })
    let next = new_messages!.data.choices.map(q => q!.message!)
    if (next.some(k => k.content.includes("SLEEP"))) {
      setStop(true)
    }
    console.log('Running')
    setMessages((currentMessages) => {
      if (next.length == 0) {
        return [...currentMessages.slice(0, -1), nextTime()]
      } else {
        return [...currentMessages, ...next, nextTime()]
      }
    });
  }


  function submit(e: FormEvent) {
    e.preventDefault()
    let msg = stop ? [sysMessage("User Started Session")]: [userMessage(input)]
    setMessages(messages => [...messages, ...msg, nextTime()])
    setStop(false)
    setInput("")
  }

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // Define an async function within the effect
    const loop = async () => {
      if (api && !stop) {
        await runMessage();
      }

      // Schedule the next iteration
      intervalRef.current = setTimeout(loop, 2000);
    };

    // Start the loop 
    loop();

    // Clean up on unmount or if dependencies change
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [stop]);  // Depend on api and stop

  function renderMessages() {
    return messages
      .filter(m => m.role != "system")
      .filter(m => m.content != "<WAIT>")
      .map((m, i) => {
        const isSleep = m.role =="assistant" && m.content == "<SLEEP>";
        if (isSleep) {
          return <li key={i} className="sleep">Session ended</li>
        }
        return <li key={i} className={m.role} > {m.content}</li>
      }
      )
  }

  return (
    <div className="flex">
      <form onSubmit={setOpenAi}>
        <input type="text" name="" placeholder="OPENAI KEY" value={key} onChange={e => setKey(e.target.value)} id="key" />
        <button type="submit">OpenAI Key {api ? "✔️" : ""}</button>
        <button onClick={() => setStop(!stop)} disabled={api == undefined}>{stop ? "START" : "STOP"}</button>
      </form>
      <ul className="chat">
        {renderMessages()}
      </ul>
      <br/>
      <form className="chatbox" onSubmit={submit}>
        <input type="text" name="" placeholder="Chat" value={input} onChange={e => setInput(e.target.value)} onSubmit={submit} id="user" />
        <button type="submit" disabled={api == undefined}>💬</button>
      </form>
      
    </div>
  )
}

export default App
