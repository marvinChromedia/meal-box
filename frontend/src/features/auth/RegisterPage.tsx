import { Link } from 'react-router-dom';

import { Card, CardBody, CardHeader } from '../../components/ui/Card.tsx';
import { RegisterForm } from './RegisterForm.tsx';

export function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-8">
      <Card>
        <CardHeader>Create your account</CardHeader>
        <CardBody className="flex flex-col gap-4">
          <RegisterForm />
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
