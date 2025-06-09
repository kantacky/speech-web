import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            音声処理アプリケーション
          </h1>
          <p className="text-lg text-gray-600">
            音声とテキストの相互変換を行うWebアプリケーション
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                音声文字起こし
              </h2>
              <p className="text-gray-600 mb-6">
                音声をリアルタイムでテキストに変換します。マイクを使って話すだけで、自動的に文字起こしを行います。
              </p>
              <Link
                href="/speech-to-text"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                音声文字起こしを開始
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="text-6xl mb-4">🔊</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                テキスト音声変換
              </h2>
              <p className="text-gray-600 mb-6">
                入力したテキストを自然な音声に変換します。音声の速度やピッチを調整して、お好みの音声を生成できます。
              </p>
              <Link
                href="/text-to-speech"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-md font-medium hover:bg-green-700 transition-colors"
              >
                テキスト音声変換を開始
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              主な機能
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">音声文字起こし</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• リアルタイム音声認識</li>
                  <li>• 連続録音機能</li>
                  <li>• 日本語対応</li>
                  <li>• 自動再開機能</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">テキスト音声変換</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 自然な音声合成</li>
                  <li>• 音声設定調整</li>
                  <li>• 複数音声選択</li>
                  <li>• 音声ファイル保存</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
