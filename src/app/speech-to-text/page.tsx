'use client';

import { useState, useRef } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      // Web Speech APIを直接使用する場合
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onstart = () => {
          setIsRecording(true);
        };
        
        recognition.onresult = (event) => {
          let finalText = '';
          let interimText = '';
          
          for (let i = 0; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcriptPart;
            } else {
              interimText += transcriptPart;
            }
          }
          
          if (finalText) {
            setTranscript(prev => prev + finalText);
          }
          setInterimTranscript(interimText);
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          alert('音声認識エラー: ' + event.error);
        };
        
        recognition.onend = () => {
          setIsRecording(false);
        };
        
        recognitionRef.current = recognition;
        recognition.start();
        return;
      }

      // Web Speech APIが利用できない場合はMediaRecorderを使用
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('マイクへのアクセスが許可されていません。');
    }
  };

  const stopRecording = () => {
    // Web Speech APIを使用している場合
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setInterimTranscript('');
      return;
    }

    // MediaRecorderを使用している場合
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      // Web Speech APIを使用した音声認識
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'ja-JP';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        return new Promise((resolve, reject) => {
          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setTranscript(transcript);
            setIsProcessing(false);
            resolve(transcript);
          };
          
          recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsProcessing(false);
            reject(new Error('音声認識エラー: ' + event.error));
          };
          
          recognition.start();
        });
      } else {
        // Web Speech APIが利用できない場合はサーバーサイドAPIを使用
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.wav');

        const response = await fetch('/api/speech-to-text', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('音声の文字起こしに失敗しました');
        }

        const data = await response.json();
        setTranscript(data.transcript);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      alert('音声の文字起こしに失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          音声文字起こし
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={startRecording}
                disabled={isRecording || isProcessing}
                className={`px-6 py-3 rounded-lg font-medium ${
                  isRecording || isProcessing
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isRecording ? '録音中...' : '録音開始'}
              </button>
              
              <button
                onClick={stopRecording}
                disabled={!isRecording || isProcessing}
                className={`px-6 py-3 rounded-lg font-medium ${
                  !isRecording || isProcessing
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                録音停止
              </button>
            </div>
            
            {isProcessing && (
              <div className="text-blue-600 font-medium">
                音声を文字起こし中...
              </div>
            )}
            
            {isRecording && (
              <div className="flex items-center space-x-2 text-red-600">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span>録音中</span>
              </div>
            )}
          </div>
        </div>

        {(transcript || interimTranscript) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                文字起こし結果
              </h2>
              <button
                onClick={clearTranscript}
                className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                クリア
              </button>
            </div>
            <div className="bg-gray-50 rounded p-4 min-h-[100px]">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {transcript}
                <span className="text-gray-500 italic">{interimTranscript}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}