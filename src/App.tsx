import { FormEvent, useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, Configuration, CreateChatCompletionRequest, OpenAIApi } from 'openai'

const instruction = `
You are a conversational ai that will be run each second.
Every 2 seconds you will be given the time in seconds with a choice to respond. Do be aware of time delay between responses.
If you decide to not respond, simply return an empty string. Your response will not be logged in chat history and the timer will simply increment.
If you decide that you are not needed, simply end your response with the SLEEP command

Example session:

Time: 0
Assistant (You): Hi! 
Time: 2
Assistant (You): Can I help you?
Time: 4 |--- This is not shown since it's empty
Assistant (You): |
Time: 6 |
Assistant (You): |
Time: 8 |
Assistant (You): |
Time: 10 |
Assistant (You): |
Time: 12 
User: Hi! Yeah, sorry i got distracted.
Time: 14
Assistant (You): That's alright, is there anything I can help you with?
Time: 16 |--- This is not shown since it's empty
Assistant (You): |
Time: 18
User: Yes, what's 2+2?
Time: 20
Assistant: The answer is 4.
Time: 22
Assistant: Anything else you need?
Time: 24
User: Nope! I'm all good, thanks!
Time:26
Assistant: Alright, i will sleep then. SLEEP
`

const startTime = Date.now()
const initial = [
  nextTime(),
  sysMessage(instruction),
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


  return (
    <>
      <ul>
        {messages.map((m, i) => <li key={i}>{m.name} : {m.content}</li>)}
      </ul>
      <form onSubmit={e => submit(e)}>
        <input type="text" name="" placeholder="Chat" value={input} onChange={e => setInput(e.target.value)} onSubmit={submit} id="user" />
        <br />
      </form>
      <form onSubmit={setOpenAi}>
        <input type="text" name="" placeholder="OPENAI KEY" value={key} onChange={e => setKey(e.target.value)} id="key" />
        <button type="submit">OpenAI Key {api ? "✔️" : ""}</button>
      </form>
      <button onClick={() => setStop(!stop)}>{stop ? "START" : "STOP"}</button>
    </>
  )
}

export default App
