import { Link, useLocation } from 'react-router-dom';

import { Alert } from '../../components/ui/Alert.tsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.tsx';
import { LoginForm } from './LoginForm.tsx';

export function LoginPage() {
  const location = useLocation();
  const state = location.state as { justRegistered?: boolean; justSignedOut?: boolean } | null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-8">
      {state?.justRegistered ? (
        <Alert variant="success">Account created. Sign in to continue.</Alert>
      ) : null}
      {state?.justSignedOut ? <Alert variant="info">You have been signed out.</Alert> : null}
      <Card>
        <CardHeader>Sign in</CardHeader>
        <CardBody className="flex flex-col gap-4">
          <LoginForm />
          <p className="text-sm text-gray-600">
            Need an account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:underline">
              Register
            </Link>
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
