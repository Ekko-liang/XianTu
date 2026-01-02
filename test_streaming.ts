
async function testStreaming() {
    const mockResponse = new Response(new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            const chunks = [
                'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
                'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
                'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
                'data: [DONE]\n\n'
            ];
            
            let i = 0;
            const interval = setInterval(() => {
                if (i >= chunks.length) {
                    clearInterval(interval);
                    controller.close();
                    return;
                }
                controller.enqueue(encoder.encode(chunks[i]));
                i++;
            }, 100);
        }
    }));

    // Simulate processSSEStream logic from aiService.ts
    const reader = mockResponse.body?.getReader();
    if (!reader) return;
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            
            let data = trimmed.slice(5);
            if (data.startsWith(' ')) data = data.slice(1);
            if (data === '[DONE]') continue;
            
            try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                if (content) {
                    process.stdout.write(content);
                }
            } catch (e) {
                console.error('Error parsing:', e);
            }
        }
    }
    console.log('\nStream finished');
}

testStreaming();
