// Test fillTemplate issue

const template = `{{imports}}

{{documentation}}

{{exports}}

{{code}}`;

function fillTemplate(template, variables) {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  }

  return result;
}

// Test case
const variables = {
  imports: "import fetch from 'node-fetch';",
  documentation: "/**\n * Test module\n */",
  exports: 'export',
  code: "const test = 'hello';"
};

console.log('Variables:', variables);
console.log('\nTemplate:');
console.log(template);
console.log('\nFilled result:');
console.log(fillTemplate(template, variables));