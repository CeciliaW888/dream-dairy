import { useState, useEffect, useRef } from "react";

export const useVoiceChat = (onSummaryReady, voiceTone = 1, voiceType = "Female") => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const [soulData, setSoulData] = useState(null);

  // Load the AI Soul Configuration
  useEffect(() => {
    fetch('/soul.md')
      .then(res => res.text())
      .then(text => {
          console.log("AI Persona 'Soul' Injected:\n", text);
          setSoulData(text);
      })
      .catch(e => console.error("Could not load soul.md", e));
  }, []);

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

      // Restart automatically if it times out but we still want to listen
      recognition.onend = () => {
        setIsListening((currentIsListening) => {
            if (currentIsListening && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch(e) {
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
  }, []); // Run only once to prevent destroying the object while listening

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript("");
    }
  };

  const speak = (text) => {
    // If it's already speaking, cancel it
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find the highest quality "Natural" neural voice available in the browser
    const voices = synthRef.current.getVoices();
    
    // Heuristics for male vs female voices
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
        // Female is default, filter out known male voices if possible, or specifically target female ones
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

    // Fallback if no matching gender found
    if (filteredVoices.length === 0) {
        filteredVoices = voices.filter(v => v.lang.includes("en"));
    }
    
    // Priority order for high-quality English voices within the selected gender
    const preferredVoice = filteredVoices.find(v => v.name.includes("Natural")) ||
                           filteredVoices.find(v => v.name.includes("Online")) ||
                           filteredVoices[0]; // Just take the first matching gender voice if no natural
                           
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.pitch = 0.8 * voiceTone; // scale pitch based on settings tone
    utterance.rate = 0.9; // slower rate for dream-like feel

    synthRef.current.speak(utterance);
  };

  const handleUserMessage = (text) => {
    if (!text) return;

    // Add user message
    const userMsg = { role: "user", content: text };

    setMessages((prev) => {
      const newMsgs = [...prev, userMsg];

      // For the local version, we do a mocked intelligent response
      // In a real LLM version, we'd send newMsgs to the API here.
      setTimeout(() => {
        generateResponse(text, newMsgs);
      }, 1000);

      return newMsgs;
    });
    setTranscript("");
  };

  const generateResponse = (userText, currentMessages) => {
    // Mocked response logic based on keywords, enhanced by soul.md
    let responseText = "Tell me more about this dream.";
    
    // Demonstrate 'soul' injection in the mock
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

      // Generate summary
      setTimeout(() => {
        generateSummary(currentMessages);
      }, 2000);
      return;
    }

    // Add assistant response
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: responseText },
    ]);
    speak(responseText);
  };

  const generateSummary = (allMessages) => {
    // Basic local summarization. (Would use LLM in real version)
    const userThoughts = allMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(". ");
    const summary = `Today's reflection touched upon these essence: ${userThoughts.substring(0, 150)}... The atmosphere was captured successfully.`;

    if (onSummaryReady) {
      onSummaryReady(summary, allMessages);
    }
  };

  const loadTranscript = (savedMessages) => {
    setMessages(savedMessages);
  };

  // Expose text input handler for the chat box
  useEffect(() => {
    window.handleUserTextInput = handleUserMessage;
    return () => {
      delete window.handleUserTextInput;
    };
  }, [messages]);

  return {
    isListening,
    transcript,
    messages,
    toggleListening,
    loadTranscript,
  };
};
