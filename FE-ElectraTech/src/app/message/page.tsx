import "@/styles/dashboard.css";
import "@/styles/message.css";
import Menu from "@/components/menu";
import Image from "next/image";

export default function Recommend() {
  return (
    <>
      <div id="dashboard">
        <Menu />
        <div className="dashboard__function">
          <div id="chat-app">
            <div id="chat-header">
              <Image
                width={48}
                height={48}
                src="/Pngtree.png"
                alt="Chat Icon"
              />
              <h1>ElectraTech</h1>
            </div>
            <div id="chat-messages"></div>
            <div id="chat-input">
              <textarea id="message-input"></textarea>
              <button id="send-button">Send</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
