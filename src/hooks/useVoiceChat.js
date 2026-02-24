import { useState, useEffect, useRef, useCallback } from "react";

export const useVoiceChat = (onSummaryReady, voiceTone = 1, voiceType = "Female") => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const [soulData, setSoulData] = useState(null);

  // Keep a ref to latest messages so callbacks always see current state
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Load the AI Soul Configuration
  useEffect(() => {
    fetch('/soul.md')
      .then(res => res.text())
      .then(text => {
          setSoulData(text);
      })
      .catch(e => console.error("Could not load soul.md", e));
  }, []);

  const speak = useCallback((text) => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();

    let filteredVoices = voices.filter(v => v.lang.includes("en"));
    if (voiceType === "Male") {
        filteredVoices = filteredVoices.filter(v =>
            v.name.includes("David") ||
            v.name.includes("Mark") ||
            v.name.includes("Guy") ||
            v.name.includes("Ryan") ||
            (v.name.includes("Male") && !v.name.includes("Female"))
        );
    } else {
        filteredVoices = filteredVoices.filter(v =>
            v.name.includes("Aria") ||
            v.name.includes("Jenny") ||
            v.name.includes("Zira") ||
            v.name.includes("Hazel") ||
            v.name.includes("Female") ||
            v.name.includes("Samantha") ||
            (!v.name.includes("David") && !v.name.includes("Mark") && !v.name.includes("Guy") && !v.name.includes("Ryan") && !v.name.includes("Male"))
        );
    }

    if (filteredVoices.length === 0) {
        filteredVoices = voices.filter(v => v.lang.includes("en"));
    }

    const preferredVoice = filteredVoices.find(v => v.name.includes("Natural")) ||
                           filteredVoices.find(v => v.name.includes("Online")) ||
                           filteredVoices[0];

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.pitch = 0.8 * voiceTone;
    utterance.rate = 0.9;

    synthRef.current.speak(utterance);
  }, [voiceTone, voiceType]);

  const generateSummary = useCallback((allMessages) => {
    const userThoughts = allMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(". ");
    const summary = `Today's reflection touched upon these themes: ${userThoughts.substring(0, 150)}... The atmosphere was captured successfully.`;

    if (onSummaryReady) {
      onSummaryReady(summary, allMessages);
    }
  }, [onSummaryReady]);

  const generateResponse = useCallback((userText, currentMessages) => {
    let responseText = "Tell me more about this dream.";

    if (soulData && soulData.includes("Caretaker")) {
        responseText = "As your caretaker, I am here to hold these memories safely. Tell me more.";
    }

    const lowerText = userText.toLowerCase();

    if (
      lowerText.includes("scary") ||
      lowerText.includes("fear") ||
      lowerText.includes("dark")
    ) {
      responseText =
        "It seems the shadows in this memory are quite deep. What do you think they represent?";
    } else if (
      lowerText.includes("happy") ||
      lowerText.includes("light") ||
      lowerText.includes("smile")
    ) {
      responseText =
        "There is a warmth in this recollection. Hold onto that feeling.";
    } else if (lowerText.includes("forget") || lowerText.includes("fade")) {
      responseText =
        "Memories often drift like these particles. We can capture it here, safely.";
    } else if (
      lowerText.includes("summarize") ||
      lowerText.includes("finish") ||
      lowerText.includes("end")
    ) {
      responseText =
        "I will seal this memory for you now. The diary entry is complete.";
      speak(responseText);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseText },
      ]);

      setTimeout(() => {
        generateSummary(currentMessages);
      }, 2000);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: responseText },
    ]);
    speak(responseText);
  }, [soulData, speak, generateSummary]);

  const handleUserMessage = useCallback((text) => {
    if (!text) return;

    const userMsg = { role: "user", content: text };

    setMessages((prev) => {
      const newMsgs = [...prev, userMsg];

      setTimeout(() => {
        generateResponse(text, newMsgs);
      }, 1000);

      return newMsgs;
    });
    setTranscript("");
  }, [generateResponse]);

  // Initialize speech recognition ONCE
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscript(interimTranscript);

        if (finalTranscript) {
          handleUserMessage(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
           setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening((currentIsListening) => {
            if (currentIsListening && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch {
                   // ignore
                }
            }
            return currentIsListening;
        });
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Speech recognition not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [handleUserMessage]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript("");
    }
  }, [isListening]);

  const sendTextMessage = useCallback((text) => {
    handleUserMessage(text);
  }, [handleUserMessage]);

  const loadTranscript = useCallback((savedMessages) => {
    setMessages(savedMessages);
  }, []);

  const speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return {
    isListening,
    transcript,
    messages,
    toggleListening,
    sendTextMessage,
    loadTranscript,
    speechSupported,
  };
};
