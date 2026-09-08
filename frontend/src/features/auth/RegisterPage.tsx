import { Link } from 'react-router-dom';

import { Card, CardBody, CardHeader } from '../../components/ui/Card.tsx';
import { RegisterForm } from './RegisterForm.tsx';

export function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <Card>
        <CardHeader>
          <h1>Create your account</h1>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <RegisterForm />
          <p className="text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
