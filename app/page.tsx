import { EpmAvatar } from './epm-avatar';

export default function Home() {
  return (
    <main>
      <h1>Oracle EPM Assistant</h1>
      <p className="muted">Ask about Planning, FCCS, Account Reconciliation, or EPM Automate — out loud.</p>
      <EpmAvatar />
    </main>
  );
}
