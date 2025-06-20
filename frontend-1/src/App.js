import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Loader2 } from 'lucide-react';

const VoiceBot = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;
    
    if (!SpeechRecognition || !SpeechSynthesis) {
      setIsSupported(false);
      setError('Your browser does not support speech recognition or synthesis. Please use Chrome or Edge.');
      return;
    }

    // Initialize speech recognition
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 1;
    
    // Add more detailed logging
    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError('');
    };

    recognitionRef.current.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setCurrentTranscript(transcript);
      setIsListening(false);
      setIsProcessing(true);

      // Add user message to conversation
      setConversation(prev => [...prev, { type: 'user', text: transcript }]);

      try {
        // Call our backend API (simulate for now)
        const response = await callGeminiAPI(transcript);
        
        // Add bot response to conversation
        setConversation(prev => [...prev, { type: 'bot', text: response }]);
        
        // Speak the response
        speakText(response);
      } catch (err) {
        setError('Failed to get AI response. Please try again.');
        console.error('API Error:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    recognitionRef.current.onerror = (event) => {
      setIsListening(false);
      setIsProcessing(false);
      
      let errorMessage = '';
      switch(event.error) {
        case 'network':
          errorMessage = 'Network error. Please check your internet connection and try again. Note: HTTPS may be required.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone permissions and refresh the page.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking again.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition was aborted.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      setError(errorMessage);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Call the backend API
  const callGeminiAPI = async (question) => {
    const response = await fetch('https://voice-bot-react.onrender.com/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }
    
    const data = await response.json();
    return data.response;
  };

  const speakText = (text) => {
    if (!synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current || isListening || isProcessing) return;
    
    setError('');
    setCurrentTranscript('');
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setCurrentTranscript('');
    setError('');
    stopSpeaking();
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <MicOff className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Browser Not Supported</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎤 Vishal's Voice Bot
          </h1>
          <p className="text-gray-600">Click the microphone and ask me anything!</p>
        </div>

                  {/* Main Controls */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          {/* Debug Test Button */}
          <div className="text-center mb-4">
            <button
              onClick={() => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                console.log('Speech Recognition available:', !!SpeechRecognition);
                console.log('Navigator online:', navigator.onLine);
                console.log('Location protocol:', window.location.protocol);
                console.log('User agent:', navigator.userAgent);
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm"
            >
              Debug Info
            </button>
          </div>
          <div className="flex justify-center items-center space-x-4 mb-6">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-all duration-300"
              >
                <VolumeX className="w-6 h-6" />
              </button>
            )}

            {conversation.length > 0 && (
              <button
                onClick={clearConversation}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear Chat
              </button>
            )}
          </div>

          {/* Status Messages */}
          <div className="text-center mb-4">
            {isListening && (
              <div className="text-blue-600 font-medium flex items-center justify-center">
                <Mic className="w-5 h-5 mr-2 animate-pulse" />
                Listening... Speak now!
              </div>
            )}
            
            {isProcessing && (
              <div className="text-orange-600 font-medium flex items-center justify-center">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing your request...
              </div>
            )}
            
            {isSpeaking && (
              <div className="text-green-600 font-medium flex items-center justify-center">
                <Volume2 className="w-5 h-5 mr-2 animate-pulse" />
                Speaking... Click to stop
              </div>
            )}

            {error && (
              <div className="text-red-600 font-medium bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Current Transcript */}
          {currentTranscript && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">You said:</h3>
              <p className="text-blue-700">{currentTranscript}</p>
            </div>
          )}
        </div>

        {/* Conversation History */}
        {conversation.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Conversation
            </h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversation.map((message, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-100 ml-8'
                      : 'bg-gray-100 mr-8'
                  }`}
                >
                  <div className={`font-semibold mb-1 ${
                    message.type === 'user' ? 'text-blue-800' : 'text-gray-800'
                  }`}>
                    {message.type === 'user' ? 'You' : 'Vishal'}
                  </div>
                  <p className={message.type === 'user' ? 'text-blue-700' : 'text-gray-700'}>
                    {message.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">How to use:</h3>
          <ul className="text-gray-600 space-y-2">
            <li>• Click the microphone button to start voice input</li>
            <li>• Speak clearly and wait for the response</li>
            <li>• The bot will respond with both text and speech</li>
            <li>• Click the speaker button to stop speech playback</li>
            <li>• Use "Clear Chat" to start a new conversation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VoiceBot;