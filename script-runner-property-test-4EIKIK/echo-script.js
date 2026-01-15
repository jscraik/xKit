
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(inputData);
    const output = {
      receivedInput: input
    };
    console.log(JSON.stringify(output));
  } catch (error) {
    console.error('Failed to parse input:', error.message);
    process.exit(1);
  }
});
        