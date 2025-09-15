describe('Basic Test Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with DOM elements', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);
    
    expect(element.textContent).toBe('Hello World');
    expect(element.tagName).toBe('DIV');
  });
});