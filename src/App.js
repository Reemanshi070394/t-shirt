import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! What’s your T-shirt idea?" },
  ]);
  const [input, setInput] = useState("");
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    socket.on("botMessage", (msg) => {
      setMessages((prev) => [...prev, { sender: "bot", text: msg }]);
    });

    socket.on("imageGenerated", (url) => {
      setMessages((prev) => [...prev, { sender: "image", url }]);
    });

    return () => {
      socket.off("botMessage");
      socket.off("imageGenerated");
    };
  }, []);

  const sendToParent = (data) => {
    console.log("Sending data to parent:", data);
    window.parent.postMessage(
      {
        type: "USER_INPUT",
        payload: data,
      },
      "*"
    );
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text: input }]);

    if (input.toLowerCase().includes("yes")) setApproved(true);

    socket.emit("sendIdea", input);
    sendToParent(input);

    setInput("");
  };

  const refineMessage = () => {
    socket.emit("refineIdea", input);
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: `Refine: ${input}` },
    ]);
  };

  const generateImage = () => {
    const idea = messages.findLast((msg) => msg.sender === "user")?.text || "";
    socket.emit("generateImage", idea);
  };

  const resubmitIdea = () => {
    const lastIdea =
      messages.findLast((msg) => msg.sender === "user")?.text || "";
    socket.emit("sendIdea", lastIdea);
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: `Resubmitted: ${lastIdea}` },
    ]);
  };

  useEffect(() => {
    const handleMessage = (event) => {
      console.log("event.origin", event.origin);
      // if (event.origin !== "https://admin.shopify.com/") return; // security check

      if (event.data?.type === "INITIAL_DATA") {
        console.log("Received message:", event.data.payload);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="chat-box">
      <h2>🧵 T-shirt Customizer</h2>
      <div className="messages">
        {messages.map((msg, idx) =>
          msg.sender === "image" ? (
            <img
              key={idx}
              src={msg.url}
              alt="Generated"
              className="image-preview"
            />
          ) : (
            <div key={idx} className={`message ${msg.sender}`}>
              <strong>{msg.sender === "user" ? "You" : "Bot"}:</strong>{" "}
              {msg.text}
            </div>
          )
        )}
      </div>

      <div className="input-section">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Enter your T-shirt idea..."
        />
        <div className="button-group">
          <button onClick={sendMessage}>Send</button>
          <button onClick={refineMessage}>Refine</button>
          <button onClick={generateImage}>Generate Image</button>
          <button onClick={resubmitIdea}>Resubmit Idea</button>
        </div>
      </div>
    </div>
  );
}

export default App;
