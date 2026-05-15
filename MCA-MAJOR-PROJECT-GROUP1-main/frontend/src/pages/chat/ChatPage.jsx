// ==========================================
// ChatPage.jsx FULL FINAL SPEECH FIX
// ==========================================

import React, {
  useEffect,
  useState,
  useRef,
} from "react";

import axios from "axios";

import { server } from "../../main";

import socket from "../../socket";

import {
  motion,
} from "framer-motion";

import {
  FaPaperPlane,
  FaRobot,
  FaUserAstronaut,
  FaMicrophone,
} from "react-icons/fa";

function ChatPage() {

  const [users, setUsers] =
    useState([]);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [isListening, setIsListening] =
    useState(false);

  const chatBoxRef =
    useRef(null);

  const mediaRecorderRef =
    useRef(null);

  const audioChunksRef =
    useRef([]);

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  // AUTO SCROLL
  useEffect(() => {

    if (
      chatBoxRef.current
    ) {

      chatBoxRef.current.scrollTop =
        chatBoxRef.current.scrollHeight;
    }

  }, [messages]);

  // SOCKET
  useEffect(() => {

    if (user?._id) {

      socket.emit(
        "join",
        user._id
      );
    }

    socket.on(
      "receiveMessage",
      (data) => {

        setMessages((prev) => [
          ...prev,
          data,
        ]);
      }
    );

    fetchUsers();

    return () => {

      socket.off(
        "receiveMessage"
      );

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {

        mediaRecorderRef.current.stop();
      }
    };

  }, []);

  // FETCH USERS
  const fetchUsers = async () => {

    try {

      const token =
        localStorage.getItem("token");

      const { data } =
        await axios.get(
          `${server}/api/chat/users/all`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      setUsers(data.users);

    } catch (error) {

      console.log(error);
    }
  };

  // LOAD CHAT
  const loadMessages = async (
    receiverId
  ) => {

    try {

      setSelectedUser(receiverId);

      const token =
        localStorage.getItem("token");

      const { data } =
        await axios.get(
          `${server}/api/chat/${receiverId}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      setMessages(data.messages);

    } catch (error) {

      console.log(error);
    }
  };

  // SEND MESSAGE
  const sendMessage = async () => {

    if (
      !message.trim() ||
      !selectedUser
    ) return;

    try {

      const token =
        localStorage.getItem("token");

      await axios.post(
        `${server}/api/chat/send`,
        {
          receiverId:
            selectedUser,
          message,
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      socket.emit(
        "sendMessage",
        {
          senderId: user._id,
          receiverId:
            selectedUser,
          message,
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: user._id,
          message,
        },
      ]);

      setMessage("");

    } catch (error) {

      console.log(error);
    }
  };

  // ==========================================
  // SPEECH TO TEXT FINAL
  // ==========================================

  // ==========================================
// FINAL WORKING SPEECH SECTION
// Replace ONLY startListening function
// ==========================================

const startListening = async () => {

  try {

    // STOP RECORDING
    if (
      isListening &&
      mediaRecorderRef.current
    ) {

      mediaRecorderRef.current.stop();

      setIsListening(false);

      return;
    }

    // GET MICROPHONE
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

    // CHECK SUPPORTED TYPE
    let mimeType =
      "audio/webm";

    if (
      MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
    ) {

      mimeType =
        "audio/webm;codecs=opus";
    }

    // RECORDER
    const mediaRecorder =
      new MediaRecorder(
        stream,
        {
          mimeType,
        }
      );

    mediaRecorderRef.current =
      mediaRecorder;

    audioChunksRef.current =
      [];

    console.log(
      "Recording Started..."
    );

    // START
    mediaRecorder.start(1000);

    setIsListening(true);

    // AUDIO CHUNK
    mediaRecorder.ondataavailable =
      (event) => {

        console.log(
          "Chunk Size:",
          event.data.size
        );

        if (
          event.data &&
          event.data.size > 0
        ) {

          audioChunksRef.current.push(
            event.data
          );
        }
      };

    // STOP
    mediaRecorder.onstop =
      async () => {

        try {

          console.log(
            "Recording Stopped"
          );

          // CREATE AUDIO FILE
          const audioBlob =
            new Blob(
              audioChunksRef.current,
              {
                type:
                  mimeType,
              }
            );

          console.log(
            "Audio Size:",
            audioBlob.size
          );

          // CHECK AUDIO
          if (
            audioBlob.size < 1000
          ) {

            alert(
              "Voice too short. Speak louder."
            );

            return;
          }

          // FORM DATA
          const formData =
            new FormData();

          formData.append(
            "audio",
            audioBlob,
            "voice.webm"
          );

          const token =
            localStorage.getItem(
              "token"
            );

          // API REQUEST
          const { data } =
            await axios.post(
              `${server}/api/speech/speech-to-text`,
              formData,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          console.log(
            "Speech Response:",
            data
          );

          // SUCCESS
          if (
            data.success &&
            data.text
          ) {

            let finalText =
              data.text.trim();

            console.log(
              "VOICE:",
              finalText
            );

            // REMOVE THANK YOU
            finalText =
              finalText.replace(
                /thank you\.?/gi,
                ""
              );

            // EMPTY CHECK
            if (
              finalText !== ""
            ) {

              setMessage(
                finalText
              );
            }
          }

          setIsListening(
            false
          );

          // STOP MIC
          stream
            .getTracks()
            .forEach(
              (
                track
              ) =>
                track.stop()
            );

        } catch (error) {

          console.log(
            "Speech Error:",
            error
          );

          alert(
            error.response?.data
              ?.message ||
              "Speech conversion failed"
          );

          setIsListening(
            false
          );
        }
      };

    // RECORD 10 SEC
    setTimeout(() => {

      if (
        mediaRecorder.state !==
        "inactive"
      ) {

        mediaRecorder.stop();
      }

    }, 10000);

  } catch (error) {

    console.log(error);

    alert(
      "Microphone permission denied"
    );

    setIsListening(false);
  }
};

  return (
    <div style={styles.page}>

      {/* GLOW */}
      <div style={styles.glow1}></div>

      <div style={styles.glow2}></div>

      <div style={styles.container}>

        {/* SIDEBAR */}
        <div style={styles.sidebar}>

          <div style={styles.sideHeader}>

            <FaRobot />

            <h2>
              Chats
            </h2>

          </div>

          {users.map((u) => (

            <motion.div
              key={u._id}
              whileHover={{
                scale: 1.03,
              }}
              style={{
                ...styles.userCard,

                background:
                  selectedUser ===
                  u._id
                    ? "linear-gradient(135deg,#ff9800,#ff5e00)"
                    : "rgba(255,255,255,0.04)",
              }}
              onClick={() =>
                loadMessages(
                  u._id
                )
              }
            >

              <div style={styles.avatar}>

                <FaUserAstronaut />

              </div>

              <div>

                <h4
                  style={{
                    margin: 0,
                    color:
                      "white",
                  }}
                >
                  {u.name}
                </h4>

                <p
                  style={{
                    margin: 0,
                    color:
                      "#aaa",
                    fontSize:
                      "13px",
                  }}
                >
                  {u.role}
                </p>

              </div>

            </motion.div>
          ))}

        </div>

        {/* CHAT AREA */}
        <div style={styles.chatArea}>

          <div style={styles.chatHeader}>

            <h3>
              {selectedUser
                ? "Live Chat ⚡"
                : "Select a user"}
            </h3>

          </div>

          {/* MESSAGE BOX */}
          <div
            ref={chatBoxRef}
            style={styles.chatBox}
          >

            {messages.map(
              (
                msg,
                index
              ) => (

                <motion.div
                  key={index}
                  initial={{
                    opacity: 0,
                    y: 15,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  style={
                    msg.sender ===
                    user._id
                      ? styles.myMessage
                      : styles.otherMessage
                  }
                >

                  {msg.message}

                </motion.div>
              )
            )}

          </div>

          {/* INPUT */}
          <div style={styles.bottom}>

            <input
              type="text"
              placeholder="Speak or type message..."
              value={message}
              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }
              style={
                styles.input
              }
            />

            {/* MIC BUTTON */}
            <motion.button
              whileHover={{
                scale: 1.08,
              }}
              whileTap={{
                scale: 0.95,
              }}
              animate={{
                scale:
                  isListening
                    ? [1, 1.1, 1]
                    : 1,
              }}
              transition={{
                repeat:
                  isListening
                    ? Infinity
                    : 0,
                duration: 1,
              }}
              onClick={
                startListening
              }
              style={{
                ...styles.sendBtn,

                background:
                  isListening
                    ? "red"
                    : "linear-gradient(135deg,#ff9800,#ff5e00)",
              }}
            >

              {isListening
                ? "🎙️"
                : <FaMicrophone />}

            </motion.button>

            {/* SEND BUTTON */}
            <motion.button
              whileHover={{
                scale: 1.08,
              }}
              whileTap={{
                scale: 0.95,
              }}
              onClick={
                sendMessage
              }
              style={
                styles.sendBtn
              }
            >

              <FaPaperPlane />

            </motion.button>

          </div>

        </div>

      </div>

    </div>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = {

  page: {
    height: "100vh",
    background:
      "linear-gradient(135deg,#0f0f0f,#111827)",
    padding: "30px",
    color: "white",
  },

  glow1: {
    position:
      "absolute",
    top: "-100px",
    left: "-100px",
    width: "300px",
    height: "300px",
    background:
      "orange",
    filter:
      "blur(120px)",
    opacity: 0.15,
  },

  glow2: {
    position:
      "absolute",
    bottom: "-100px",
    right: "-100px",
    width: "300px",
    height: "300px",
    background:
      "red",
    filter:
      "blur(120px)",
    opacity: 0.15,
  },

  container: {
    display: "flex",
    height: "90vh",
    borderRadius: "20px",
    overflow: "hidden",
    background:
      "rgba(255,255,255,0.03)",
    backdropFilter:
      "blur(20px)",
  },

  sidebar: {
    width: "320px",
    padding: "20px",
    borderRight:
      "1px solid rgba(255,255,255,0.08)",
  },

  sideHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },

  userCard: {
    display: "flex",
    gap: "12px",
    padding: "14px",
    borderRadius: "16px",
    marginBottom: "12px",
    cursor: "pointer",
  },

  avatar: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg,#ff9800,#ff5e00)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  chatHeader: {
    padding: "20px",
    borderBottom:
      "1px solid rgba(255,255,255,0.08)",
  },

  chatBox: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
  },

  myMessage: {
    background:
      "linear-gradient(135deg,#ff9800,#ff5e00)",
    padding: "14px",
    borderRadius: "16px",
    width: "fit-content",
    marginLeft: "auto",
    marginTop: "10px",
  },

  otherMessage: {
    background:
      "rgba(255,255,255,0.08)",
    padding: "14px",
    borderRadius: "16px",
    width: "fit-content",
    marginTop: "10px",
  },

  bottom: {
    display: "flex",
    gap: "10px",
    padding: "20px",
  },

  input: {
    flex: 1,
    background:
      "rgba(255,255,255,0.08)",
    border: "none",
    outline: "none",
    padding: "14px",
    borderRadius: "14px",
    color: "white",
  },

  sendBtn: {
    width: "60px",
    border: "none",
    borderRadius: "14px",
    color: "white",
    cursor: "pointer",
    fontSize: "18px",
    background:
      "linear-gradient(135deg,#ff9800,#ff5e00)",
  },
};

export default ChatPage;