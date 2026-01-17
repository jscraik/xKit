import { Ollama } from 'ollama';

const testText = `
The rise of AI coding assistants has fundamentally changed how developers work. 
Tools like GitHub Copilot, Cursor, and Claude Code are not just autocomplete on steroids - 
they represent a shift in the developer experience. These tools can understand context across 
multiple files, suggest entire functions, and even refactor code. However, they also raise 
questions about code quality, security, and the future of software development education.
`;

const models = ['qwen2.5:7b', 'deepseek-coder:6.7b', 'llama3.1:8b', 'phi4-mini-reasoning:3.8b'];

async function testModel(model) {
    const ollama = new Ollama({ host: 'http://localhost:11434' });

    const prompt = `You are a helpful assistant that creates concise summaries of articles.

Article Content:
${testText}

Instructions:
1. Write a 2-3 sentence summary that captures the main points
2. Be concise and clear
3. Focus on the key insights and takeaways
4. Do not include any preamble or meta-commentary

Summary:`;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${model}`);
    console.log('='.repeat(60));

    const start = Date.now();

    try {
        const response = await ollama.generate({
            model,
            prompt,
            stream: false,
            options: {
                temperature: 0.3,
                top_p: 0.9,
            },
        });

        const duration = ((Date.now() - start) / 1000).toFixed(3);

        console.log(`\nResponse time: ${duration}s`);
        console.log(`\nSummary:\n${response.response}`);

        return { model, duration, summary: response.response };
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return { model, duration: 'failed', summary: null };
    }
}

async function main() {
    const results = [];

    for (const model of models) {
        const result = await testModel(model);
        results.push(result);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('COMPARISON SUMMARY');
    console.log('='.repeat(60));

    results.forEach(r => {
        console.log(`\n${r.model}: ${r.duration}s`);
    });
}

main().catch(console.error);
