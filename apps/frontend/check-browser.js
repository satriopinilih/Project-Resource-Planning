// Test if we can access localStorage
if (typeof window !== 'undefined') {
  console.log('Window available');
  console.log('LocalStorage:', localStorage.getItem('theme'));
  console.log('System prefers dark:', window.matchMedia('(prefers-color-scheme: dark)').matches);
}
