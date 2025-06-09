import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const voice = formData.get('voice') as string;
    const rate = formData.get('rate') as string;
    const pitch = formData.get('pitch') as string;
    const volume = formData.get('volume') as string;

    if (!text) {
      return NextResponse.json(
        { error: 'テキストが見つかりません' },
        { status: 400 }
      );
    }

    console.log('Text-to-Speech API called with:', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      voice,
      rate,
      pitch,
      volume
    });

    
    
    /*
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy',
        response_format: 'mp3'
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API error');
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="speech.mp3"'
      }
    });
    */

    return NextResponse.json({
      success: true,
      message: 'サーバーサイド音声合成は未実装です。Web Speech APIをご利用ください。',
      audioUrl: null
    });

  } catch (error) {
    console.error('Text-to-Speech API error:', error);
    return NextResponse.json(
      { error: '音声合成処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
