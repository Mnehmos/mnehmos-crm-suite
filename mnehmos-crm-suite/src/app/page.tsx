export default function HomePage() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Welcome to Mnehmos CRM Suite!</h1>
      <p>If you see this, the root page on Vercel is working.</p>
      <p>Deployed at: {new Date().toISOString()}</p>
    </main>
  );
}
