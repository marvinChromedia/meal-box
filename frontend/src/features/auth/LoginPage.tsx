import { Link, useLocation } from 'react-router-dom';

import { Alert } from '../../components/ui/Alert.tsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.tsx';
import { LoginForm } from './LoginForm.tsx';

export function LoginPage() {
  const location = useLocation();
  const state = location.state as { justRegistered?: boolean; justSignedOut?: boolean } | null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {state?.justRegistered ? (
        <Alert variant="success">Account created. Sign in to continue.</Alert>
      ) : null}
      {state?.justSignedOut ? <Alert variant="info">You have been signed out.</Alert> : null}
      <Card>
        <CardHeader>
          <h1>Sign in</h1>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <LoginForm />
          <p className="text-sm text-ink-muted">
            Need an account?{' '}
            <Link to="/register" className="font-medium text-accent hover:underline">
              Register
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
