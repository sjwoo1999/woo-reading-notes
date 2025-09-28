import AuthForm from './AuthForm';

export default function AuthPage({ searchParams }: { searchParams: { next?: string; reason?: string } }) {
  const next = searchParams?.next || '/library';
  const reason = searchParams?.reason;
  return <AuthForm next={next} reason={reason} />;
}
