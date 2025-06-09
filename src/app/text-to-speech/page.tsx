'use client';

import { useState, useRef, useEffect } from 'react';

type SynthesisStatus = 'idle' | 'generating' | 'playing' | 'success' | 'error';

interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
}

export default function TextToSpeech() {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<SynthesisStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      console.log('Loading voices, available:', availableVoices.length);
      
      if (availableVoices.length === 0) {
        return;
      }

      const japaneseVoices = availableVoices.filter(voice => 
        voice.lang.includes('ja') || voice.lang.includes('JP')
      );
      
      const voiceOptions: VoiceOption[] = japaneseVoices.length > 0 
        ? japaneseVoices.map(voice => ({
            voice,
            name: `${voice.name} (${voice.lang})`
          }))
        : availableVoices.slice(0, 10).map(voice => ({
            voice,
            name: `${voice.name} (${voice.lang})`
          }));

      console.log('Voice options set:', voiceOptions.length);
      setVoices(voiceOptions);
    };

    loadVoices();
    
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    const fallbackTimer = setTimeout(() => {
      if (voices.length === 0) {
        console.log('Fallback voice loading triggered');
        loadVoices();
      }
    }, 1000);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const generateSpeech = async () => {
    if (!text.trim()) {
      setStatus('error');
      setStatusMessage('テキストを入力してください');
      return;
    }

    try {
      setIsGenerating(true);
      setStatus('generating');
      setStatusMessage('音声を生成しています...');

      if ('speechSynthesis' in window) {
        await generateWithWebSpeechAPI();
      } else {
        await generateWithServerAPI();
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      setStatus('error');
      setStatusMessage('音声生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWithWebSpeechAPI = async () => {
    return new Promise<void>((resolve, reject) => {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const availableVoices = speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        if (voices.length > 0 && voices[selectedVoiceIndex]) {
          utterance.voice = voices[selectedVoiceIndex].voice;
        } else {
          utterance.voice = availableVoices[0];
        }
      }
      
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onstart = () => {
        console.log('Speech started');
        setStatus('playing');
        setStatusMessage('音声を再生しています...');
        setIsPlaying(true);
      };

      utterance.onend = () => {
        console.log('Speech ended');
        setStatus('success');
        setStatusMessage('音声生成が完了しました');
        setIsPlaying(false);
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        if (event.error === 'synthesis-failed' || event.error === 'not-allowed') {
          console.log('Falling back to server API due to:', event.error);
          setStatus('generating');
          setStatusMessage('サーバー音声合成を使用しています...');
          setIsPlaying(false);
          generateWithServerAPI().then(resolve).catch(reject);
        } else {
          setStatus('error');
          setStatusMessage('音声生成エラー: ' + event.error);
          setIsPlaying(false);
          reject(new Error('音声生成エラー: ' + event.error));
        }
      };

      console.log('Starting speech synthesis with voice:', utterance.voice?.name || 'default');
      speechSynthesis.speak(utterance);
    });
  };

  const generateWithServerAPI = async () => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('voice', voices[selectedVoiceIndex]?.voice.name || '');
    formData.append('rate', rate.toString());
    formData.append('pitch', pitch.toString());
    formData.append('volume', volume.toString());

    const response = await fetch('/api/text-to-speech', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('サーバーエラー');
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    setStatus('success');
    setStatusMessage('音声生成が完了しました');
  };

  const stopSpeech = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      setStatus('idle');
      setStatusMessage('');
    }
  };

  const clearText = () => {
    setText('');
    setStatus('idle');
    setStatusMessage('');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
  };

  const downloadAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `speech-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'generating': return 'text-blue-600';
      case 'playing': return 'text-green-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'generating': return '⏳';
      case 'playing': return '🔊';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '🎵';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          テキスト音声変換
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-6">
            <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
              変換するテキスト
            </label>
            <textarea
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ここにテキストを入力してください..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 mb-2">
                音声
              </label>
              <select
                id="voice-select"
                value={selectedVoiceIndex}
                onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
              >
                {voices.map((voiceOption, index) => (
                  <option key={index} value={index}>
                    {voiceOption.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-700 mb-2">
                速度: {rate.toFixed(1)}
              </label>
              <input
                id="rate-slider"
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label htmlFor="pitch-slider" className="block text-sm font-medium text-gray-700 mb-2">
                ピッチ: {pitch.toFixed(1)}
              </label>
              <input
                id="pitch-slider"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-full"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label htmlFor="volume-slider" className="block text-sm font-medium text-gray-700 mb-2">
                音量: {volume.toFixed(1)}
              </label>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full"
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={generateSpeech}
              disabled={isGenerating || !text.trim()}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                isGenerating || !text.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? '生成中...' : '音声生成'}
            </button>

            {isPlaying && (
              <button
                onClick={stopSpeech}
                className="px-6 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
              >
                停止
              </button>
            )}

            <button
              onClick={clearText}
              disabled={isGenerating}
              className="px-6 py-2 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              クリア
            </button>
          </div>

          {status !== 'idle' && (
            <div className={`flex items-center space-x-2 font-medium ${getStatusColor()}`}>
              <span className="text-lg">{getStatusIcon()}</span>
              <span>{statusMessage}</span>
              {status === 'generating' && (
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin border-2 border-transparent border-t-blue-600"></div>
              )}
              {status === 'playing' && (
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">音声プレビュー</h2>
          
          {status !== 'idle' && (
            <div className={`flex items-center space-x-1 text-sm mb-4 ${getStatusColor()}`}>
              <span>{getStatusIcon()}</span>
              <span className="font-medium">{statusMessage}</span>
            </div>
          )}

          <div className={`p-4 rounded-md border-2 transition-colors ${
            status === 'error' ? 'bg-red-50 border-red-200' :
            status === 'success' ? 'bg-green-50 border-green-200' :
            status === 'playing' ? 'bg-blue-50 border-blue-200' :
            status === 'generating' ? 'bg-yellow-50 border-yellow-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            {text ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">生成対象テキスト:</p>
                <p className="text-gray-800 whitespace-pre-wrap">{text}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                テキストを入力して音声生成ボタンを押してください
              </p>
            )}
          </div>

          {audioUrl && (
            <div className="mt-4">
              <audio
                ref={audioRef}
                controls
                src={audioUrl}
                className="w-full"
              />
              <button
                onClick={downloadAudio}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
              >
                音声ファイルをダウンロード
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
