'use client';

import { useState, useRef } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type RecognitionStatus = 'idle' | 'listening' | 'processing' | 'success' | 'error';

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [shouldRestart, setShouldRestart] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      // Web Speech APIを直接使用する場合
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
          setIsRecording(true);
          setStatus('listening');
          setStatusMessage('音声を聞いています...');
        };
        
        recognition.onresult = (event) => {
          let finalText = '';
          let interimText = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcriptPart;
            } else {
              interimText += transcriptPart;
            }
          }
          
          // 新しく確定されたテキストがある場合のみ追加
          if (finalText) {
            setTranscript(prev => prev + finalText);
            setStatus('success');
            setStatusMessage('文字起こし完了');
          }
          
          // 中間結果を更新
          setInterimTranscript(interimText);
          
          // 中間結果がある場合は処理中状態
          if (interimText && !finalText) {
            setStatus('processing');
            setStatusMessage('音声を認識中...');
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          
          // no-speechエラーの場合は自動的に再開を試行
          if (event.error === 'no-speech' && shouldRestart) {
            console.log('No speech detected, will restart...');
            setStatus('listening');
            setStatusMessage('音声を待機中...');
            // onendイベントで自動的に再開される
            return;
          }
          
          // その他のエラーの場合は停止
          setIsRecording(false);
          setShouldRestart(false);
          setStatus('error');
          setStatusMessage(`音声認識エラー: ${event.error}`);
          
          // タイムアウトをクリア
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
          }
        };
        
        recognition.onend = () => {
          console.log('Recognition ended, shouldRestart:', shouldRestart);
          setInterimTranscript(''); // 録音終了時に中間結果をクリア
          
          // エラーでない場合、かつshouldRestartがtrueの場合は自動的に再開
          if (shouldRestart && status !== 'error') {
            restartTimeoutRef.current = setTimeout(() => {
              if (shouldRestart && recognitionRef.current) {
                try {
                  console.log('Restarting recognition...');
                  recognitionRef.current.start();
                } catch (error) {
                  console.error('Failed to restart recognition:', error);
                  setIsRecording(false);
                  setShouldRestart(false);
                  setStatus('error');
                  setStatusMessage('音声認識の再開に失敗しました');
                }
              }
            }, 100); // 短い遅延で再開
          } else {
            setIsRecording(false);
            setShouldRestart(false);
            if (status !== 'error') {
              setStatus('idle');
              setStatusMessage('');
            }
          }
        };
        
        recognitionRef.current = recognition;
        setShouldRestart(true); // 自動再開を有効にする
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
    setShouldRestart(false); // 自動再開を無効にする
    
    // タイムアウトをクリア
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
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
    setStatus('idle');
    setStatusMessage('');
    setShouldRestart(false);
    
    // タイムアウトをクリア
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return 'text-blue-600';
      case 'processing': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'listening': return '🎤';
      case 'processing': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '💬';
    }
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
            
            {status !== 'idle' && (
              <div className={`flex items-center space-x-2 font-medium ${getStatusColor()}`}>
                <span className="text-lg">{getStatusIcon()}</span>
                <span>{statusMessage}</span>
                {status === 'listening' && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                )}
                {status === 'processing' && (
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-spin border-2 border-transparent border-t-yellow-600"></div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-800">
                文字起こし結果
              </h2>
              {status !== 'idle' && (
                <div className={`flex items-center space-x-1 text-sm ${getStatusColor()}`}>
                  <span>{getStatusIcon()}</span>
                  <span className="font-medium">{statusMessage}</span>
                </div>
              )}
            </div>
            <button
              onClick={clearTranscript}
              className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={!transcript && !interimTranscript}
            >
              クリア
            </button>
          </div>
          <div className={`rounded p-4 min-h-[100px] border-2 ${
            status === 'error' ? 'bg-red-50 border-red-200' :
            status === 'success' ? 'bg-green-50 border-green-200' :
            status === 'processing' ? 'bg-yellow-50 border-yellow-200' :
            status === 'listening' ? 'bg-blue-50 border-blue-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {transcript}
              {interimTranscript && (
                <span className="text-blue-600 italic bg-blue-100 px-1 rounded">
                  {interimTranscript}
                </span>
              )}
            </p>
            {!transcript && !interimTranscript && (
              <p className="text-gray-400 italic flex items-center space-x-2">
                <span>🎤</span>
                <span>音声認識を開始してください...</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}