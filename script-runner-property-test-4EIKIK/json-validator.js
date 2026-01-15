
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(inputData);
    const output = {
      jsonValid: true,
      inputType: typeof input
    };
    console.log(JSON.stringify(output));
  } catch (error) {
    const output = {
      jsonValid: false,
      error: error.message
    };
    console.log(JSON.stringify(output));
  }
});
        